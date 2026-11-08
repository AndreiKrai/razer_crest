import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { sequenceDurationMs } from '@/project/actions';
import type { Device, GroupRow, GroupSlot, Project, SequenceRow, Slot } from '@/project/types';
import { colors } from '@/theme';

import { describeChase, describeChaseDuration, describeCommand, describeDuration } from './describe';
import { GroupPicker } from './GroupPicker';
import { GroupSlotSheet } from './GroupSlotSheet';
import { KindIcon } from './KindIcon';
import { ModulePicker } from './ModulePicker';
import { SlotSheet } from './SlotSheet';

type Props = {
  project: Project;
  rows: SequenceRow[];
  groupRows: GroupRow[];
  // Modules the action's other parts use; they can't be added to a row.
  takenIds: ReadonlySet<string>;
  onChange: (rows: SequenceRow[]) => void;
  onGroupRowsChange: (groupRows: GroupRow[]) => void;
};

const ROW_HEIGHT = 48;
const DEFAULT_PAUSE_SECONDS = 1;

const seconds = (ms: number) => String(Math.round(ms / 10) / 100);

// One line of the timeline: a module's row or a group's row.
type Line = {
  key: string;
  label: string;
  device?: Device;
  slots: readonly (Slot | GroupSlot)[];
  remove: () => void;
  open: (slot: number) => void;
};

/** `list` with the slot of one row replaced (`slot` = -1 appends); `next` null deletes it. */
function withSlot<S, R extends { slots: S[] }>(list: R[], row: number, slot: number, next: S | null): R[] {
  return list.map((r, i) => {
    if (i !== row) return r;
    let slots: S[];
    if (next === null) slots = r.slots.filter((_, j) => j !== slot);
    else if (slot === -1) slots = [...r.slots, next];
    else slots = r.slots.map((s, j) => (j === slot ? next : s));
    return { ...r, slots };
  });
}

