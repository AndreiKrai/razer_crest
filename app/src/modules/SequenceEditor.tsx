import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { sequenceDurationMs } from '@/project/actions';
import type { Device, Project, SequenceRow, Slot } from '@/project/types';
import { colors } from '@/theme';

import { describeCommand, describeDuration } from './describe';
import { KindIcon } from './KindIcon';
import { ModulePicker } from './ModulePicker';
import { SlotSheet } from './SlotSheet';

type Props = {
  project: Project;
  rows: SequenceRow[];
  onChange: (rows: SequenceRow[]) => void;
};

const ROW_HEIGHT = 48;
const DEFAULT_PAUSE_SECONDS = 1;

const seconds = (ms: number) => String(Math.round(ms / 10) / 100);

/** The timeline of a sequence: a row per module, its slots from left to right (they scroll sideways together). */
export function SequenceEditor({ project, rows, onChange }: Props) {
  const [picking, setPicking] = useState(false);
  // Which slot is open: its row and index, or index -1 for a new slot at the end of the row.
  const [open, setOpen] = useState<{ row: number; slot: number } | null>(null);

  const deviceOf = (row: SequenceRow): Device | undefined => project.devices.find((d) => d.id === row.deviceId);
  const openRow = open ? rows[open.row] : undefined;
  const openDevice = openRow ? deviceOf(openRow) : undefined;

  const setSlots = (rowIndex: number, slots: Slot[]) =>
    onChange(rows.map((r, i) => (i === rowIndex ? { ...r, slots } : r)));

  const saveSlot = (slot: Slot) => {
    if (!open || !openRow) return;
    const slots = open.slot === -1 ? [...openRow.slots, slot] : openRow.slots.map((s, i) => (i === open.slot ? slot : s));
    setSlots(open.row, slots);
    setOpen(null);
  };

  const deleteSlot = () => {
    if (!open || !openRow) return;
    setSlots(open.row, openRow.slots.filter((_, i) => i !== open.slot));
    setOpen(null);
  };

  return (
    <View style={styles.wrap}>
      {rows.length === 0 && <Text style={styles.muted}>{t('sequence.noRows')}</Text>}
      <View style={styles.table}>
        <View style={styles.labels}>
          {rows.map((row) => {
            const device = deviceOf(row);
            return (
              <View key={row.deviceId} style={styles.label}>
                {device && <KindIcon kind={device.kind} color={colors.accent} />}
                <Text style={styles.labelText} numberOfLines={1}>
                  {device?.name}
                </Text>
                <Pressable hitSlop={8} onPress={() => onChange(rows.filter((r) => r !== row))}>
                  <Ionicons name="close" size={18} color={colors.danger} />
                </Pressable>
              </View>
            );
          })}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled">
          <View>
            {rows.map((row, rowIndex) => (
              <View key={row.deviceId} style={styles.slots}>
                {row.slots.map((slot, slotIndex) => (
                  <Pressable
                    key={slotIndex}
                    style={({ pressed }) => [styles.slot, slot.type === 'command' && styles.slotCommand, pressed && styles.pressed]}
                    onPress={() => setOpen({ row: rowIndex, slot: slotIndex })}
                  >
                    {slot.type === 'pause' && <Ionicons name="time-outline" size={16} color={colors.textMuted} />}
                    {slot.type === 'command' && slot.duration !== undefined && (
                      <>
                        <Ionicons name="timer-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.slotDuration}>{describeDuration(slot)}</Text>
                      </>
                    )}
                    <Text style={styles.slotText}>
                      {slot.type === 'pause' ? t('sequence.pauseValue', { value: slot.seconds }) : describeCommand(slot)}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={({ pressed }) => [styles.slot, styles.add, pressed && styles.pressed]}
                  onPress={() => setOpen({ row: rowIndex, slot: -1 })}
                >
                  <Ionicons name="add" size={20} color={colors.accent} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {rows.length > 0 && (
        <Text style={styles.muted}>{t('sequence.total', { value: seconds(sequenceDurationMs(rows)) })}</Text>
      )}
      <Pressable style={({ pressed }) => [styles.addModule, pressed && styles.pressed]} onPress={() => setPicking(true)}>
        <Text style={styles.addModuleText}>+ {t('action.addModule')}</Text>
      </Pressable>

      {picking && (
        <ModulePicker
          project={project}
          takenIds={new Set(rows.map((r) => r.deviceId))}
          onPickModule={(device) => {
            onChange([...rows, { deviceId: device.id, slots: [{ type: 'pause', seconds: DEFAULT_PAUSE_SECONDS }] }]);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {open && openRow && openDevice && (
        <SlotSheet
          kind={openDevice.kind}
          initial={open.slot === -1 ? undefined : openRow.slots[open.slot]}
          onSave={saveSlot}
          onDelete={open.slot === -1 ? undefined : deleteSlot}
          onClose={() => setOpen(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  muted: { color: colors.textMuted, fontSize: 14 },
  table: { flexDirection: 'row', gap: 8 },
  labels: { width: 120, gap: 8 },
  label: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  slots: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  slot: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotCommand: { borderColor: colors.accent },
  slotText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  slotDuration: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  add: { borderStyle: 'dashed' },
  addModule: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
  },
  addModuleText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
