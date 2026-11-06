import { isValidDeviceName, SHIP_STATUSES, type DeviceMessage, type WireCommand } from './protocol';
import type { BluetoothPower, FoundDevice, Transport } from './transport';

const LATENCY_MS = 60;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A pretend model, so the app can be developed without a phone and a board. Answers like firmware/ble.py. */
export class MockTransport implements Transport {
  readonly simulated = true;
  private name = 'RasorCrest-DEMO';
  private status = 'off';
  private onMessage: ((message: DeviceMessage) => void) | null = null;

  watchPower(listener: (power: BluetoothPower) => void) {
    listener('on');
    return () => undefined;
  }

  scan(onFound: (device: FoundDevice) => void) {
    const timer = setTimeout(() => onFound({ id: 'mock-device', name: this.name }), 800);
    return () => clearTimeout(timer);
  }

  async connect(_id: string, onMessage: (message: DeviceMessage) => void) {
    await wait(500);
    this.onMessage = onMessage;
  }

  async disconnect() {
    this.onMessage = null;
  }

  async send(message: WireCommand) {
    await wait(LATENCY_MS);
    this.answer(message);
  }

  async beat() {}

  private emit(message: DeviceMessage) {
    this.onMessage?.(message);
  }

  private answer(message: WireCommand) {
    const { n } = message;
    switch (message.c) {
      case 'hello':
        this.emit({ t: 'hello', n, fw: 'sim', name: this.name, s: this.status });
        return;
      case 'set_status':
        if (!SHIP_STATUSES.includes(message.id)) {
          this.emit({ t: 'ack', n, e: 'bad_status' });
          return;
        }
        this.status = message.id;
        break;
      case 'stop_all':
        this.status = 'off';
        break;
      case 'device_test':
        if (!Number.isInteger(message.i) || message.i < 0 || message.i >= (message.k === 'light' ? 32 : 6)) {
          this.emit({ t: 'ack', n, e: 'bad_target' });
          return;
        }
        break;
      case 'run_action':
        if (!message.a || message.s.length === 0) {
          this.emit({ t: 'ack', n, e: 'bad_action' });
          return;
        }
        break;
      case 'run_sequence':
        if (!message.a || message.r.length === 0) {
          this.emit({ t: 'ack', n, e: 'bad_action' });
          return;
        }
        break;
      case 'stop_action':
        break;
      case 'set_name':
        if (!isValidDeviceName(message.name)) {
          this.emit({ t: 'ack', n, e: 'bad_name' });
          return;
        }
        this.name = message.name.trim();
        break;
    }
    this.emit({ t: 'ack', n });
    this.emit({ t: 'state', s: this.status });
  }
}
