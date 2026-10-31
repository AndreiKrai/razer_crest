import type { DeviceMessage, WireCommand } from './protocol';

export type FoundDevice = { id: string; name: string };

export type ScanFailure = 'off' | 'unauthorized' | 'unsupported' | 'failed';

/** The radio under the link: the real BLE stack on a phone, a simulation in the simulator and on the web. */
export interface Transport {
  readonly simulated: boolean;
  // Returns a function that stops the scan.
  scan(onFound: (device: FoundDevice) => void, onFailure: (reason: ScanFailure) => void): () => void;
  // Resolves once the notifications are subscribed; onLost fires when the link drops afterwards.
  connect(id: string, onMessage: (message: DeviceMessage) => void, onLost: () => void): Promise<void>;
  disconnect(): Promise<void>;
  // Command characteristic, write with response.
  send(message: WireCommand): Promise<void>;
  // Heartbeat characteristic, write without response.
  beat(): Promise<void>;
}
