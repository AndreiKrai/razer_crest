/** Rules for the Play screen's buttons: name, icon, what they start, and pruning when that is gone. */
import { actionEndMs } from './actions';
import { scenarioEndMs } from './scenarios';
import type { Action, PlayButton, PlayTarget, Scenario } from './types';

export const MAX_BUTTON_NAME_LENGTH = 24;

// MaterialCommunityIcons names the user can pick from; the first one is the default.
export const PLAY_ICONS = [
  'play-circle',
  'rocket-launch',
  'airplane',
  'car',
  'ship-wheel',
  'robot',
  'engine',
  'engine-off',
  'fan',
  'lightbulb-on',
  'lightbulb-off',
  'white-balance-sunny',
  'weather-night',
  'flash',
  'lightning-bolt',
  'fire',
  'alarm-light',
  'alert',
  'bell',
  'music',
  'door-open',
  'door-closed',
  'garage',
  'lock',
  'lock-open',
  'home',
  'shield',
  'radar',
  'target',
  'eye',
  'star',
  'heart',
  'flag',
  'timer-sand',
  'sleep',
  'power',
] as const;

export const DEFAULT_PLAY_ICON = PLAY_ICONS[0];

export type ButtonDraft = { name: string; icon: string; target: PlayTarget | null };

export function buttonProblem(draft: ButtonDraft): 'noName' | 'noTarget' | null {
  if (!draft.name.trim()) return 'noName';
  return draft.target ? null : 'noTarget';
}

const cleanIcon = (icon: unknown): string =>
  typeof icon === 'string' && (PLAY_ICONS as readonly string[]).includes(icon) ? icon : DEFAULT_PLAY_ICON;

export function targetExists(target: PlayTarget, actions: Action[], scenarios: Scenario[]): boolean {
  const list: { id: string }[] = target.type === 'action' ? actions : scenarios;
  return list.some((item) => item.id === target.id);
}

/**
 * How long a button's target runs once started, in ms, as far as the phone can tell (the model doesn't report it):
 * null = until stopped (an endless command, a loop), 0 = at once (only off/stop) or the target is gone.
 */
export function targetRunMs(target: PlayTarget, actions: Action[], scenarios: Scenario[]): number | null {
  const end =
    target.type === 'action'
      ? (() => {
          const action = actions.find((a) => a.id === target.id);
          return action ? actionEndMs(action) : 0;
        })()
      : (() => {
          const scenario = scenarios.find((s) => s.id === target.id);
          return scenario ? scenarioEndMs(scenario, actions) : 0;
        })();
  return Number.isFinite(end) ? end : null;
}

/** Whether starting the target first stops everything else on the model. */
export function targetIsExclusive(target: PlayTarget, actions: Action[], scenarios: Scenario[]): boolean {
  const list: { id: string; exclusive?: boolean }[] = target.type === 'action' ? actions : scenarios;
  return list.find((item) => item.id === target.id)?.exclusive === true;
}

/** Null when the draft has no name or its target isn't in the project. */
export function buildButton(id: string, draft: ButtonDraft, actions: Action[], scenarios: Scenario[]): PlayButton | null {
  const name = draft.name.trim().slice(0, MAX_BUTTON_NAME_LENGTH);
  if (!name || !draft.target || !targetExists(draft.target, actions, scenarios)) return null;
  return { id, name, icon: cleanIcon(draft.icon), target: { type: draft.target.type, id: draft.target.id } };
}

/** Buttons whose action or scenario is gone are removed. */
export function pruneButtons(buttons: PlayButton[], actions: Action[], scenarios: Scenario[]): PlayButton[] {
  const kept = buttons.filter((b) => targetExists(b.target, actions, scenarios));
  return kept.length === buttons.length ? buttons : kept;
}

/** Checks a button read from a file; null if it can't be used. */
export function cleanButton(raw: Record<string, unknown>, actions: Action[], scenarios: Scenario[]): PlayButton | null {
  const target = raw.target as Record<string, unknown> | undefined;
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string' || !target || typeof target.id !== 'string') return null;
  if (target.type !== 'action' && target.type !== 'scenario') return null;
  return buildButton(raw.id, { name: raw.name, icon: String(raw.icon), target: { type: target.type, id: target.id } }, actions, scenarios);
}
