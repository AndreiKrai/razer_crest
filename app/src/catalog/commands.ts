/** Actions a device of each kind offers, and the parameters of each. Defaults mirror firmware/system.py. */
import type { PortKind } from './boards';

export type CommandId = 'steady' | 'off' | 'blink' | 'pulse' | 'flicker' | 'forward' | 'reverse' | 'stop';

export const COMMANDS: Record<PortKind, readonly CommandId[]> = {
  light: ['steady', 'off', 'blink', 'pulse', 'flicker'],
  motor: ['forward', 'reverse', 'stop'],
};

export type ParamId = 'brightness' | 'frequency' | 'speed';

// Parameters a command accepts; the others are dropped when a step is saved.
export const COMMAND_PARAMS: Partial<Record<CommandId, readonly ParamId[]>> = {
  steady: ['brightness'],
  blink: ['brightness', 'frequency'],
  pulse: ['brightness', 'frequency'],
  flicker: ['brightness'],
  forward: ['speed'],
  reverse: ['speed'],
};

// Brightness is a percent in 0.01 steps (the cabin lights run at under 2%), frequency is in Hz, speed a percent.
export const PARAM_LIMITS: Record<ParamId, { min: number; max: number }> = {
  brightness: { min: 0.01, max: 100 },
  frequency: { min: 0.1, max: 10 },
  speed: { min: 1, max: 100 },
};

export const BRIGHTNESS_DEFAULT = 100;
export const SPEED_DEFAULT = 50;
export const FREQUENCY_DEFAULT: Partial<Record<CommandId, number>> = { blink: 2, pulse: 0.5 };
