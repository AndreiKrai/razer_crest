/** Rules for actions and sequences (named sets of commands). Pure functions, used by the store and the UI. */
import {
  CHASE_DEFAULTS,
  CHASE_DIRECTIONS,
  CHASE_LIMITS,
  COMMAND_PARAMS,
  COMMANDS,
  PARAM_LIMITS,
  type CommandId,
  type ParamId,
} from '@/catalog/commands';

import type {
  Action,
  ActionStep,
  ChaseParams,
  ChaseStep,
  Device,
  GroupRow,
  GroupSlot,
  SequenceAction,
  Slot,
  TimelineRow,
} from './types';

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
  chases: ChaseStep[];
  rows: TimelineRow[];
  loop: boolean;
};

export const isSequence = (action: Action): action is SequenceAction => action.mode === 'sequence';

export const isGroupRow = (row: TimelineRow): row is GroupRow => 'deviceIds' in row;

/** The list with the item at `from` moved to `to` (both inside the list); other items keep their order. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

export function actionProblem(draft: ActionDraft): 'noName' | 'noSteps' | 'noTime' | null {
  if (!draft.name.trim()) return 'noName';
  if (draft.mode === 'action') return draft.steps.length + draft.chases.length === 0 ? 'noSteps' : null;
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

/** A chase's step in seconds, rounded to 0.01 and inside the limits, else undefined. */
export function cleanChaseStep(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value * 100) / 100;
  return rounded >= CHASE_LIMITS.step.min && rounded <= CHASE_LIMITS.step.max ? rounded : undefined;
}

/** A chase's tail as a whole number of lights inside the limits, else undefined. */
export function cleanTail(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined;
  return value >= CHASE_LIMITS.tail.min && value <= CHASE_LIMITS.tail.max ? value : undefined;
}

/** Chase parameters inside their limits; one that doesn't fit falls back to its default. */
function cleanChase(chase: ChaseParams, lights: number): ChaseParams {
  const brightness = cleanParam('brightness', chase.brightness);
  const duration = cleanPause(chase.duration);
  return {
    ...(brightness !== undefined && { brightness }),
    step: cleanChaseStep(chase.step) ?? CHASE_DEFAULTS.step,
    direction: CHASE_DIRECTIONS.includes(chase.direction) ? chase.direction : CHASE_DEFAULTS.direction,
    tail: Math.min(cleanTail(chase.tail) ?? CHASE_DEFAULTS.tail, lights),
    ...(duration !== undefined && { duration }),
  };
}

/** The ids that are lights of the project and not claimed yet; they become claimed (a module is used once per action). */
function claimLights(ids: string[], devices: Device[], claimed: Set<string>): string[] {
  const own: string[] = [];
  for (const id of ids) {
    const device = devices.find((d) => d.id === id);
    if (device?.kind === 'light' && !claimed.has(id)) {
      claimed.add(id);
      own.push(id);
    }
  }
  return own;
}

export function cleanChases(chases: ChaseStep[], devices: Device[], claimed: Set<string>): ChaseStep[] {
  const clean: ChaseStep[] = [];
  for (const chase of chases) {
    const deviceIds = claimLights(chase.deviceIds, devices, claimed);
    if (deviceIds.length > 0) clean.push({ deviceIds, ...cleanChase(chase, deviceIds.length) });
  }
  return clean;
}

function cleanGroupRow(row: GroupRow, devices: Device[], claimed: Set<string>): GroupRow | null {
  const deviceIds = claimLights(row.deviceIds, devices, claimed);
  const slots: GroupSlot[] = [];
  for (const slot of row.slots) {
    if (slot.type === 'pause') {
      const seconds = cleanPause(slot.seconds);
      if (seconds !== undefined) slots.push({ type: 'pause', seconds });
    } else if (slot.type === 'chase') {
      slots.push({ type: 'chase', ...cleanChase(slot, deviceIds.length) });
    } else if (slot.type === 'off') {
      slots.push({ type: 'off' });
    }
  }
  return deviceIds.length > 0 && slots.length > 0 ? { deviceIds, slots } : null;
}

/** Rows in their order: a module's row needs an existing device not used by an earlier row, and slots; a module is used once. */
export function cleanRows(rows: TimelineRow[], devices: Device[]): TimelineRow[] {
  const claimed = new Set<string>();
  const clean: TimelineRow[] = [];
  for (const row of rows) {
    if (isGroupRow(row)) {
      const group = cleanGroupRow(row, devices, claimed);
      if (group) clean.push(group);
      continue;
    }
    const device = devices.find((d) => d.id === row.deviceId);
    if (!device || claimed.has(row.deviceId)) continue;
    const slots = cleanSlots(row.slots, device);
    if (slots.length > 0) {
      claimed.add(row.deviceId);
      clean.push({ deviceId: row.deviceId, slots });
    }
  }
  return clean;
}

// Rows of single modules and of groups share their timing rules.
type AnyRow = { slots: readonly (Slot | GroupSlot)[] };

export function rowDurationMs(row: AnyRow): number {
  return row.slots.reduce((sum, s) => sum + (s.type === 'pause' ? Math.round(s.seconds * 1000) : 0), 0);
}

