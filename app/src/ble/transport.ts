import type { DeviceMessage, WireCommand } from './protocol';

export type FoundDevice = { id: string; name: string };

export type ScanFailure = 'off' | 'unauthorized' | 'unsupported' | 'failed';

// The phone's Bluetooth: 'unknown' until the radio has reported (or while it resets).
export type BluetoothPower = 'unknown' | 'on' | 'off' | 'unauthorized' | 'unsupported';

/** Thrown by connect when Bluetooth can't be used, so the link can say why instead of "could not connect". */
export class BluetoothUnavailable extends Error {
  constructor(readonly power: Exclude<BluetoothPower, 'on' | 'unknown'>) {
    super(`bluetooth ${power}`);
  }
}

/** The radio under the link: the real BLE stack on a phone, a simulation in the simulator and on the web. */
export interface Transport {
  readonly simulated: boolean;
  // Calls the listener with the current power state and every change; returns a function that stops watching.
  watchPower(listener: (power: BluetoothPower) => void): () => void;
  // Returns a function that stops the scan.
  scan(onFound: (device: FoundDevice) => void, onFailure: (reason: ScanFailure) => void): () => void;
  // Resolves once the notifications are subscribed; onLost fires when the link drops afterwards.
  // Rejects with BluetoothUnavailable when Bluetooth is off or not allowed.
  connect(id: string, onMessage: (message: DeviceMessage) => void, onLost: () => void): Promise<void>;
  disconnect(): Promise<void>;
  // Command characteristic, write with response.
  send(message: WireCommand): Promise<void>;
  // Heartbeat characteristic, write without response.
  beat(): Promise<void>;
}
