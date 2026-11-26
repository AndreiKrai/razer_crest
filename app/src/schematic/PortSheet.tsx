import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBoard, portCount, type PortKind } from '@/catalog/boards';
import { t } from '@/i18n';
import { deviceAt, groupNames, MAX_GROUP_LENGTH, MAX_NAME_LENGTH } from '@/project/devices';
import { useProjects } from '@/project/store';
import type { PlacedBoard, Project } from '@/project/types';
import { KindIcon } from '@/modules/KindIcon';
import { heading, makeStyles, useTheme } from '@/design/ThemeProvider';

type Props = {
  visible: boolean;
  project: Project;
  board: PlacedBoard;
  onClose: () => void;
};

const NEW_KEY = { light: 'ports.new.light', motor: 'ports.new.motor' } as const;
const KIND_KEY = { light: 'ports.kind.light', motor: 'ports.kind.motor' } as const;
const HINT_KEY = { light: 'ports.placeholder.light', motor: 'ports.placeholder.motor' } as const;
const MAX_SUGGESTIONS = 5;

/** All outputs of one board. Tap a free one to attach a named device, tap a used one to rename or remove it. */
export function PortSheet({ visible, project, board, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { addDevice, updateDevice, removeDevice } = useProjects();
  const def = getBoard(board.boardId);
  const kind: PortKind | undefined = def.ports?.kind;
  const count = portCount(def, board.options);
  const accent = theme.category[def.category];

  // Output being edited, counted from 0. The parent remounts this sheet per board (key), so it starts clean.
  const [port, setPort] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const device = port === null ? undefined : deviceAt(project.devices, board.uid, port);
  const [groupFocused, setGroupFocused] = useState(false);
  const typedGroup = group.trim();
  // Existing groups starting with what is typed; all of them while the field is empty. Hidden on an exact match.
  const suggestions = groupNames(project.devices)
    .filter((g) => g.toLowerCase().startsWith(typedGroup.toLowerCase()) && g !== typedGroup)
    .slice(0, MAX_SUGGESTIONS);

  const close = () => {
    setPort(null);
    onClose();
  };

  const open = (index: number) => {
    setPort(index);
    const placed = deviceAt(project.devices, board.uid, index);
    setName(placed?.name ?? '');
    setGroup(placed?.group ?? '');
  };

  const submit = () => {
    if (port === null || !name.trim()) return;
    if (device) updateDevice(project.id, device.id, name, group);
    else if (!addDevice(project.id, board.uid, port, name, group)) return;
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
                  <View style={styles.formHead}>
                    <KindIcon kind={kind} size={22} color={accent} />
                    <Text style={styles.formTitle}>
                      {device
                        ? t('ports.edit', { kind: t(KIND_KEY[kind]), n: port + 1 })
                        : t(NEW_KEY[kind], { n: port + 1 })}
                    </Text>
                  </View>
                  <Text style={styles.label}>{t('ports.nameLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder={t(HINT_KEY[kind])}
                    placeholderTextColor={theme.colors.textMuted}
                    autoFocus
                    maxLength={MAX_NAME_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                  />
                  <Text style={styles.label}>{t('ports.groupLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={group}
                    onChangeText={setGroup}
                    onFocus={() => setGroupFocused(true)}
                    onBlur={() => setGroupFocused(false)}
                    placeholder={t('ports.groupPlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                    maxLength={MAX_GROUP_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                  />
                  {groupFocused && suggestions.length > 0 && (
                    <View style={styles.dropdown}>
                      {suggestions.map((g) => (
                        // onPressIn: on web the input blurs on mouse down, before a normal press would fire.
                        <Pressable key={g} style={styles.dropdownItem} onPressIn={() => setGroup(g)}>
                          <Text style={styles.dropdownText}>{g}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <Text style={styles.hint}>{t('ports.groupHint')}</Text>
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
                        <View style={styles.tileTop}>
                          <Text style={[styles.tileNumber, placed && styles.onAccent]}>{index + 1}</Text>
                          {placed && <KindIcon kind={placed.kind} size={18} color={theme.colors.accentText} />}
                        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: t.colors.text, ...heading(t, 18), flexShrink: 1 },
  close: { color: t.colors.accent, fontSize: 16 },
  empty: { color: t.colors.textMuted, fontSize: 15, paddingHorizontal: 20, paddingVertical: 24 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '22%', minWidth: 72, flexGrow: 1, borderRadius: 12, padding: 10, gap: 2 },
  tileFree: { backgroundColor: t.colors.surfaceRaised, borderWidth: 1, borderColor: t.colors.border, borderStyle: 'dashed' },
  tileSelected: { borderWidth: 2, borderColor: t.colors.accent, borderStyle: 'solid' },
  tileNumber: { color: t.colors.text, fontSize: 18, fontWeight: '700' },
  tileName: { color: t.colors.textMuted, fontSize: 12 },
  onAccent: { color: t.colors.accentText },
  form: {
    backgroundColor: t.colors.surfaceRaised,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  formTitle: { color: t.colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  formHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: t.colors.textMuted, fontSize: 13 },
  hint: { color: t.colors.textMuted, fontSize: 12 },
  dropdown: {
    backgroundColor: t.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  dropdownText: { color: t.colors.text, fontSize: 15 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    backgroundColor: t.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actions: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancel: { borderWidth: 1, borderColor: t.colors.border },
  cancelText: { color: t.colors.text, fontSize: 15, fontWeight: '600' },
  save: { backgroundColor: t.colors.accent },
  saveText: { color: t.colors.accentText, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  remove: { color: t.colors.danger, fontSize: 15, fontWeight: '600', textAlign: 'center', paddingTop: 4 },
}));
