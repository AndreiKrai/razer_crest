/** Rules for actions (named sets of commands). Pure functions, used by the store and the UI. */
import { COMMANDS } from '@/catalog/commands';

import type { Action, ActionStep, Device } from './types';

export const MAX_ACTION_NAME_LENGTH = 32;

export function actionProblem(name: string, steps: ActionStep[]): 'noName' | 'noSteps' | null {
  if (!name.trim()) return 'noName';
  if (steps.length === 0) return 'noSteps';
  return null;
}

/** Steps whose device exists and whose command suits its kind, one step per device (the last one wins). */
export function cleanSteps(steps: ActionStep[], devices: Device[]): ActionStep[] {
  const byDevice = new Map<string, ActionStep>();
  for (const step of steps) {
    const device = devices.find((d) => d.id === step.deviceId);
    if (device && COMMANDS[device.kind].includes(step.command)) byDevice.set(step.deviceId, step);
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
