import { t } from '@/i18n';

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
