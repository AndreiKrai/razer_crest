import { BleManager, State, type Subscription } from 'react-native-ble-plx';

import {
  COMMAND_UUID,
  decodeMessage,
  encodeMessage,
  HEARTBEAT_UUID,
  HEARTBEAT_VALUE,
  SERVICE_UUID,
  STATE_UUID,
  type DeviceMessage,
  type WireCommand,
} from './protocol';
import {
  BluetoothUnavailable,
  type BluetoothPower,
  type FoundDevice,
  type ScanFailure,
  type Transport,
} from './transport';

// Android below 14 starts at 23 bytes, too small for the hello message; iOS negotiates on its own.
const REQUESTED_MTU = 185;
const CONNECT_TIMEOUT_MS = 10_000;

function powerOf(state: State): BluetoothPower {
  switch (state) {
    case State.PoweredOn:
      return 'on';
    case State.PoweredOff:
      return 'off';
    case State.Unauthorized:
      return 'unauthorized';
    case State.Unsupported:
      return 'unsupported';
    default:
      return 'unknown';
  }
}

/** react-native-ble-plx. Needs a development build and a real phone. */
export class BleTransport implements Transport {
  readonly simulated = false;
  private manager: BleManager | null = null;
  private deviceId: string | null = null;
  private subscriptions: Subscription[] = [];

  // Created on first use: Expo Go has no native module, and then this throws into the caller.
  private getManager(): BleManager {
    this.manager ??= new BleManager();
    return this.manager;
  }

  watchPower(listener: (power: BluetoothPower) => void) {
    const subscription = this.getManager().onStateChange((state) => listener(powerOf(state)), true);
    return () => subscription.remove();
  }

  scan(onFound: (device: FoundDevice) => void, onFailure: (reason: ScanFailure) => void) {
    const manager = this.getManager();
    let active = true;
    let scanning = false;

    const stateSubscription = manager.onStateChange((state) => {
      if (!active) return;
      if (state === State.PoweredOn) {
        if (scanning) return;
        scanning = true;
        manager
          .startDeviceScan([SERVICE_UUID], null, (error, device) => {
            if (!active) return;
            if (error) onFailure('failed');
            else if (device) onFound({ id: device.id, name: device.localName ?? device.name ?? '' });
          })
          .catch(() => onFailure('failed'));
      } else if (state === State.PoweredOff) {
        onFailure('off');
      } else if (state === State.Unauthorized) {
        onFailure('unauthorized');
      } else if (state === State.Unsupported) {
        onFailure('unsupported');
      }
    }, true);

    return () => {
      active = false;
      stateSubscription.remove();
      manager.stopDeviceScan().catch(() => undefined);
    };
  }

  async connect(id: string, onMessage: (message: DeviceMessage) => void, onLost: () => void) {
    const manager = this.getManager();
    const power = powerOf(await manager.state());
    if (power === 'off' || power === 'unauthorized' || power === 'unsupported') throw new BluetoothUnavailable(power);
    const device = await manager.connectToDevice(id, { requestMTU: REQUESTED_MTU, timeout: CONNECT_TIMEOUT_MS });
    await device.discoverAllServicesAndCharacteristics();
    this.deviceId = id;
    this.subscriptions = [
      manager.onDeviceDisconnected(id, () => {
        this.release();
        onLost();
      }),
      manager.monitorCharacteristicForDevice(id, SERVICE_UUID, STATE_UUID, (error, characteristic) => {
        if (error || !characteristic?.value) return;
        const message = decodeMessage(characteristic.value);
        if (message) onMessage(message);
      }),
    ];
  }

  async disconnect() {
    const id = this.deviceId;
    this.release();
    if (id) await this.getManager().cancelDeviceConnection(id);
  }

  async send(message: WireCommand) {
    if (!this.deviceId) return;
    await this.getManager().writeCharacteristicWithResponseForDevice(
      this.deviceId,
      SERVICE_UUID,
      COMMAND_UUID,
      encodeMessage(message),
    );
  }

  async beat() {
    if (!this.deviceId) return;
    await this.getManager().writeCharacteristicWithoutResponseForDevice(
      this.deviceId,
      SERVICE_UUID,
      HEARTBEAT_UUID,
      HEARTBEAT_VALUE,
    );
  }

  private release() {
    for (const subscription of this.subscriptions) subscription.remove();
    this.subscriptions = [];
    this.deviceId = null;
  }
}
