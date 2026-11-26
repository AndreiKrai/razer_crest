import { Pressable, Text, TextInput, View } from 'react-native';

import { t, type TKey } from '@/i18n';
import { PAUSE_LIMITS } from '@/project/actions';
import { makeStyles } from '@/design/ThemeProvider';

type Props = {
  endless: boolean;
  onEndlessChange: (endless: boolean) => void;
  // The typed seconds, and whether they are a valid duration.
  text: string;
  onTextChange: (text: string) => void;
  valid: boolean;
  endlessHint: TKey;
  durationHint: TKey;
};

/** "Duration, seconds": a number field, or the ∞ Endless switch instead of it. */
export function DurationField({ endless, onEndlessChange, text, onTextChange, valid, endlessHint, durationHint }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.muted}>
        {t('param.duration')} ({PAUSE_LIMITS.min}–{PAUSE_LIMITS.max})
      </Text>
      <View style={styles.row}>
        {!endless && (
          <TextInput
            style={[styles.input, styles.rowInput, !valid && styles.inputInvalid]}
            value={text}
            onChangeText={onTextChange}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        )}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: endless }}
          style={({ pressed }) => [styles.chip, endless && styles.chipActive, pressed && styles.pressed]}
          onPress={() => onEndlessChange(!endless)}
        >
          <Text style={styles.chipText}>∞ {t('param.endless')}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{t(endless ? endlessHint : durationHint)}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: 6 },
  muted: { color: t.colors.textMuted, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowInput: { flex: 1 },
  input: {
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputInvalid: { borderColor: t.colors.danger },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: t.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  chipActive: { borderColor: t.colors.accent },
  chipText: { color: t.colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: t.colors.textMuted, fontSize: 13 },
  pressed: { opacity: 0.75 },
}));
