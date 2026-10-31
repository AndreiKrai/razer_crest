import { MockTransport } from './MockTransport';
import type { Transport } from './transport';

// No BLE library on the web: always the simulation.
export function createTransport(): Transport {
  return new MockTransport();
}
