import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { makeStyles, useTheme } from '@/design/ThemeProvider';

/** A clock with a time ("5 s"), shown after a module's or an action's name when the time is known. */
export function DurationBadge({ label }: { label: string }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.badge}>
      <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: t.colors.surfaceRaised,
  },
  text: { color: t.colors.textMuted, fontSize: 13, fontWeight: '600' },
}));
