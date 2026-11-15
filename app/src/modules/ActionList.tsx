import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { actionDeviceIds, actionDurationMs } from '@/project/actions';
import type { Action } from '@/project/types';
import { colors } from '@/theme';

import { describeMs } from './describe';
import { DurationBadge } from './DurationBadge';

type Props = {
  actions: Action[];
  onSelect: (action: Action) => void;
};

/** The project's actions as tappable cards: name, module count and, when known, how long the action takes. */
export function ActionList({ actions, onSelect }: Props) {
  if (actions.length === 0) return <Text style={styles.muted}>{t('scenario.pickEmpty')}</Text>;
  return (
    <View style={styles.list}>
      {actions.map((action) => {
        const durationMs = actionDurationMs(action);
        return (
          <Pressable
            key={action.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => onSelect(action)}
          >
            <View style={styles.title}>
              <Text style={styles.name}>{action.name}</Text>
              {durationMs !== null && <DurationBadge label={describeMs(durationMs)} />}
            </View>
            <Text style={styles.muted}>{t('hub.modules.count', { count: actionDeviceIds(action).length })}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    gap: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.75 },
});
