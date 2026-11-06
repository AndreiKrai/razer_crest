/** Rules for actions and sequences (named sets of commands). Pure functions, used by the store and the UI. */
import { COMMAND_PARAMS, COMMANDS, PARAM_LIMITS, type CommandId, type ParamId } from '@/catalog/commands';

import type { Action, ActionStep, Device, SequenceAction, SequenceRow, Slot } from './types';

export const MAX_ACTION_NAME_LENGTH = 32;

// A pause or a command's duration is typed in seconds; the model counts milliseconds and its tick is 30 ms
// (firmware/system.py).
export const PAUSE_LIMITS = { min: 0.1, max: 600 };

/** A command that can carry a duration: everything but off/stop, which already are the "end" state. */
export const takesDuration = (command: CommandId) => command !== 'off' && command !== 'stop';

/** Everything the action form edits; the mode is chosen when the action is created and doesn't change. */
export type ActionDraft = {
  name: string;
  exclusive: boolean;
  mode: 'action' | 'sequence';
  steps: ActionStep[];
  rows: SequenceRow[];
  loop: boolean;
};

export const isSequence = (action: Action): action is SequenceAction => action.mode === 'sequence';

export function actionProblem(draft: ActionDraft): 'noName' | 'noSteps' | 'noTime' | null {
  if (!draft.name.trim()) return 'noName';
  if (draft.mode === 'action') return draft.steps.length === 0 ? 'noSteps' : null;
  if (draft.rows.length === 0) return 'noSteps';
  // A loop with no pause in it would restart at once, forever.
  if (draft.loop && sequenceDurationMs(draft.rows) === 0) return 'noTime';
  return null;
}

/** The value if it is a number inside the parameter's limits (rounded to 2 decimals), else undefined. */
export function cleanParam(param: ParamId, value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const { min, max } = PARAM_LIMITS[param];
  const rounded = Math.round(value * 100) / 100;
  return rounded >= min && rounded <= max ? rounded : undefined;
}

/** A pause in seconds, rounded to 0.01 and inside the limits, else undefined. */
export function cleanPause(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value * 100) / 100;
  return rounded >= PAUSE_LIMITS.min && rounded <= PAUSE_LIMITS.max ? rounded : undefined;
}

/** Only the parameters the command accepts, each inside its limits, and a duration if the command takes one. */
function cleanParams(step: Omit<ActionStep, 'deviceId'>): Omit<ActionStep, 'deviceId'> {
  const allowed = COMMAND_PARAMS[step.command] ?? [];
  const brightness = allowed.includes('brightness') ? cleanParam('brightness', step.brightness) : undefined;
  const frequency = allowed.includes('frequency') ? cleanParam('frequency', step.frequency) : undefined;
  const speed = allowed.includes('speed') ? cleanParam('speed', step.speed) : undefined;
  const duration = takesDuration(step.command) ? cleanPause(step.duration) : undefined;
  return {
    command: step.command,
    ...(brightness !== undefined && { brightness }),
    ...(frequency !== undefined && { frequency }),
    ...(speed !== undefined && { speed }),
    ...(duration !== undefined && { duration }),
  };
}

/** Steps whose device exists and whose command suits its kind, one step per device (the last one wins). */
export function cleanSteps(steps: ActionStep[], devices: Device[]): ActionStep[] {
  const byDevice = new Map<string, ActionStep>();
  for (const step of steps) {
    const device = devices.find((d) => d.id === step.deviceId);
    if (device && COMMANDS[device.kind].includes(step.command)) {
      byDevice.set(step.deviceId, { deviceId: step.deviceId, ...cleanParams(step) });
    }
  }
  return [...byDevice.values()];
}

/** Slots that make sense for the module's kind; the rest are dropped. */
function cleanSlots(slots: Slot[], device: Device): Slot[] {
  const clean: Slot[] = [];
  for (const slot of slots) {
    if (slot.type === 'pause') {
      const seconds = cleanPause(slot.seconds);
      if (seconds !== undefined) clean.push({ type: 'pause', seconds });
    } else if (COMMANDS[device.kind].includes(slot.command)) {
      clean.push({ type: 'command', ...cleanParams(slot) });
    }
  }
  return clean;
}

/** Rows whose device exists and that still have slots, one row per device (the first one wins). */
export function cleanRows(rows: SequenceRow[], devices: Device[]): SequenceRow[] {
  const clean: SequenceRow[] = [];
  for (const row of rows) {
    const device = devices.find((d) => d.id === row.deviceId);
    if (!device || clean.some((r) => r.deviceId === row.deviceId)) continue;
    const slots = cleanSlots(row.slots, device);
    if (slots.length > 0) clean.push({ deviceId: row.deviceId, slots });
  }
  return clean;
}

export function rowDurationMs(row: SequenceRow): number {
  return row.slots.reduce((sum, s) => sum + (s.type === 'pause' ? Math.round(s.seconds * 1000) : 0), 0);
}

/** The longest row: how long a sequence takes, or one round of a loop. */
export function sequenceDurationMs(rows: SequenceRow[]): number {
  return Math.max(0, ...rows.map(rowDurationMs));
}

/** The action to store for a draft, with every part checked against the project's devices. */
export function buildAction(id: string, draft: ActionDraft, devices: Device[]): Action {
  const base = { id, name: draft.name.trim().slice(0, MAX_ACTION_NAME_LENGTH), ...(draft.exclusive && { exclusive: true }) };
  if (draft.mode === 'sequence') {
    return { ...base, mode: 'sequence', rows: cleanRows(draft.rows, devices), ...(draft.loop && { loop: true }) };
  }
  return { ...base, steps: cleanSteps(draft.steps, devices) };
}

/** The ids of the modules an action uses. */
export function actionDeviceIds(action: Action): string[] {
  return isSequence(action) ? action.rows.map((r) => r.deviceId) : action.steps.map((s) => s.deviceId);
}

/** Drops steps and rows of devices that are gone, and actions left with nothing to run. */
export function pruneActions(actions: Action[], devices: Device[]): Action[] {
  const alive = new Set(devices.map((d) => d.id));
  const pruned: Action[] = [];
  for (const action of actions) {
    if (isSequence(action)) {
      const rows = action.rows.filter((r) => alive.has(r.deviceId));
      if (rows.length > 0) pruned.push({ ...action, rows });
    } else {
      const steps = action.steps.filter((s) => alive.has(s.deviceId));
      if (steps.length > 0) pruned.push({ ...action, steps });
    }
  }
  return pruned;
}
