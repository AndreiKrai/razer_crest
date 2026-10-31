import * as Device from 'expo-device';

import { BleTransport } from './BleTransport';
import { MockTransport } from './MockTransport';
import type { Transport } from './transport';

// The iOS simulator and Android emulator have no Bluetooth.
export function createTransport(): Transport {
  return Device.isDevice ? new BleTransport() : new MockTransport();
}
