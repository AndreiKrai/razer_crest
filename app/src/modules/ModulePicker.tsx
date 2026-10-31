import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COMMANDS, type CommandId } from '@/catalog/commands';
import { t } from '@/i18n';
import type { ActionStep, Device, Project } from '@/project/types';
import { colors } from '@/theme';

import { KindIcon } from './KindIcon';
import { ModuleGroupList } from './ModuleGroupList';

type Props = {
  project: Project;
  // Modules the action already uses; they can't be picked again.
  takenIds: ReadonlySet<string>;
  // Set when editing a step: skips the module list and starts at its commands.
  editing?: ActionStep & { device: Device };
  onPick: (step: ActionStep) => void;
  onClose: () => void;
};

/** Two steps in one sheet: choose a module from the grouped list, then one of its commands. */
export function ModulePicker({ project, takenIds, editing, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [device, setDevice] = useState<Device | null>(editing?.device ?? null);
  const current: CommandId | undefined = editing && device?.id === editing.deviceId ? editing.command : undefined;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            {device && !editing && (
              <Pressable onPress={() => setDevice(null)} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={colors.accent} />
              </Pressable>
            )}
            <Text style={styles.title}>{device ? device.name : t('action.pickModule')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {device ? (
              <>
                <View style={styles.kind}>
                  <KindIcon kind={device.kind} color={colors.accent} />
                  <Text style={styles.muted}>{t('action.pickCommand')}</Text>
                </View>
                <View style={styles.chips}>
                  {COMMANDS[device.kind].map((command) => (
                    <Pressable
                      key={command}
                      style={({ pressed }) => [styles.chip, command === current && styles.chipActive, pressed && styles.pressed]}
                      onPress={() => onPick({ deviceId: device.id, command })}
                    >
                      <Text style={styles.chipText}>{t(`command.${command}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <ModuleGroupList project={project} disabledIds={takenIds} onSelect={setDevice} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' },
  close: { color: colors.accent, fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  pressed: { opacity: 0.75 },
});
