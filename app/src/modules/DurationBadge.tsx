import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

/** A clock with a time ("5 s"), shown after a module's or an action's name when the time is known. */
export function DurationBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Ionicons name="time-outline" size={15} color={colors.textMuted} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
  text: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
