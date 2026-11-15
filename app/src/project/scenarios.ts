/** Rules for scenarios (existing actions arranged in time). Pure functions, used by the store and the UI. */
import { cleanPause } from './actions';
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

/** How long the longest row waits, in ms: one round of a loop. Actions start instantly, so only pauses count. */
export function scenarioDurationMs(rows: ScenarioRow[]): number {
  return Math.max(
    0,
    ...rows.map((row) => row.slots.reduce((sum, s) => sum + (s.type === 'pause' ? Math.round(s.seconds * 1000) : 0), 0)),
  );
}

export function scenarioProblem(draft: ScenarioDraft): 'noName' | 'noActions' | 'noTime' | 'tooManyActions' | null {
  if (!draft.name.trim()) return 'noName';
  const ids = scenarioActionIds(draft.rows);
  if (ids.length === 0) return 'noActions';
  if (ids.length > MAX_SCENARIO_ACTIONS) return 'tooManyActions';
  // A loop with no pause in it would restart at once, forever.
  if (draft.loop && scenarioDurationMs(draft.rows) === 0) return 'noTime';
  return null;
}

/** Slots that make sense: a valid pause, or an action that exists. A row left with no action is dropped. */
export function cleanScenarioRows(rows: ScenarioRow[], actions: Action[]): ScenarioRow[] {
  const clean: ScenarioRow[] = [];
  for (const row of rows) {
    const slots: ScenarioSlot[] = [];
    for (const slot of row.slots) {
      if (slot.type === 'pause') {
        const seconds = cleanPause(slot.seconds);
        if (seconds !== undefined) slots.push({ type: 'pause', seconds });
      } else if (actions.some((a) => a.id === slot.actionId)) {
        slots.push({ type: 'action', actionId: slot.actionId });
      }
    }
    if (slots.some((s) => s.type === 'action')) clean.push({ slots });
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
