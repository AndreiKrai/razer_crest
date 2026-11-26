import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import type { ActionStep, Device, Project } from '@/project/types';
import { heading, makeStyles, useTheme } from '@/design/ThemeProvider';

import { CommandForm } from './CommandForm';
import { KindIcon } from './KindIcon';
import { ModuleGroupList } from './ModuleGroupList';

type Props = {
  project: Project;
  // Modules the action already uses; they can't be picked again.
  takenIds: ReadonlySet<string>;
  // Set when editing a step: skips the module list and starts at its commands.
  editing?: ActionStep & { device: Device };
  // Set for a sequence: only the module is chosen (its commands go into slots).
  onPickModule?: (device: Device) => void;
  onPick?: (step: ActionStep) => void;
  onClose: () => void;
};

/** Two steps in one sheet: choose a module from the grouped list, then one of its commands (and its parameters). */
export function ModulePicker({ project, takenIds, editing, onPickModule, onPick, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [device, setDevice] = useState<Device | null>(editing?.device ?? null);

  const select = (picked: Device) => (onPickModule ? onPickModule(picked) : setDevice(picked));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            {device && !editing && (
              <Pressable onPress={() => setDevice(null)} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={theme.colors.accent} />
              </Pressable>
            )}
            <Text style={styles.title}>{device ? device.name : t('action.pickModule')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {device ? (
              <>
                <View style={styles.kind}>
                  <KindIcon kind={device.kind} color={theme.colors.accent} />
                  <Text style={styles.muted}>{t('action.pickCommand')}</Text>
                </View>
                <CommandForm
                  kind={device.kind}
                  initial={editing && device.id === editing.deviceId ? editing : undefined}
                  onDone={(value) => onPick?.({ deviceId: device.id, ...value })}
                />
              </>
            ) : (
              <ModuleGroupList project={project} disabledIds={takenIds} onSelect={select} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { flex: 1, color: t.colors.text, ...heading(t, 18) },
  close: { color: t.colors.accent, fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muted: { color: t.colors.textMuted, fontSize: 14 },
}));
