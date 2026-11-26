import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHASE_MIN_LIGHTS } from '@/catalog/commands';
import { t } from '@/i18n';
import type { ChaseStep, Project } from '@/project/types';
import { heading, makeStyles, useTheme } from '@/design/ThemeProvider';

import { ChaseForm } from './ChaseForm';
import { ModuleGroupList } from './ModuleGroupList';

type Props = {
  project: Project;
  // Lights the action already uses elsewhere; they can't be picked again.
  takenIds: ReadonlySet<string>;
  // Set when changing a chase of an action: opens at its parameters.
  editing?: ChaseStep;
  // Set for a sequence: only the lights are chosen (their chase goes into slots).
  onPickLights?: (deviceIds: string[]) => void;
  onPick?: (chase: ChaseStep) => void;
  onClose: () => void;
};

/** Two steps in one sheet: tap several lights in running order, then set up the chase over them. */
export function GroupPicker({ project, takenIds, editing, onPickLights, onPick, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [ids, setIds] = useState<string[]>(editing?.deviceIds ?? []);
  const [stage, setStage] = useState<'lights' | 'form'>(editing ? 'form' : 'lights');

  const toggle = (id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  const enough = ids.length >= CHASE_MIN_LIGHTS;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            {stage === 'form' && (
              <Pressable onPress={() => setStage('lights')} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={theme.colors.accent} />
              </Pressable>
            )}
            <Text style={styles.title}>{t(stage === 'lights' ? 'chase.pickLights' : 'chase.title')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {stage === 'lights' ? (
              <>
                <Text style={styles.muted}>{t('chase.pickHint', { min: CHASE_MIN_LIGHTS })}</Text>
                <ModuleGroupList
                  project={project}
                  kind="light"
                  expanded
                  order={ids}
                  disabledIds={takenIds}
                  onSelect={(device) => toggle(device.id)}
                />
                <Pressable
                  disabled={!enough}
                  style={({ pressed }) => [styles.primary, !enough && styles.disabled, pressed && styles.pressed]}
                  onPress={() => (onPickLights ? onPickLights(ids) : setStage('form'))}
                >
                  <Text style={styles.primaryText}>
                    {t(onPickLights ? 'action.done' : 'chase.next')} · {t('chase.chosen', { count: ids.length })}
                  </Text>
                </Pressable>
              </>
            ) : (
              <ChaseForm initial={editing} lights={ids.length} onDone={(value) => onPick?.({ deviceIds: ids, ...value })} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: t.colors.backdrop },
  sheet: {
    maxHeight: '85%',
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: t.colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  title: { flex: 1, color: t.colors.text, ...heading(t, 18) },
  close: { color: t.colors.accent, fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
  muted: { color: t.colors.textMuted, fontSize: 14 },
  primary: { paddingVertical: 14, borderRadius: 14, backgroundColor: t.colors.accent, alignItems: 'center' },
  primaryText: { color: t.colors.accentText, fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
}));
