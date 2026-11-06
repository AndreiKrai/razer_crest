import { t } from '@/i18n';
import { takesDuration } from '@/project/actions';

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

/** "5 s" for a timed command, "∞" for an endless one; null for off/stop, which have no duration. */
export function describeDuration(value: CommandValue): string | null {
  if (!takesDuration(value.command)) return null;
  return value.duration === undefined ? '∞' : t('param.durationValue', { value: value.duration });
}