/** The timeline of a sequence: a row per module or group, its slots from left to right (they scroll sideways together). */
export function SequenceEditor({ project, rows, groupRows, takenIds, onChange, onGroupRowsChange }: Props) {
  const [picking, setPicking] = useState(false);
  const [pickingGroup, setPickingGroup] = useState(false);
  // Which slot is open: the kind of row, its index and the slot's index, or -1 for a new slot at the end of the row.
  const [open, setOpen] = useState<{ group: boolean; row: number; slot: number } | null>(null);

  const deviceOf = (row: SequenceRow): Device | undefined => project.devices.find((d) => d.id === row.deviceId);
  const nameOf = (id: string) => project.devices.find((d) => d.id === id)?.name ?? '';

  const lines: Line[] = [
    ...rows.map((row, i) => ({
      key: row.deviceId,
      label: deviceOf(row)?.name ?? '',
      device: deviceOf(row),
      slots: row.slots,
      remove: () => onChange(rows.filter((r) => r !== row)),
      open: (slot: number) => setOpen({ group: false, row: i, slot }),
    })),
    ...groupRows.map((row, i) => ({
      key: `group:${row.deviceIds.join(',')}`,
      label: row.deviceIds.map(nameOf).join(', '),
      slots: row.slots,
      remove: () => onGroupRowsChange(groupRows.filter((r) => r !== row)),
      open: (slot: number) => setOpen({ group: true, row: i, slot }),
    })),
  ];

  const openRow = open && !open.group ? rows[open.row] : undefined;
  const openDevice = openRow ? deviceOf(openRow) : undefined;
  const openGroup = open?.group ? groupRows[open.row] : undefined;

  const saveSlot = (slot: Slot) => {
    if (!open) return;
    onChange(withSlot(rows, open.row, open.slot, slot));
    setOpen(null);
  };

  const deleteSlot = () => {
    if (!open) return;
    onChange(withSlot<Slot, SequenceRow>(rows, open.row, open.slot, null));
    setOpen(null);
  };

  const saveGroupSlot = (slot: GroupSlot) => {
    if (!open) return;
    onGroupRowsChange(withSlot(groupRows, open.row, open.slot, slot));
    setOpen(null);
  };

  const deleteGroupSlot = () => {
    if (!open) return;
    onGroupRowsChange(withSlot<GroupSlot, GroupRow>(groupRows, open.row, open.slot, null));
    setOpen(null);
  };

  const slotText = (slot: Slot | GroupSlot) => {
    if (slot.type === 'pause') return t('sequence.pauseValue', { value: slot.seconds });
    if (slot.type === 'command') return describeCommand(slot);
    return slot.type === 'chase' ? describeChase(slot) : t('command.off');
  };

  const slotDuration = (slot: Slot | GroupSlot) => {
    if (slot.type === 'command') return describeDuration(slot);
    return slot.type === 'chase' ? describeChaseDuration(slot) : null;
  };

  return (
    <View style={styles.wrap}>
      {lines.length === 0 && <Text style={styles.muted}>{t('sequence.noRows')}</Text>}
      <View style={styles.table}>
        <View style={styles.labels}>
          {lines.map((line) => (
            <View key={line.key} style={styles.label}>
              {line.device ? (
                <KindIcon kind={line.device.kind} color={colors.accent} />
              ) : (
                <Ionicons name="layers-outline" size={20} color={colors.accent} />
              )}
              <Text style={styles.labelText} numberOfLines={1}>
                {line.label}
              </Text>
              <Pressable hitSlop={8} onPress={line.remove}>
                <Ionicons name="close" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled">
          <View>
            {lines.map((line) => (
              <View key={line.key} style={styles.slots}>
                {line.slots.map((slot, slotIndex) => {
                  const duration = slotDuration(slot);
                  return (
                    <Pressable
                      key={slotIndex}
                      style={({ pressed }) => [
                        styles.slot,
                        slot.type !== 'pause' && styles.slotCommand,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => line.open(slotIndex)}
                    >
                      {slot.type === 'pause' && <Ionicons name="time-outline" size={16} color={colors.textMuted} />}
                      {duration && (
                        <>
                          <Ionicons name="timer-outline" size={16} color={colors.textMuted} />
                          <Text style={styles.slotDuration}>{duration}</Text>
                        </>
                      )}
                      <Text style={styles.slotText}>{slotText(slot)}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={({ pressed }) => [styles.slot, styles.add, pressed && styles.pressed]}
                  onPress={() => line.open(-1)}
                >
                  <Ionicons name="add" size={20} color={colors.accent} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {lines.length > 0 && (
        <Text style={styles.muted}>
          {t('sequence.total', { value: seconds(sequenceDurationMs([...rows, ...groupRows])) })}
        </Text>
      )}
      <Pressable style={({ pressed }) => [styles.addModule, pressed && styles.pressed]} onPress={() => setPicking(true)}>
        <Text style={styles.addModuleText}>+ {t('action.addModule')}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.addModule, pressed && styles.pressed]}
        onPress={() => setPickingGroup(true)}
      >
        <Text style={styles.addModuleText}>+ {t('chase.addGroup')}</Text>
      </Pressable>

      {picking && (
        <ModulePicker
          project={project}
          takenIds={takenIds}
          onPickModule={(device) => {
            onChange([...rows, { deviceId: device.id, slots: [{ type: 'pause', seconds: DEFAULT_PAUSE_SECONDS }] }]);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {pickingGroup && (
        <GroupPicker
          project={project}
          takenIds={takenIds}
          onPickLights={(deviceIds) => {
            onGroupRowsChange([...groupRows, { deviceIds, slots: [{ type: 'pause', seconds: DEFAULT_PAUSE_SECONDS }] }]);
            setPickingGroup(false);
          }}
          onClose={() => setPickingGroup(false)}
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
      {open && openGroup && (
        <GroupSlotSheet
          lights={openGroup.deviceIds.length}
          initial={open.slot === -1 ? undefined : openGroup.slots[open.slot]}
          onSave={saveGroupSlot}
          onDelete={open.slot === -1 ? undefined : deleteGroupSlot}
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
