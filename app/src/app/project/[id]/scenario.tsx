import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { ScenarioEditor } from '@/modules/ScenarioEditor';
import {
  MAX_SCENARIO_ACTIONS,
  MAX_SCENARIO_NAME_LENGTH,
  scenarioProblem,
  type ScenarioDraft,
} from '@/project/scenarios';
import { useProject, useProjects } from '@/project/store';
import { colors } from '@/theme';

/** Create (no scenarioId) or edit a scenario: rows of existing actions and pauses. */
export default function ScenarioEditScreen() {
  const { id, scenarioId } = useLocalSearchParams<{ id: string; scenarioId?: string }>();
  const project = useProject(id);
  const { addScenario, updateScenario, removeScenario } = useProjects();
  const insets = useSafeAreaInsets();
  const existing = project?.scenarios.find((s) => s.id === scenarioId);

  const [draft, setDraft] = useState<ScenarioDraft>(() => ({
    name: existing?.name ?? '',
    exclusive: existing?.exclusive ?? false,
    loop: existing?.loop ?? false,
    rows: existing?.rows ?? [],
  }));
  const patch = (change: Partial<ScenarioDraft>) => setDraft((prev) => ({ ...prev, ...change }));

  if (!project || (scenarioId && !existing)) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const problem = scenarioProblem(draft, project.actions);

  const save = () => {
    if (problem) return;
    const ok = existing ? updateScenario(project.id, existing.id, draft) : addScenario(project.id, draft);
    if (ok) router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t(existing ? 'scenario.editTitle' : 'scenario.newTitle') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('action.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(name) => patch({ name })}
          placeholder={t('scenario.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_SCENARIO_NAME_LENGTH}
          returnKeyType="done"
        />

        <Text style={styles.label}>{t('scenario.rowsLabel')}</Text>
        <Text style={styles.muted}>{t('scenario.hint')}</Text>
        <ScenarioEditor project={project} rows={draft.rows} onChange={(rows) => patch({ rows })} />

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('sequence.loop')}</Text>
            <Text style={styles.muted}>{t('sequence.loopHint')}</Text>
          </View>
          <Switch value={draft.loop} onValueChange={(loop) => patch({ loop })} />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>{t('action.exclusive')}</Text>
            <Text style={styles.muted}>{t('scenario.exclusiveHint')}</Text>
          </View>
          <Switch value={draft.exclusive} onValueChange={(exclusive) => patch({ exclusive })} />
        </View>
        {problem === 'noTime' && <Text style={styles.warning}>{t('scenario.noTime')}</Text>}
        {problem === 'tooManyActions' && (
          <Text style={styles.warning}>{t('scenario.tooManyActions', { count: MAX_SCENARIO_ACTIONS })}</Text>
        )}
        {problem === 'noActions' && draft.rows.length > 0 && <Text style={styles.warning}>{t('scenario.needAction')}</Text>}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        {existing && (
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => {
              removeScenario(project.id, existing.id);
              router.back();
            }}
          >
            <Text style={styles.dangerText}>{t('scenario.delete')}</Text>
          </Pressable>
        )}
        <Pressable
          disabled={problem !== null}
          style={({ pressed }) => [styles.primary, problem !== null && styles.disabled, pressed && styles.pressed]}
          onPress={save}
        >
          <Text style={styles.primaryText}>{t('ports.save')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: 16, gap: 10 },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  switchText: { flex: 1, gap: 2 },
  switchTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
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
