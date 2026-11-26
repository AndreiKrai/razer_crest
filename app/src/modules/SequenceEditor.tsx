import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { t } from '@/i18n';
import { isGroupRow, moveItem, sequenceDurationMs } from '@/project/actions';
import type { Device, GroupSlot, Project, SequenceRow, Slot, TimelineRow } from '@/project/types';
import { makeStyles, useTheme } from '@/design/ThemeProvider';

import { describeChase, describeChaseDuration, describeCommand, describeDuration } from './describe';
import { GroupPicker } from './GroupPicker';
import { GroupSlotSheet } from './GroupSlotSheet';
import { KindIcon } from './KindIcon';
import { ModulePicker } from './ModulePicker';
import { SlotSheet } from './SlotSheet';

type Props = {
  project: Project;
  rows: TimelineRow[];
  // Modules the action's other parts use; they can't be added to a row.
  takenIds: ReadonlySet<string>;
  onChange: (rows: TimelineRow[]) => void;
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
  // Move one place up or down; absent at the ends.
  up?: () => void;
  down?: () => void;
};

/** `rows` with one slot of one row replaced (`slot` = -1 appends); `next` null deletes it. The caller pairs the slot with its row's kind. */
function withSlot(rows: TimelineRow[], row: number, slot: number, next: Slot | GroupSlot | null): TimelineRow[] {
  return rows.map((r, i) => {
    if (i !== row) return r;
    const old: (Slot | GroupSlot)[] = r.slots;
    let slots: (Slot | GroupSlot)[];
    if (next === null) slots = old.filter((_, j) => j !== slot);
    else if (slot === -1) slots = [...old, next];
    else slots = old.map((s, j) => (j === slot ? next : s));
    return { ...r, slots } as TimelineRow;
  });
}

/** The timeline of a sequence: a row per module or group, its slots from left to right (they scroll sideways together). */
export function SequenceEditor({ project, rows, takenIds, onChange }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [picking, setPicking] = useState(false);
  const [pickingGroup, setPickingGroup] = useState(false);
  // Which slot is open: its row and the slot's index, or -1 for a new slot at the end of the row.
  const [open, setOpen] = useState<{ row: number; slot: number } | null>(null);

  const deviceById = (id: string): Device | undefined => project.devices.find((d) => d.id === id);

  const lines: Line[] = rows.map((row, i) => ({
    key: isGroupRow(row) ? `group:${row.deviceIds.join(',')}` : row.deviceId,
    label: isGroupRow(row) ? row.deviceIds.map((id) => deviceById(id)?.name ?? '').join(', ') : (deviceById(row.deviceId)?.name ?? ''),
    device: isGroupRow(row) ? undefined : deviceById(row.deviceId),
    slots: row.slots,
    remove: () => onChange(rows.filter((r) => r !== row)),
    open: (slot: number) => setOpen({ row: i, slot }),
    up: i > 0 ? () => onChange(moveItem(rows, i, i - 1)) : undefined,
    down: i < rows.length - 1 ? () => onChange(moveItem(rows, i, i + 1)) : undefined,
  }));

  const openRow = open ? rows[open.row] : undefined;
  const openDevice = openRow && !isGroupRow(openRow) ? deviceById(openRow.deviceId) : undefined;
  const openGroup = openRow && isGroupRow(openRow) ? openRow : undefined;

  const saveSlot = (slot: Slot | GroupSlot) => {
    if (!open) return;
    onChange(withSlot(rows, open.row, open.slot, slot));
    setOpen(null);
  };

  const deleteSlot = () => {
    if (!open) return;
    onChange(withSlot(rows, open.row, open.slot, null));
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
                <KindIcon kind={line.device.kind} color={theme.colors.accent} />
              ) : (
                <Ionicons name="layers-outline" size={20} color={theme.colors.accent} />
              )}
              <Text style={styles.labelText} numberOfLines={1}>
                {line.label}
              </Text>
              <View style={styles.arrows}>
                <Pressable
                  accessibilityLabel={t('sequence.moveUp')}
                  disabled={!line.up}
                  hitSlop={{ top: 4, bottom: 0, left: 6, right: 6 }}
                  onPress={line.up}
                >
                  <Ionicons name="chevron-up" size={18} color={line.up ? theme.colors.accent : theme.colors.border} />
                </Pressable>
                <Pressable
                  accessibilityLabel={t('sequence.moveDown')}
                  disabled={!line.down}
                  hitSlop={{ top: 0, bottom: 4, left: 6, right: 6 }}
                  onPress={line.down}
                >
                  <Ionicons name="chevron-down" size={18} color={line.down ? theme.colors.accent : theme.colors.border} />
                </Pressable>
              </View>
              <Pressable hitSlop={8} onPress={line.remove}>
                <Ionicons name="close" size={18} color={theme.colors.danger} />
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
                      {slot.type === 'pause' && <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />}
                      {duration && (
                        <>
                          <Ionicons name="timer-outline" size={16} color={theme.colors.textMuted} />
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
                  <Ionicons name="add" size={20} color={theme.colors.accent} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {lines.length > 0 && <Text style={styles.muted}>{t('sequence.total', { value: seconds(sequenceDurationMs(rows)) })}</Text>}
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
            const row: SequenceRow = { deviceId: device.id, slots: [{ type: 'pause', seconds: DEFAULT_PAUSE_SECONDS }] };
            onChange([...rows, row]);
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
            onChange([...rows, { deviceIds, slots: [{ type: 'pause', seconds: DEFAULT_PAUSE_SECONDS }] }]);
            setPickingGroup(false);
          }}
          onClose={() => setPickingGroup(false)}
        />
      )}
      {open && openRow && openDevice && !isGroupRow(openRow) && (
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
          onSave={saveSlot}
          onDelete={open.slot === -1 ? undefined : deleteSlot}
          onClose={() => setOpen(null)}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: 10 },
  muted: { color: t.colors.textMuted, fontSize: 14 },
  table: { flexDirection: 'row', gap: 8 },
  labels: { width: 150, gap: 8 },
  label: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  labelText: { flex: 1, color: t.colors.text, fontSize: 14, fontWeight: '600' },
  arrows: { alignItems: 'center', justifyContent: 'center' },
  slots: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  slot: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: t.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  slotCommand: { borderColor: t.colors.accent },
  slotText: { color: t.colors.text, fontSize: 14, fontWeight: '600' },
  slotDuration: { color: t.colors.textMuted, fontSize: 13, fontWeight: '600' },
  add: { borderStyle: 'dashed' },
  addModule: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
    alignItems: 'center',
  },
  addModuleText: { color: t.colors.accent, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.75 },
}));
