import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BRIGHTNESS_DEFAULT, CHASE_DEFAULTS, CHASE_DIRECTIONS, CHASE_LIMITS, PARAM_LIMITS } from '@/catalog/commands';
import { t } from '@/i18n';
import { cleanChaseStep, cleanParam, cleanPause, cleanTail } from '@/project/actions';
import type { ChaseParams } from '@/project/types';
import { makeStyles } from '@/design/ThemeProvider';

import { DurationField } from './DurationField';

type Props = {
  // The chase being changed, if any.
  initial?: ChaseParams;
  // How many lights the chase runs through; it caps the default tail.
  lights: number;
  onDone: (value: ChaseParams) => void;
};

const parse = (text: string) => Number(text.trim().replace(',', '.'));

const DURATION_DEFAULT_SECONDS = 5;

/** The parameters of a chase: brightness, step, direction, tail and duration. */
export function ChaseForm({ initial, lights, onDone }: Props) {
  const styles = useStyles();
  const [brightness, setBrightness] = useState(String(initial?.brightness ?? BRIGHTNESS_DEFAULT));
  const [step, setStep] = useState(String(initial?.step ?? CHASE_DEFAULTS.step));
  const [tail, setTail] = useState(String(initial?.tail ?? Math.min(CHASE_DEFAULTS.tail, lights)));
  const [direction, setDirection] = useState(initial?.direction ?? CHASE_DEFAULTS.direction);
  const [endless, setEndless] = useState(initial?.duration === undefined);
  const [durationText, setDurationText] = useState(String(initial?.duration ?? DURATION_DEFAULT_SECONDS));

  const parsed = {
    brightness: cleanParam('brightness', parse(brightness)),
    step: cleanChaseStep(parse(step)),
    tail: cleanTail(parse(tail)),
    duration: endless ? undefined : cleanPause(parse(durationText)),
  };
  const valid =
    parsed.brightness !== undefined &&
    parsed.step !== undefined &&
    parsed.tail !== undefined &&
    (endless || parsed.duration !== undefined);

  const done = () => {
    if (!valid || parsed.step === undefined || parsed.tail === undefined) return;
    onDone({ brightness: parsed.brightness, step: parsed.step, direction, tail: parsed.tail, duration: parsed.duration });
  };

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.muted}>
          {t('param.brightness')} ({PARAM_LIMITS.brightness.min}–{PARAM_LIMITS.brightness.max})
        </Text>
        <TextInput
          style={[styles.input, parsed.brightness === undefined && styles.inputInvalid]}
          value={brightness}
          onChangeText={setBrightness}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.muted}>{t('chase.direction')}</Text>
        <View style={styles.chips}>
          {CHASE_DIRECTIONS.map((d) => (
            <Pressable
              key={d}
              style={({ pressed }) => [styles.chip, d === direction && styles.chipActive, pressed && styles.pressed]}
              onPress={() => setDirection(d)}
            >
              <Text style={styles.chipText}>{t(`chase.direction.${d}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.muted}>
          {t('chase.step')} ({CHASE_LIMITS.step.min}–{CHASE_LIMITS.step.max})
        </Text>
        <TextInput
          style={[styles.input, parsed.step === undefined && styles.inputInvalid]}
          value={step}
          onChangeText={setStep}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
        <Text style={styles.hint}>{t('chase.stepHint')}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.muted}>
          {t('chase.tail')} ({CHASE_LIMITS.tail.min}–{CHASE_LIMITS.tail.max})
        </Text>
        <TextInput
          style={[styles.input, parsed.tail === undefined && styles.inputInvalid]}
          value={tail}
          onChangeText={setTail}
          keyboardType="number-pad"
          returnKeyType="done"
        />
        <Text style={styles.hint}>{t('chase.tailHint')}</Text>
      </View>

      <DurationField
        endless={endless}
        onEndlessChange={setEndless}
        text={durationText}
        onTextChange={setDurationText}
        valid={parsed.duration !== undefined}
        endlessHint="chase.endlessHint"
        durationHint="chase.durationHint"
      />

      <Pressable
        disabled={!valid}
        style={({ pressed }) => [styles.primary, !valid && styles.disabled, pressed && styles.pressed]}
        onPress={done}
      >
        <Text style={styles.primaryText}>{t('action.done')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: 14 },
  field: { gap: 6 },
  muted: { color: t.colors.textMuted, fontSize: 14 },
  hint: { color: t.colors.textMuted, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  primary: { paddingVertical: 14, borderRadius: 14, backgroundColor: t.colors.accent, alignItems: 'center' },
  primaryText: { color: t.colors.accentText, fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
}));
