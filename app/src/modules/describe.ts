import { t } from '@/i18n';
import { takesDuration } from '@/project/actions';
import type { ChaseParams } from '@/project/types';

import type { CommandValue } from './CommandForm';

/** "Blink · 0.37% · 1 Hz": a command with its parameters, for rows, steps and slots. */
export function describeCommand(value: CommandValue): string {
  return [
    t(`command.${value.command}`),
    value.brightness !== undefined && t('param.brightnessValue', { value: value.brightness }),
    value.frequency !== undefined && t('param.frequencyValue', { value: value.frequency }),
    value.speed !== undefined && t('param.speedValue', { value: value.speed }),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "5 s" for a timed command; null for an endless one and for off/stop, whose time can't be shown. */
export function describeDuration(value: CommandValue): string | null {
  if (!takesDuration(value.command) || value.duration === undefined) return null;
  return t('param.durationValue', { value: value.duration });
}

/** "12.5 s" for a time in ms. */
export const describeMs = (ms: number) => t('param.durationValue', { value: Math.round(ms / 10) / 100 });

/** "Chase · Forward · 0.2 s · tail 3 · 50%": a chase with its parameters. */
export function describeChase(chase: ChaseParams): string {
  return [
    t('chase.title'),
    t(`chase.direction.${chase.direction}`),
    t('param.durationValue', { value: chase.step }),
    t('chase.tailValue', { value: chase.tail }),
    chase.brightness !== undefined && t('param.brightnessValue', { value: chase.brightness }),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "5 s" for a timed chase; null for an endless one. */
export const describeChaseDuration = (chase: ChaseParams): string | null =>
  chase.duration === undefined ? null : t('param.durationValue', { value: chase.duration });
