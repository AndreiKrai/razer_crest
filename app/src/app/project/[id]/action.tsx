import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { KindIcon } from '@/modules/KindIcon';
import { ModulePicker } from '@/modules/ModulePicker';
import { actionProblem, MAX_ACTION_NAME_LENGTH } from '@/project/actions';
import { useProject, useProjects } from '@/project/store';
import type { ActionStep } from '@/project/types';
import { colors } from '@/theme';

/** Create (no actionId) or edit an action: a name plus one command for each module it uses. */
export default function ActionEditScreen() {
  const { id, actionId } = useLocalSearchParams<{ id: string; actionId?: string }>();
  const project = useProject(id);
  const { addAction, updateAction, removeAction } = useProjects();
  const insets = useSafeAreaInsets();
  const existing = project?.actions.find((a) => a.id === actionId);

  const [name, setName] = useState(existing?.name ?? '');
  const [steps, setSteps] = useState<ActionStep[]>(existing?.steps ?? []);
  // null = closed; 'add' = choosing a module; a device id = changing that step's command.
  const [picker, setPicker] = useState<'add' | string | null>(null);

  if (!project || (actionId && !existing)) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const valid = !actionProblem(name, steps);
  const editing = picker && picker !== 'add' ? steps.find((s) => s.deviceId === picker) : undefined;
  const editingDevice = editing ? project.devices.find((d) => d.id === editing.deviceId) : undefined;

  const pick = (step: ActionStep) => {
    setSteps((prev) =>
      prev.some((s) => s.deviceId === step.deviceId)
        ? prev.map((s) => (s.deviceId === step.deviceId ? step : s))
        : [...prev, step],
    );
    setPicker(null);
  };

  const save = () => {
    if (!valid) return;
    const ok = existing ? updateAction(project.id, existing.id, name, steps) : addAction(project.id, name, steps);
    if (ok) router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t(existing ? 'action.editTitle' : 'action.newTitle') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('action.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('action.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_ACTION_NAME_LENGTH}
          returnKeyType="done"
        />

        <Text style={styles.label}>{t('action.stepsLabel')}</Text>
        {steps.length === 0 && <Text style={styles.muted}>{t('action.noSteps')}</Text>}
        {steps.map((step) => {
          const device = project.devices.find((d) => d.id === step.deviceId);
          if (!device) return null;
          return (
            <View key={step.deviceId} style={styles.step}>
              <Pressable style={styles.stepMain} onPress={() => setPicker(step.deviceId)}>
                <KindIcon kind={device.kind} color={colors.accent} />
                <View style={styles.stepText}>
                  <Text style={styles.stepName}>{device.name}</Text>
                  <Text style={styles.muted}>
                    {t(`command.${step.command}`)}
                    {device.group ? ` · ${device.group}` : ''}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={() => setSteps((prev) => prev.filter((s) => s.deviceId !== step.deviceId))}
              >
                <Ionicons name="close" size={22} color={colors.danger} />
              </Pressable>
            </View>
          );
        })}
        <Pressable
          style={({ pressed }) => [styles.addModule, pressed && styles.pressed]}
          onPress={() => setPicker('add')}
        >
          <Text style={styles.addModuleText}>+ {t('action.addModule')}</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        {existing && (
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => {
              removeAction(project.id, existing.id);
              router.back();
            }}
          >
            <Text style={styles.dangerText}>{t('action.delete')}</Text>
          </Pressable>
        )}
        <Pressable
          disabled={!valid}
          style={({ pressed }) => [styles.primary, !valid && styles.disabled, pressed && styles.pressed]}
          onPress={save}
        >
          <Text style={styles.primaryText}>{t('ports.save')}</Text>
        </Pressable>
      </View>

      {picker === 'add' && (
        <ModulePicker
          project={project}
          takenIds={new Set(steps.map((s) => s.deviceId))}
          onPick={pick}
          onClose={() => setPicker(null)}
        />
      )}
      {editing && editingDevice && (
        <ModulePicker
          project={project}
          takenIds={new Set()}
          editing={{ ...editing, device: editingDevice }}
          onPick={pick}
          onClose={() => setPicker(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: 16, gap: 10 },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  muted: { color: colors.textMuted, fontSize: 14 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepText: { flex: 1, gap: 2 },
  stepName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  addModule: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
  },
  addModuleText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  bar: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  primary: { paddingVertical: 14, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center' },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  secondary: { paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dangerText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
