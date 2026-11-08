import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { cleanPause, PAUSE_LIMITS } from '@/project/actions';
import type { GroupSlot } from '@/project/types';
import { colors } from '@/theme';

import { ChaseForm } from './ChaseForm';

type Props = {
  // Set when changing a slot; absent when adding one.
  initial?: GroupSlot;
  // How many lights the row has.
  lights: number;
  onSave: (slot: GroupSlot) => void;
  onDelete?: () => void;
  onClose: () => void;
};

/** One slot of a group row: a pause, a chase over the row's lights, or off for all of them. */
export function GroupSlotSheet({ initial, lights, onSave, onDelete, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<GroupSlot['type']>(initial?.type ?? 'pause');
  const [seconds, setSeconds] = useState(String(initial?.type === 'pause' ? initial.seconds : 1));
  const parsed = cleanPause(Number(seconds.trim().replace(',', '.')));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t(initial ? 'sequence.editSlot' : 'sequence.addSlot')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.tabs}>
              {(['pause', 'chase', 'off'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.tab, tab === type && styles.tabActive]}
                  onPress={() => setType(tab)}
                >
                  <Text style={styles.tabText}>{t(tab === 'chase' ? 'chase.title' : `sequence.${tab}`)}</Text>
                </Pressable>
              ))}
            </View>

            {type === 'pause' && (
              <View style={styles.field}>
                <Text style={styles.muted}>
                  {t('sequence.pauseLabel')} ({PAUSE_LIMITS.min}–{PAUSE_LIMITS.max})
                </Text>
                <TextInput
                  style={[styles.input, parsed === undefined && styles.inputInvalid]}
                  value={seconds}
                  onChangeText={setSeconds}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Pressable
                  disabled={parsed === undefined}
                  style={({ pressed }) => [styles.primary, parsed === undefined && styles.disabled, pressed && styles.pressed]}
                  onPress={() => parsed !== undefined && onSave({ type: 'pause', seconds: parsed })}
                >
                  <Text style={styles.primaryText}>{t('action.done')}</Text>
                </Pressable>
              </View>
            )}
            {type === 'chase' && (
              <ChaseForm
                initial={initial?.type === 'chase' ? initial : undefined}
                lights={lights}
                onDone={(value) => onSave({ type: 'chase', ...value })}
              />
            )}
            {type === 'off' && (
              <View style={styles.field}>
                <Text style={styles.muted}>{t('sequence.offHint')}</Text>
                <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => onSave({ type: 'off' })}>
                  <Text style={styles.primaryText}>{t('action.done')}</Text>
                </Pressable>
              </View>
            )}

            {onDelete && (
              <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={onDelete}>
                <Text style={styles.dangerText}>{t('sequence.deleteSlot')}</Text>
              </Pressable>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  title: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' },
  close: { color: colors.accent, fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { borderColor: colors.accent },
  tabText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  field: { gap: 10 },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputInvalid: { borderColor: colors.danger },
  primary: { paddingVertical: 14, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center' },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  secondary: { paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  dangerText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
