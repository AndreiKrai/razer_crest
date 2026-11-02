/** The app side of docs/PROTOCOL.md: ids, message shapes and encoding. Keep in step with firmware/ble.py. */

export const SERVICE_UUID = '6f9d0001-7b5a-4a5e-8c11-5261736f7243';
export const COMMAND_UUID = '6f9d0002-7b5a-4a5e-8c11-5261736f7243';
export const STATE_UUID = '6f9d0003-7b5a-4a5e-8c11-5261736f7243';
export const HEARTBEAT_UUID = '6f9d0004-7b5a-4a5e-8c11-5261736f7243';

// One byte 0x01 in base64.
export const HEARTBEAT_VALUE = 'AQ==';

// Mirrors STATUSES in firmware/system.py.
export const SHIP_STATUSES = ['off', 'preloading', 'loading', 'idle', 'error', 'damaged'] as const;
export type ShipStatus = (typeof SHIP_STATUSES)[number];

export const MAX_NAME_BYTES = 20;

export function isValidDeviceName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || new TextEncoder().encode(trimmed).length > MAX_NAME_BYTES) return false;
  return ![...trimmed].some((ch) => ch.charCodeAt(0) < 32);
}

// What device_test runs: a TLC5940 channel (light) or a motor channel (motor); firmware/system.py owns the motor pins.
export type TestTarget = { k: 'light' | 'motor'; i: number };

export type Command =
  | { c: 'hello' }
  | { c: 'set_status'; id: ShipStatus }
  | { c: 'stop_all' }
  | { c: 'set_name'; name: string }
  | ({ c: 'device_test' } & TestTarget);

export type WireCommand = Command & { n: number };

export type HelloMessage = { t: 'hello'; n: number; fw: string; name: string; s: string };
export type AckMessage = { t: 'ack'; n: number; e?: string };
export type StateMessage = { t: 'state'; s: string };
export type DeviceMessage = HelloMessage | AckMessage | StateMessage;

export function encodeMessage(message: WireCommand): string {
  const bytes = new TextEncoder().encode(JSON.stringify(message));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeMessage(base64: string): DeviceMessage | null {
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return parseMessage(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

function parseMessage(raw: unknown): DeviceMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;
  if (m.t === 'state' && typeof m.s === 'string') return { t: 'state', s: m.s };
  if (m.t === 'ack' && typeof m.n === 'number') {
    return { t: 'ack', n: m.n, e: typeof m.e === 'string' ? m.e : undefined };
  }
  if (
    m.t === 'hello' &&
    typeof m.n === 'number' &&
    typeof m.fw === 'string' &&
    typeof m.name === 'string' &&
    typeof m.s === 'string'
  ) {
    return { t: 'hello', n: m.n, fw: m.fw, name: m.name, s: m.s };
  }
  return null;
}
