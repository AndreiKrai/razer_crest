/** Actions a device of each kind offers. Names only for now; speed and duration come with the sequence editor. */
import type { PortKind } from './boards';

export type CommandId = 'steady' | 'off' | 'blink' | 'pulse' | 'flicker' | 'forward' | 'reverse' | 'stop';

export const COMMANDS: Record<PortKind, readonly CommandId[]> = {
  light: ['steady', 'off', 'blink', 'pulse', 'flicker'],
  motor: ['forward', 'reverse', 'stop'],
};
