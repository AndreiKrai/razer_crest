/** Rules for scenarios (existing actions arranged in time). Pure functions, used by the store and the UI. */
import { actionCycleMs, actionDurationMs, actionEndMs, cleanPause } from './actions';
import type { Action, Scenario, ScenarioRow, ScenarioSlot } from './types';

export const MAX_SCENARIO_NAME_LENGTH = 32;

// The model keeps this many actions for scenarios (_LIBRARY_MAX in firmware/system.py).
export const MAX_SCENARIO_ACTIONS = 12;

/** Everything the scenario form edits. */
export type ScenarioDraft = {
  name: string;
  exclusive: boolean;
  loop: boolean;
  rows: ScenarioRow[];
};

/** The ids of the actions a scenario uses, each once, in the order they first appear. */
export function scenarioActionIds(rows: ScenarioRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    for (const slot of row.slots) if (slot.type === 'action') ids.add(slot.actionId);
  }
  return [...ids];
}

/** Extra time on top of an action's own length when it has no end of its own and no time is chosen. */
export const RUN_EXTRA_MS = 1000;

const MAX_RUN_MS = 600_000;

/** Whether the action never ends by itself (an endless command, a loop): the scenario has to say how long it runs. */
export function isOpenAction(action: Action): boolean {
  return actionEndMs(action) === Infinity;
}

/** How long an open action runs by default: its longest row + 1 s (a plain action: 1 s), within the pause limits. */
export function defaultRunMs(action: Action): number {
  return Math.min(actionCycleMs(action) + RUN_EXTRA_MS, MAX_RUN_MS);
}

/**
 * What a slot does to its row: `waitMs` is how long it holds the row before the next slot, `stop` says the action it
 * started is stopped once that time is over. A pause only waits. An action that ends by itself waits for its end. An
 * open action runs for the slot's `runFor` (default: longest row + 1 s) and then stops, unless it is the last slot of
 * its row and `endless`: then it keeps running until Stop.
 */
export function slotPlan(slot: ScenarioSlot, actions: Action[], isLast: boolean): { waitMs: number; stop: boolean } {
  if (slot.type === 'pause') return { waitMs: Math.round(slot.seconds * 1000), stop: false };
  const action = actions.find((a) => a.id === slot.actionId);
  if (!action) return { waitMs: 0, stop: false };
  if (!isOpenAction(action)) return { waitMs: actionDurationMs(action) ?? 0, stop: false };
  if (isLast && slot.endless) return { waitMs: 0, stop: false };
  return { waitMs: slot.runFor === undefined ? defaultRunMs(action) : Math.round(slot.runFor * 1000), stop: true };
}

/** How long the longest row takes, in ms: one round of a loop. A row that ends in an endless action doesn't count it. */
export function scenarioDurationMs(rows: ScenarioRow[], actions: Action[]): number {
  return Math.max(
    0,
    ...rows.map((row) =>
      row.slots.reduce((sum, s, i) => sum + slotPlan(s, actions, i === row.slots.length - 1).waitMs, 0),
    ),
  );
}

/** When everything a scenario started is over, in ms: Infinity for a loop or a row that ends in an endless action. */
export function scenarioEndMs(scenario: Scenario, actions: Action[]): number {
  if (scenario.loop) return Infinity;
  const endless = scenario.rows.some((row) => {
    const last = row.slots[row.slots.length - 1];
    if (last?.type !== 'action' || !last.endless) return false;
    const action = actions.find((a) => a.id === last.actionId);
    return !!action && isOpenAction(action);
  });
  return endless ? Infinity : scenarioDurationMs(scenario.rows, actions);
}

export function scenarioProblem(
  draft: ScenarioDraft,
  actions: Action[],
): 'noName' | 'noActions' | 'noTime' | 'tooManyActions' | null {
  if (!draft.name.trim()) return 'noName';
  const ids = scenarioActionIds(draft.rows);
  if (ids.length === 0) return 'noActions';
  if (ids.length > MAX_SCENARIO_ACTIONS) return 'tooManyActions';
  // A loop with no time in it would restart at once, forever.
  if (draft.loop && scenarioDurationMs(draft.rows, actions) === 0) return 'noTime';
  return null;
}

/** Slots that make sense: a valid pause, or an action that exists with a valid run time. A row left with no action is dropped. */
export function cleanScenarioRows(rows: ScenarioRow[], actions: Action[]): ScenarioRow[] {
  const clean: ScenarioRow[] = [];
  for (const row of rows) {
    const slots: ScenarioSlot[] = [];
    for (const slot of row.slots) {
      if (slot.type === 'pause') {
        const seconds = cleanPause(slot.seconds);
        if (seconds !== undefined) slots.push({ type: 'pause', seconds });
      } else if (actions.some((a) => a.id === slot.actionId)) {
        const runFor = cleanPause(slot.runFor);
        slots.push({
          type: 'action',
          actionId: slot.actionId,
          ...(runFor !== undefined && { runFor }),
          ...(slot.endless === true && { endless: true }),
        });
      }
    }
    // Endless only makes sense on the last slot of a row.
    const last = slots.length - 1;
    const fixed = slots.map((s, i) => {
      if (s.type === 'action' && s.endless && i !== last) {
        const { endless: _endless, ...rest } = s;
        return rest;
      }
      return s;
    });
    if (fixed.some((s) => s.type === 'action')) clean.push({ slots: fixed });
  }
  return clean;
}

/** The scenario to store for a draft, with every part checked against the project's actions. */
export function buildScenario(id: string, draft: ScenarioDraft, actions: Action[]): Scenario {
  return {
    id,
    name: draft.name.trim().slice(0, MAX_SCENARIO_NAME_LENGTH),
    ...(draft.exclusive && { exclusive: true }),
    ...(draft.loop && { loop: true }),
    rows: cleanScenarioRows(draft.rows, actions),
  };
}

/** Drops slots of actions that are gone, and scenarios left with nothing to run. */
export function pruneScenarios(scenarios: Scenario[], actions: Action[]): Scenario[] {
  const pruned: Scenario[] = [];
  for (const scenario of scenarios) {
    const rows = cleanScenarioRows(scenario.rows, actions);
    if (rows.length > 0) pruned.push({ ...scenario, rows });
  }
  return pruned;
}
