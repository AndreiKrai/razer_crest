import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { actionCycleMs, cleanPause, PAUSE_LIMITS } from '@/project/actions';
import { defaultRunMs, isOpenAction } from '@/project/scenarios';
import type { Action, ScenarioSlot } from '@/project/types';
import { colors } from '@/theme';

import { ActionList } from './ActionList';

type Props = {
  actions: Action[];
  // Set when changing a slot; absent when adding one.
  initial?: ScenarioSlot;
  // The slot is (or will be) the last of its row: only then an action can run endless.
  isLast: boolean;
  onSave: (slot: ScenarioSlot) => void;
  onDelete?: () => void;
  onClose: () => void;
};

const toSeconds = (ms: number) => Math.round(ms / 10) / 100;

/**
 * One slot of a scenario row: a pause, or an action to start. An action that ends by itself is saved as soon as it is
 * picked; one with no end of its own asks how long it runs before the next slot takes over.
 */
export function ScenarioSlotSheet({ actions, initial, isLast, onSave, onDelete, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ScenarioSlot['type']>(initial?.type ?? 'action');
  const [seconds, setSeconds] = useState(String(initial?.type === 'pause' ? initial.seconds : 1));
  const parsed = cleanPause(Number(seconds.trim().replace(',', '.')));

  const initialAction = initial?.type === 'action' ? actions.find((a) => a.id === initial.actionId) : undefined;
  // The open action whose run time is being set.
  const [picked, setPicked] = useState<Action | null>(initialAction && isOpenAction(initialAction) ? initialAction : null);
  const initialSlot = initial?.type === 'action' ? initial : undefined;
  const [runFor, setRunFor] = useState(
    String(initialSlot?.runFor ?? (initialAction ? toSeconds(defaultRunMs(initialAction)) : 1)),
  );
  const [endless, setEndless] = useState(isLast && initialSlot?.endless === true);
  const parsedRun = cleanPause(Number(runFor.trim().replace(',', '.')));

  const choose = (action: Action) => {
    if (!isOpenAction(action)) {
      onSave({ type: 'action', actionId: action.id });
      return;
    }
    setRunFor(String(toSeconds(defaultRunMs(action))));
    setEndless(false);
    setPicked(action);
  };

  const saveOpen = () => {
    if (!picked) return;
    if (endless) {
      onSave({ type: 'action', actionId: picked.id, endless: true });
      return;
    }
    if (parsedRun === undefined) return;
    // The default isn't stored, so it follows the action if the action changes.
    const isDefault = Math.round(parsedRun * 1000) === defaultRunMs(picked);
    onSave({ type: 'action', actionId: picked.id, ...(!isDefault && { runFor: parsedRun }) });
  };

  const cycleMs = picked ? actionCycleMs(picked) : 0;
  const runInvalid = !endless && parsedRun === undefined;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t(initial ? 'scenario.editSlot' : 'scenario.addSlot')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.tabs}>
              {(['action', 'pause'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.tab, tab === type && styles.tabActive]}
                  onPress={() => setType(tab)}
                >
                  <Text style={styles.tabText}>{t(tab === 'pause' ? 'sequence.pause' : 'scenario.action')}</Text>
                </Pressable>
              ))}
            </View>

            {type === 'pause' ? (
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
            ) : picked ? (
              <View style={styles.field}>
                <Text style={styles.name}>{picked.name}</Text>
                <Text style={styles.muted}>
                  {cycleMs > 0
                    ? t('scenario.cycleNote', { value: toSeconds(cycleMs) })
                    : t('scenario.openNote')}
                </Text>
                {isLast && (
                  <View style={styles.switchRow}>
                    <View style={styles.switchText}>
                      <Text style={styles.switchTitle}>{t('scenario.endless')}</Text>
                      <Text style={styles.muted}>{t('scenario.endlessHint')}</Text>
                    </View>
                    <Switch value={endless} onValueChange={setEndless} />
                  </View>
                )}
                {!endless && (
                  <>
                    <Text style={styles.muted}>
                      {t('scenario.runFor')} ({PAUSE_LIMITS.min}–{PAUSE_LIMITS.max})
                    </Text>
                    <TextInput
                      style={[styles.input, runInvalid && styles.inputInvalid]}
                      value={runFor}
                      onChangeText={setRunFor}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                    <Text style={styles.muted}>{t('scenario.runForHint')}</Text>
                  </>
                )}
                <Pressable
                  disabled={runInvalid}
                  style={({ pressed }) => [styles.primary, runInvalid && styles.disabled, pressed && styles.pressed]}
                  onPress={saveOpen}
                >
                  <Text style={styles.primaryText}>{t('action.done')}</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={() => setPicked(null)}>
                  <Text style={styles.linkText}>{t('scenario.changeAction')}</Text>
                </Pressable>
              </View>
            ) : (
              <ActionList actions={actions} onSelect={choose} />
            )}

            {onDelete && (
              <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={onDelete}>
                <Text style={styles.dangerText}>{t('scenario.deleteSlot')}</Text>
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
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1, gap: 2 },
  switchTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  linkText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
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
