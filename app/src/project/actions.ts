/** Rules for actions (named sets of commands). Pure functions, used by the store and the UI. */
import { COMMAND_PARAMS, COMMANDS, PARAM_LIMITS, type ParamId } from '@/catalog/commands';

import type { Action, ActionStep, Device } from './types';

export const MAX_ACTION_NAME_LENGTH = 32;

export function actionProblem(name: string, steps: ActionStep[]): 'noName' | 'noSteps' | null {
  if (!name.trim()) return 'noName';
  if (steps.length === 0) return 'noSteps';
  return null;
}

/** The value if it is a number inside the parameter's limits (rounded to 2 decimals), else undefined. */
export function cleanParam(param: ParamId, value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const { min, max } = PARAM_LIMITS[param];
  const rounded = Math.round(value * 100) / 100;
  return rounded >= min && rounded <= max ? rounded : undefined;
}

/** The step with only the parameters its command accepts, each inside its limits. */
function cleanStep(step: ActionStep): ActionStep {
  const allowed = COMMAND_PARAMS[step.command] ?? [];
  const brightness = allowed.includes('brightness') ? cleanParam('brightness', step.brightness) : undefined;
  const frequency = allowed.includes('frequency') ? cleanParam('frequency', step.frequency) : undefined;
  const speed = allowed.includes('speed') ? cleanParam('speed', step.speed) : undefined;
  return {
    deviceId: step.deviceId,
    command: step.command,
    ...(brightness !== undefined && { brightness }),
    ...(frequency !== undefined && { frequency }),
    ...(speed !== undefined && { speed }),
  };
}

/** Steps whose device exists and whose command suits its kind, one step per device (the last one wins). */
export function cleanSteps(steps: ActionStep[], devices: Device[]): ActionStep[] {
  const byDevice = new Map<string, ActionStep>();
  for (const step of steps) {
    const device = devices.find((d) => d.id === step.deviceId);
    if (device && COMMANDS[device.kind].includes(step.command)) byDevice.set(step.deviceId, cleanStep(step));
  }
  return [...byDevice.values()];
}

/** Drops steps of devices that are gone, and actions left with no steps. */
export function pruneActions(actions: Action[], devices: Device[]): Action[] {
  const alive = new Set(devices.map((d) => d.id));
  return actions
    .map((a) => ({ ...a, steps: a.steps.filter((s) => alive.has(s.deviceId)) }))
    .filter((a) => a.steps.length > 0);
}
