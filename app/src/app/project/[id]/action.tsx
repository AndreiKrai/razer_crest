import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { describeCommand } from '@/modules/describe';
import { KindIcon } from '@/modules/KindIcon';
import { ModulePicker } from '@/modules/ModulePicker';
import { SequenceEditor } from '@/modules/SequenceEditor';
import { actionProblem, isSequence, MAX_ACTION_NAME_LENGTH, type ActionDraft } from '@/project/actions';
import { useProject, useProjects } from '@/project/store';
import type { ActionStep } from '@/project/types';
import { colors } from '@/theme';

/** Create (no actionId) or edit an action or a sequence; which one is chosen when it is created and stays. */
export default function ActionEditScreen() {
  const { id, actionId } = useLocalSearchParams<{ id: string; actionId?: string }>();
  const project = useProject(id);
  const { addAction, updateAction, removeAction } = useProjects();
  const insets = useSafeAreaInsets();
  const existing = project?.actions.find((a) => a.id === actionId);

  const [draft, setDraft] = useState<ActionDraft>(() => ({
    name: existing?.name ?? '',
    exclusive: existing?.exclusive ?? false,
    mode: existing && isSequence(existing) ? 'sequence' : 'action',
    steps: existing && !isSequence(existing) ? existing.steps : [],
    rows: existing && isSequence(existing) ? existing.rows : [],
    loop: existing && isSequence(existing) ? (existing.loop ?? false) : false,
  }));
  const patch = (change: Partial<ActionDraft>) => setDraft((prev) => ({ ...prev, ...change }));
  // null = closed; 'add' = choosing a module; a device id = changing that step's command.
  const [picker, setPicker] = useState<'add' | string | null>(null);

  if (!project || (actionId && !existing)) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const problem = actionProblem(draft);
  const valid = !problem;
  const { steps } = draft;
  const editing = picker && picker !== 'add' ? steps.find((s) => s.deviceId === picker) : undefined;
  const editingDevice = editing ? project.devices.find((d) => d.id === editing.deviceId) : undefined;

  const pick = (step: ActionStep) => {
    patch({
      steps: steps.some((s) => s.deviceId === step.deviceId)
        ? steps.map((s) => (s.deviceId === step.deviceId ? step : s))
        : [...steps, step],
    });
    setPicker(null);
  };

  const save = () => {
    if (!valid) return;
    const ok = existing ? updateAction(project.id, existing.id, draft) : addAction(project.id, draft);
    if (ok) router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t(existing ? 'action.editTitle' : 'action.newTitle') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!existing && (
          <View style={styles.tabs}>
            {(['action', 'sequence'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[styles.tab, draft.mode === mode && styles.tabActive]}
                onPress={() => patch({ mode })}
              >
                <Text style={styles.tabText}>{t(`action.mode.${mode}`)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>{t('action.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(name) => patch({ name })}
          placeholder={t('action.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_ACTION_NAME_LENGTH}
          returnKeyType="done"
        />

        <Text style={styles.label}>{t(draft.mode === 'sequence' ? 'sequence.label' : 'action.stepsLabel')}</Text>
        {draft.mode === 'sequence' ? (
          <SequenceEditor project={project} rows={draft.rows} onChange={(rows) => patch({ rows })} />
        ) : (
          <>
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
                        {[describeCommand(step), device.group].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable hitSlop={10} onPress={() => patch({ steps: steps.filter((s) => s.deviceId !== step.deviceId) })}>
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
          </>
        )}

        {draft.mode === 'sequence' && (
          <View style={styles.switchRow}>
            <View style={styles.stepText}>
              <Text style={styles.stepName}>{t('sequence.loop')}</Text>
              <Text style={styles.muted}>{t('sequence.loopHint')}</Text>
            </View>
            <Switch value={draft.loop} onValueChange={(loop) => patch({ loop })} />
          </View>
        )}
        <View style={styles.switchRow}>
          <View style={styles.stepText}>
            <Text style={styles.stepName}>{t('action.exclusive')}</Text>
            <Text style={styles.muted}>{t('action.exclusiveHint')}</Text>
          </View>
          <Switch value={draft.exclusive} onValueChange={(exclusive) => patch({ exclusive })} />
        </View>
        {problem === 'noTime' && <Text style={styles.warning}>{t('sequence.noTime')}</Text>}
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
  tabs: { flexDirection: 'row', gap: 10 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { borderColor: colors.accent },
  tabText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  muted: { color: colors.textMuted, fontSize: 14 },
  warning: { color: colors.danger, fontSize: 13 },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
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
