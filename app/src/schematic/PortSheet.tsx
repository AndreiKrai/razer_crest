import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBoard, portCount, type PortKind } from '@/catalog/boards';
import { t } from '@/i18n';
import { deviceAt, MAX_NAME_LENGTH } from '@/project/devices';
import { useProjects } from '@/project/store';
import type { PlacedBoard, Project } from '@/project/types';
import { categoryColors, colors } from '@/theme';

type Props = {
  visible: boolean;
  project: Project;
  board: PlacedBoard;
  onClose: () => void;
};

const NEW_KEY = { light: 'ports.new.light', motor: 'ports.new.motor' } as const;
const KIND_KEY = { light: 'ports.kind.light', motor: 'ports.kind.motor' } as const;
const HINT_KEY = { light: 'ports.placeholder.light', motor: 'ports.placeholder.motor' } as const;

/** All outputs of one board. Tap a free one to attach a named device, tap a used one to rename or remove it. */
export function PortSheet({ visible, project, board, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addDevice, renameDevice, removeDevice } = useProjects();
  const def = getBoard(board.boardId);
  const kind: PortKind | undefined = def.ports?.kind;
  const count = portCount(def, board.options);
  const accent = categoryColors[def.category];

  // Output being edited, counted from 0. The parent remounts this sheet per board (key), so it starts clean.
  const [port, setPort] = useState<number | null>(null);
  const [name, setName] = useState('');
  const device = port === null ? undefined : deviceAt(project.devices, board.uid, port);

  const close = () => {
    setPort(null);
    onClose();
  };

  const open = (index: number) => {
    setPort(index);
    setName(deviceAt(project.devices, board.uid, index)?.name ?? '');
  };

  const submit = () => {
    if (port === null || !name.trim()) return;
    if (device) renameDevice(project.id, device.id, name);
    else if (!addDevice(project.id, board.uid, port, name)) return;
    setPort(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('ports.title', { board: t(def.nameKey) })}</Text>
            <Pressable onPress={close} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>

          {!kind || count === 0 ? (
            <Text style={styles.empty}>{t('ports.none')}</Text>
          ) : (
            <>
              {/* The form sits above the grid so it stays visible, also with the keyboard open. */}
              {port !== null && (
                <View style={styles.form}>
                  <Text style={styles.formTitle}>
                    {device
                      ? t('ports.edit', { kind: t(KIND_KEY[kind]), n: port + 1 })
                      : t(NEW_KEY[kind], { n: port + 1 })}
                  </Text>
                  <Text style={styles.label}>{t('ports.nameLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder={t(HINT_KEY[kind])}
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    maxLength={MAX_NAME_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                  />
                  <View style={styles.actions}>
                    <Pressable style={[styles.button, styles.cancel]} onPress={() => setPort(null)}>
                      <Text style={styles.cancelText}>{t('ports.cancel')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.button, styles.save, !name.trim() && styles.disabled]}
                      disabled={!name.trim()}
                      onPress={submit}
                    >
                      <Text style={styles.saveText}>{device ? t('ports.save') : t('ports.add')}</Text>
                    </Pressable>
                  </View>
                  {device && (
                    <Pressable
                      onPress={() => {
                        removeDevice(project.id, device.id);
                        setPort(null);
                      }}
                    >
                      <Text style={styles.remove}>{t('ports.remove')}</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.grid}>
                  {Array.from({ length: count }, (_, index) => {
                    const placed = deviceAt(project.devices, board.uid, index);
                    return (
                      <Pressable
                        key={index}
                        onPress={() => open(index)}
                        style={[
                          styles.tile,
                          placed ? { backgroundColor: accent } : styles.tileFree,
                          port === index && styles.tileSelected,
                        ]}
                      >
                        <Text style={[styles.tileNumber, placed && styles.onAccent]}>{index + 1}</Text>
                        <Text style={[styles.tileName, placed && styles.onAccent]} numberOfLines={1}>
                          {placed ? placed.name : t('ports.free')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  close: { color: colors.accent, fontSize: 16 },
  empty: { color: colors.textMuted, fontSize: 15, paddingHorizontal: 20, paddingVertical: 24 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '22%', minWidth: 72, flexGrow: 1, borderRadius: 12, padding: 10, gap: 2 },
  tileFree: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  tileSelected: { borderWidth: 2, borderColor: colors.accent, borderStyle: 'solid' },
  tileNumber: { color: colors.text, fontSize: 18, fontWeight: '700' },
  tileName: { color: colors.textMuted, fontSize: 12 },
  onAccent: { color: colors.accentText },
  form: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  formTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 13 },
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
  actions: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancel: { borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  save: { backgroundColor: colors.accent },
  saveText: { color: colors.accentText, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  remove: { color: colors.danger, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingTop: 4 },
});
