import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { buttonProblem, DEFAULT_PLAY_ICON, MAX_BUTTON_NAME_LENGTH, PLAY_ICONS, type ButtonDraft } from '@/project/play';
import { useProject, useProjects } from '@/project/store';
import type { PlayTarget } from '@/project/types';
import { colors } from '@/theme';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

/** Create (no buttonId) or edit one Play button: its name, icon and the action or scenario it runs. */
export default function PlayButtonScreen() {
  const headerHeight = useHeaderHeight();
  const { id, buttonId } = useLocalSearchParams<{ id: string; buttonId?: string }>();
  const project = useProject(id);
  const { addButton, updateButton, removeButton } = useProjects();
  const insets = useSafeAreaInsets();
  const existing = project?.buttons.find((b) => b.id === buttonId);

  const [draft, setDraft] = useState<ButtonDraft>(() => ({
    name: existing?.name ?? '',
    icon: existing?.icon ?? DEFAULT_PLAY_ICON,
    target: existing?.target ?? null,
  }));
  const patch = (change: Partial<ButtonDraft>) => setDraft((prev) => ({ ...prev, ...change }));

  if (!project || (buttonId && !existing)) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const problem = buttonProblem(draft);

  const save = () => {
    if (problem) return;
    const ok = existing ? updateButton(project.id, existing.id, draft) : addButton(project.id, draft);
    if (ok) router.back();
  };

  // Picking a target also names an unnamed button after it.
  const pick = (target: PlayTarget, name: string) =>
    patch({ target, ...(draft.name.trim() ? {} : { name: name.slice(0, MAX_BUTTON_NAME_LENGTH) }) });

  const isPicked = (target: PlayTarget) => draft.target?.type === target.type && draft.target.id === target.id;

  const targets = (type: PlayTarget['type'], items: { id: string; name: string }[]) =>
    items.map((item) => {
      const target = { type, id: item.id };
      const picked = isPicked(target);
      return (
        <Pressable
          key={type + item.id}
          style={({ pressed }) => [styles.target, picked && styles.picked, pressed && styles.pressed]}
          onPress={() => pick(target, item.name)}
        >
          <Text style={styles.targetText}>{item.name}</Text>
          {picked && <MaterialCommunityIcons name="check" size={20} color={colors.accent} />}
        </Pressable>
      );
    });

  return (
    <View style={[styles.container, { paddingTop: headerHeight }]}>
      <Stack.Screen options={{ title: t(existing ? 'playButton.editTitle' : 'playButton.newTitle') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('action.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(name) => patch({ name })}
          placeholder={t('playButton.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_BUTTON_NAME_LENGTH}
          returnKeyType="done"
        />

        <Text style={styles.label}>{t('playButton.icon')}</Text>
        <View style={styles.icons}>
          {PLAY_ICONS.map((icon) => (
            <Pressable
              key={icon}
              accessibilityLabel={icon}
              style={({ pressed }) => [styles.icon, draft.icon === icon && styles.picked, pressed && styles.pressed]}
              onPress={() => patch({ icon })}
            >
              <MaterialCommunityIcons
                name={icon as Icon}
                size={28}
                color={draft.icon === icon ? colors.accent : colors.text}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('playButton.target')}</Text>
        {project.actions.length > 0 && <Text style={styles.section}>{t('hub.actions.title')}</Text>}
        {targets('action', project.actions)}
        {project.scenarios.length > 0 && <Text style={styles.section}>{t('hub.scenarios.title')}</Text>}
        {targets('scenario', project.scenarios)}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        {existing && (
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => {
              removeButton(project.id, existing.id);
              router.back();
            }}
          >
            <Text style={styles.dangerText}>{t('playButton.delete')}</Text>
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
  section: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
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
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  picked: { borderColor: colors.accent, backgroundColor: colors.surfaceRaised },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
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