/** The longest row: how long a sequence takes, or one round of a loop. */
export function sequenceDurationMs(rows: AnyRow[]): number {
  return Math.max(0, ...rows.map(rowDurationMs));
}

/** When a command's effect ends, started at `at` ms: off/stop at once, a timed one after its duration, else never. */
function commandEndMs(step: Omit<ActionStep, 'deviceId'>, at: number): number {
  if (!takesDuration(step.command)) return at;
  return step.duration === undefined ? Infinity : at + Math.round(step.duration * 1000);
}

/** When a chase ends, started at `at` ms: after its duration, else never. */
function chaseEndMs(chase: Pick<ChaseParams, 'duration'>, at: number): number {
  return chase.duration === undefined ? Infinity : at + Math.round(chase.duration * 1000);
}

/** When a row is over and its modules are off: its pauses, or later if its last command still runs. */
function rowEndMs(row: AnyRow): number {
  let at = 0;
  let lastEnd = 0;
  for (const slot of row.slots) {
    if (slot.type === 'pause') at += Math.round(slot.seconds * 1000);
    else if (slot.type === 'command') lastEnd = commandEndMs(slot, at);
    else if (slot.type === 'chase') lastEnd = chaseEndMs(slot, at);
    else lastEnd = at;
  }
  return Math.max(at, lastEnd);
}

/**
 * How long an action runs until everything it started is off, in ms; null when that can't be told
 * (an endless command, a loop) or when it takes no time (only off/stop).
 */
export function actionDurationMs(action: Action): number | null {
  if (isSequence(action) && action.loop) return null;
  const ends = isSequence(action)
    ? action.rows.map(rowEndMs)
    : [...action.steps.map((s) => commandEndMs(s, 0)), ...(action.chases ?? []).map((c) => chaseEndMs(c, 0))];
  const total = Math.max(0, ...ends);
  return Number.isFinite(total) && total > 0 ? total : null;
}

/** The action to store for a draft, with every part checked against the project's devices. */
export function buildAction(id: string, draft: ActionDraft, devices: Device[]): Action {
  const base = { id, name: draft.name.trim().slice(0, MAX_ACTION_NAME_LENGTH), ...(draft.exclusive && { exclusive: true }) };
  if (draft.mode === 'sequence') {
    return { ...base, mode: 'sequence', rows: cleanRows(draft.rows, devices), ...(draft.loop && { loop: true }) };
  }
  const steps = cleanSteps(draft.steps, devices);
  const chases = cleanChases(draft.chases, devices, new Set(steps.map((s) => s.deviceId)));
  return { ...base, steps, ...(chases.length > 0 && { chases }) };
}

const rowDeviceIds = (row: TimelineRow) => (isGroupRow(row) ? row.deviceIds : [row.deviceId]);

/** A motor command with no end: the motor turns until someone stops it. A timed one stops by itself. */
export function hasRunningMotor(devices: Device[], action: Action): boolean {
  const commands = isSequence(action)
    ? action.rows.flatMap((r) =>
        isGroupRow(r)
          ? []
          : r.slots.flatMap((s) => (s.type === 'command' ? [{ deviceId: r.deviceId, ...s }] : [])),
      )
    : action.steps;
  return commands.some(
    (s) =>
      (s.command === 'forward' || s.command === 'reverse') &&
      s.duration === undefined &&
      devices.some((d) => d.id === s.deviceId && d.kind === 'motor'),
  );
}

/** The ids of the modules an action uses. */
export function actionDeviceIds(action: Action): string[] {
  return isSequence(action)
    ? action.rows.flatMap(rowDeviceIds)
    : [...action.steps.map((s) => s.deviceId), ...(action.chases ?? []).flatMap((c) => c.deviceIds)];
}

/** The ids of the modules a draft already uses, whatever its mode: none of them can be picked again. */
export function draftDeviceIds(draft: ActionDraft): Set<string> {
  return new Set([
    ...draft.steps.map((s) => s.deviceId),
    ...draft.chases.flatMap((c) => c.deviceIds),
    ...draft.rows.flatMap(rowDeviceIds),
  ]);
}

/** Drops steps, rows and group members of devices that are gone, and actions left with nothing to run. */
export function pruneActions(actions: Action[], devices: Device[]): Action[] {
  const alive = new Set(devices.map((d) => d.id));
  const stillThere = (ids: string[]) => ids.filter((id) => alive.has(id));
  const pruned: Action[] = [];
  for (const action of actions) {
    if (isSequence(action)) {
      const rows = action.rows.flatMap((r): TimelineRow[] => {
        if (!isGroupRow(r)) return alive.has(r.deviceId) ? [r] : [];
        const deviceIds = stillThere(r.deviceIds);
        return deviceIds.length > 0 ? [{ ...r, deviceIds }] : [];
      });
      if (rows.length > 0) pruned.push({ ...action, rows });
    } else {
      const steps = action.steps.filter((s) => alive.has(s.deviceId));
      const chases = (action.chases ?? [])
        .map((c) => ({ ...c, deviceIds: stillThere(c.deviceIds) }))
        .filter((c) => c.deviceIds.length > 0);
      if (steps.length + chases.length > 0) pruned.push({ ...action, steps, chases });
    }
  }
  return pruned;
}
