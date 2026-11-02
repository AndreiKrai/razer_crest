import type { AckMessage, Command, DeviceMessage, HelloMessage, ShipStatus, TestTarget } from './protocol';
import type { FoundDevice, ScanFailure, Transport } from './transport';

export type Phase = 'idle' | 'scanning' | 'connecting' | 'connected' | 'reconnecting';
export type LinkFailure = ScanFailure | 'connect' | 'timeout';

export type LinkState = {
  phase: Phase;
  devices: FoundDevice[];
  device: { id: string; name: string; fw: string } | null;
  shipStatus: string | null;
  failure: LinkFailure | null;
  simulated: boolean;
};

type Reply = HelloMessage | AckMessage;

const HEARTBEAT_MS = 500;
const ACK_TIMEOUT_MS = 1500;
const ATTEMPTS = 3;
const MAX_BACKOFF_MS = 8000;

/** The link to one model: connect, keep alive, reconnect, send commands and read the state back. */
export class LinkController {
  private state: LinkState;
  private readonly transport: Transport;
  private readonly listeners = new Set<() => void>();
  private stopTransportScan: (() => void) | null = null;
  // The device the user wants to stay connected to; null once they disconnect.
  private wantedId: string | null = null;
  // Bumped on every (dis)connect so callbacks of an older connection are ignored.
  private session = 0;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private readonly pending = new Map<number, (reply: Reply) => void>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(transport: Transport) {
    this.transport = transport;
    this.state = { phase: 'idle', devices: [], device: null, shipStatus: null, failure: null, simulated: transport.simulated };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = () => this.state;

  scan = () => {
    this.endScan();
    this.set({ phase: 'scanning', devices: [], failure: null });
    try {
      this.stopTransportScan = this.transport.scan(
        (found) => this.set({ devices: upsert(this.state.devices, found) }),
        (failure) => {
          this.endScan();
          this.set({ phase: 'idle', failure });
        },
      );
    } catch {
      this.set({ phase: 'idle', failure: 'unsupported' });
    }
  };

  stopScan = () => {
    this.endScan();
    if (this.state.phase === 'scanning') this.set({ phase: 'idle' });
  };

  connect = (id: string) => {
    this.endScan();
    this.wantedId = id;
    this.attempts = 0;
    this.set({ phase: 'connecting', failure: null });
    void this.open(id);
  };

  disconnect = () => {
    this.wantedId = null;
    this.session += 1;
    this.endScan();
    this.clearTimers();
    this.pending.clear();
    this.transport.disconnect().catch(() => undefined);
    this.set({ phase: 'idle', device: null, shipStatus: null, failure: null });
  };

  // The command methods resolve to null on success, or to an error code (device's own, or 'timeout' / 'not_connected').
  setStatus = (status: ShipStatus) => this.command({ c: 'set_status', id: status });

  stopAll = () => this.command({ c: 'stop_all' });

  deviceTest = (target: TestTarget) => this.command({ c: 'device_test', ...target });

  rename = async (name: string) => {
    const error = await this.command({ c: 'set_name', name });
    const device = this.state.device;
    if (!error && device) this.set({ device: { ...device, name: name.trim() } });
    return error;
  };

  private async open(id: string) {
    const session = ++this.session;
    let failure: LinkFailure = 'connect';
    try {
      await this.transport.connect(
        id,
        (message) => this.onMessage(session, message),
        () => this.onLost(session, id),
      );
      failure = 'timeout';
      // The state notifications may not be subscribed yet, so the request retries.
      const reply = await this.request({ c: 'hello' });
      if (session !== this.session) return;
      if (reply?.t !== 'hello') throw new Error('no hello');
      this.attempts = 0;
      this.set({
        phase: 'connected',
        device: { id, name: reply.name, fw: reply.fw },
        shipStatus: reply.s,
        failure: null,
      });
      this.heartbeatTimer = setInterval(() => this.transport.beat().catch(() => undefined), HEARTBEAT_MS);
    } catch {
      if (session !== this.session) return;
      this.transport.disconnect().catch(() => undefined);
      this.onOpenFailed(id, failure);
    }
  }

  private onOpenFailed(id: string, failure: LinkFailure) {
    if (this.state.phase === 'connecting') {
      this.wantedId = null;
      this.set({ phase: 'idle', failure });
    } else {
      this.scheduleReconnect(id);
    }
  }

  private onLost(session: number, id: string) {
    // Before 'connected' the failed hello handles it.
    if (session !== this.session || this.state.phase !== 'connected') return;
    this.stopHeartbeat();
    this.scheduleReconnect(id);
  }

  private scheduleReconnect(id: string) {
    this.set({ phase: 'reconnecting' });
    const delay = Math.min(1000 * 2 ** this.attempts, MAX_BACKOFF_MS);
    this.attempts += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.wantedId === id) void this.open(id);
    }, delay);
  }

  private onMessage(session: number, message: DeviceMessage) {
    if (session !== this.session) return;
    if (message.t === 'state') this.set({ shipStatus: message.s });
    else this.pending.get(message.n)?.(message);
  }

  private async command(command: Command): Promise<string | null> {
    if (this.state.phase !== 'connected') return 'not_connected';
    const reply = await this.request(command);
    if (!reply) return 'timeout';
    return reply.t === 'ack' ? (reply.e ?? null) : null;
  }

  // One command in flight at a time, retried on timeout: the firmware's commands are idempotent.
  private request(command: Command): Promise<Reply | null> {
    const run = async (): Promise<Reply | null> => {
      const n = ++this.seq;
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const reply = await new Promise<Reply | null>((resolve) => {
          const timer = setTimeout(() => {
            this.pending.delete(n);
            resolve(null);
          }, ACK_TIMEOUT_MS);
          this.pending.set(n, (message) => {
            clearTimeout(timer);
            this.pending.delete(n);
            resolve(message);
          });
          this.transport.send({ ...command, n }).catch(() => undefined);
        });
        if (reply) return reply;
      }
      return null;
    };
    const result = this.queue.then(run);
    this.queue = result;
    return result;
  }

  private endScan() {
    this.stopTransportScan?.();
    this.stopTransportScan = null;
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private clearTimers() {
    this.stopHeartbeat();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private set(patch: Partial<LinkState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}

function upsert(devices: FoundDevice[], found: FoundDevice): FoundDevice[] {
  const index = devices.findIndex((d) => d.id === found.id);
  if (index === -1) return [...devices, found];
  if (devices[index].name === found.name) return devices;
  return devices.map((d, i) => (i === index ? found : d));
}
