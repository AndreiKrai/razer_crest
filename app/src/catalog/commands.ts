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

// A chase runs a head (and a fading tail) through several lights of one group; it is a group command, not a CommandId.
export const CHASE_DIRECTIONS = ['forward', 'backward', 'pingpong'] as const;
export type ChaseDirection = (typeof CHASE_DIRECTIONS)[number];
// Step is in seconds (how long the head stays on one light; the firmware's tick is 30 ms). Tail counts lights.
export const CHASE_LIMITS = { step: { min: 0.1, max: 5 }, tail: { min: 1, max: 16 } };
export const CHASE_DEFAULTS = { step: 0.2, direction: 'forward' as ChaseDirection, tail: 3 };
export const CHASE_MIN_LIGHTS = 2;
