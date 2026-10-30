/** Actions a device of each kind offers. Names only for now; speed and duration come with the sequence editor. */
import type { PortKind } from './boards';

export type ActionId = 'steady' | 'off' | 'blink' | 'pulse' | 'flicker' | 'forward' | 'reverse' | 'stop';

export const ACTIONS: Record<PortKind, readonly ActionId[]> = {
  light: ['steady', 'off', 'blink', 'pulse', 'flicker'],
  motor: ['forward', 'reverse', 'stop'],
};
