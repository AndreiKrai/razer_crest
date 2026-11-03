import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PortKind } from '@/catalog/boards';
import {
  BRIGHTNESS_DEFAULT,
  COMMAND_PARAMS,
  COMMANDS,
  FREQUENCY_DEFAULT,
  PARAM_LIMITS,
  SPEED_DEFAULT,
  type CommandId,
  type ParamId,
} from '@/catalog/commands';
import { t } from '@/i18n';
import { cleanParam } from '@/project/actions';
import type { ActionStep } from '@/project/types';
import { colors } from '@/theme';

/** A command with its parameters, without the module it is for. */
export type CommandValue = Omit<ActionStep, 'deviceId'>;

type Props = {
  kind: PortKind;
  // The command being changed, if any.
  initial?: CommandValue;
  onDone: (value: CommandValue) => void;
};

const parse = (text: string) => Number(text.trim().replace(',', '.'));

/** The commands of a kind as chips. A command without parameters is picked on tap; one with parameters shows fields and Done. */
export function CommandForm({ kind, initial, onDone }: Props) {
  // The command being set up; commands without parameters are picked on tap and never get here.
  const [command, setCommand] = useState<CommandId | null>(
    initial && COMMAND_PARAMS[initial.command] ? initial.command : null,
  );
  const [text, setText] = useState<Record<ParamId, string>>({
    brightness: String(initial?.brightness ?? BRIGHTNESS_DEFAULT),
    frequency: String(initial?.frequency ?? (initial && FREQUENCY_DEFAULT[initial.command]) ?? 2),
    speed: String(initial?.speed ?? SPEED_DEFAULT),
  });
  const params = command ? (COMMAND_PARAMS[command] ?? []) : [];

  const choose = (next: CommandId) => {
    if (!COMMAND_PARAMS[next]) {
      onDone({ command: next });
      return;
    }
    setCommand(next);
    const frequency = FREQUENCY_DEFAULT[next];
    if (frequency !== undefined && next !== command) setText((prev) => ({ ...prev, frequency: String(frequency) }));
  };

  const parsed = Object.fromEntries(params.map((p) => [p, cleanParam(p, parse(text[p]))])) as Partial<
    Record<ParamId, number | undefined>
  >;
  const valid = params.every((p) => parsed[p] !== undefined);

  const done = () => {
    if (!command || !valid) return;
    onDone({ command, brightness: parsed.brightness, frequency: parsed.frequency, speed: parsed.speed });
  };

  return (
    <View style={styles.form}>
      <View style={styles.chips}>
        {COMMANDS[kind].map((c) => (
          <Pressable
            key={c}
            style={({ pressed }) => [
              styles.chip,
              (command ? c === command : c === initial?.command) && styles.chipActive,
              pressed && styles.pressed,
            ]}
            onPress={() => choose(c)}
          >
            <Text style={styles.chipText}>{t(`command.${c}`)}</Text>
          </Pressable>
        ))}
      </View>
      {params.map((p) => (
        <View key={p} style={styles.field}>
          <Text style={styles.muted}>
            {t(`param.${p}`)} ({PARAM_LIMITS[p].min}–{PARAM_LIMITS[p].max})
          </Text>
          <TextInput
            style={[styles.input, parsed[p] === undefined && styles.inputInvalid]}
            value={text[p]}
            onChangeText={(value) => setText((prev) => ({ ...prev, [p]: value }))}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>
      ))}
      {command && (
        <Pressable
          disabled={!valid}
          style={({ pressed }) => [styles.primary, !valid && styles.disabled, pressed && styles.pressed]}
          onPress={done}
        >
          <Text style={styles.primaryText}>{t('action.done')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  muted: { color: colors.textMuted, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  field: { gap: 6 },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputInvalid: { borderColor: colors.danger },
  primary: { paddingVertical: 14, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center' },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
