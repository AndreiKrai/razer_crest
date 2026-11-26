import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { t } from '@/i18n';
import { moveItem } from '@/project/actions';
import { isOpenAction, scenarioDurationMs, slotPlan } from '@/project/scenarios';
import type { Project, ScenarioRow, ScenarioSlot } from '@/project/types';
import { makeStyles, useTheme } from '@/design/ThemeProvider';

import { ActionPicker } from './ActionPicker';
import { describeMs } from './describe';
import { ScenarioSlotSheet } from './ScenarioSlotSheet';

type Props = {
  project: Project;
  rows: ScenarioRow[];
  onChange: (rows: ScenarioRow[]) => void;
};

const ROW_HEIGHT = 48;

const seconds = (ms: number) => String(Math.round(ms / 10) / 100);

/** `rows` with one slot of one row replaced (`slot` = -1 appends); `next` null deletes it. */
function withSlot(rows: ScenarioRow[], row: number, slot: number, next: ScenarioSlot | null): ScenarioRow[] {
  return rows.map((r, i) => {
    if (i !== row) return r;
    if (next === null) return { slots: r.slots.filter((_, j) => j !== slot) };
    return { slots: slot === -1 ? [...r.slots, next] : r.slots.map((s, j) => (j === slot ? next : s)) };
  });
}

/** The timeline of a scenario: a row per thread, its slots from left to right (they scroll sideways together). */
export function ScenarioEditor({ project, rows, onChange }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [picking, setPicking] = useState(false);
  // Which slot is open: its row and the slot's index, or -1 for a new slot at the end of the row.
  const [open, setOpen] = useState<{ row: number; slot: number } | null>(null);

  const openRow = open ? rows[open.row] : undefined;

  const saveSlot = (slot: ScenarioSlot) => {
    if (!open) return;
    onChange(withSlot(rows, open.row, open.slot, slot));
    setOpen(null);
  };

  const deleteSlot = () => {
    if (!open) return;
    onChange(withSlot(rows, open.row, open.slot, null));
    setOpen(null);
  };

  const slotText = (slot: ScenarioSlot) => {
    if (slot.type === 'pause') return t('sequence.pauseValue', { value: slot.seconds });
    return project.actions.find((a) => a.id === slot.actionId)?.name ?? '';
  };

  // The time an action slot holds its row (a run time or the action's own length), or ∞ for an endless last action.
  const slotDuration = (slot: ScenarioSlot, isLast: boolean) => {
    if (slot.type === 'pause') return null;
    if (isLast && slot.endless) {
      const action = project.actions.find((a) => a.id === slot.actionId);
      return action && isOpenAction(action) ? '∞' : null;
    }
    const { waitMs } = slotPlan(slot, project.actions, isLast);
    return waitMs > 0 ? describeMs(waitMs) : null;
  };

  return (
    <View style={styles.wrap}>
      {rows.length === 0 && <Text style={styles.muted}>{t('scenario.noRows')}</Text>}
      <View style={styles.table}>
        <View style={styles.labels}>
          {rows.map((row, i) => (
            <View key={i} style={styles.label}>
              <Ionicons name="reorder-three-outline" size={20} color={theme.colors.accent} />
              <Text style={styles.labelText} numberOfLines={1}>
                {t('scenario.row', { number: i + 1 })}
              </Text>
              <View style={styles.arrows}>
                <Pressable
                  accessibilityLabel={t('sequence.moveUp')}
                  disabled={i === 0}
                  hitSlop={{ top: 4, bottom: 0, left: 6, right: 6 }}
                  onPress={() => onChange(moveItem(rows, i, i - 1))}
                >
                  <Ionicons name="chevron-up" size={18} color={i > 0 ? theme.colors.accent : theme.colors.border} />
                </Pressable>
                <Pressable
                  accessibilityLabel={t('sequence.moveDown')}
                  disabled={i === rows.length - 1}
                  hitSlop={{ top: 0, bottom: 4, left: 6, right: 6 }}
                  onPress={() => onChange(moveItem(rows, i, i + 1))}
                >
                  <Ionicons name="chevron-down" size={18} color={i < rows.length - 1 ? theme.colors.accent : theme.colors.border} />
                </Pressable>
              </View>
              <Pressable hitSlop={8} onPress={() => onChange(rows.filter((_, j) => j !== i))}>
                <Ionicons name="close" size={18} color={theme.colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled">
          <View>
            {rows.map((row, i) => (
              <View key={i} style={styles.slots}>
                {row.slots.map((slot, slotIndex) => {
                  const duration = slotDuration(slot, slotIndex === row.slots.length - 1);
                  return (
                    <Pressable
                      key={slotIndex}
                      style={({ pressed }) => [
                        styles.slot,
                        slot.type === 'action' && styles.slotAction,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setOpen({ row: i, slot: slotIndex })}
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
                  onPress={() => setOpen({ row: i, slot: -1 })}
                >
                  <Ionicons name="add" size={20} color={theme.colors.accent} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {rows.length > 0 && <Text style={styles.muted}>{t('scenario.total', { value: seconds(scenarioDurationMs(rows, project.actions)) })}</Text>}
      <Pressable style={({ pressed }) => [styles.addRow, pressed && styles.pressed]} onPress={() => setPicking(true)}>
        <Text style={styles.addRowText}>+ {t('scenario.addRow')}</Text>
      </Pressable>

      {picking && (
        <ActionPicker
          actions={project.actions}
          onPick={(action) => {
            onChange([...rows, { slots: [{ type: 'action', actionId: action.id }] }]);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {open && openRow && (
        <ScenarioSlotSheet
          actions={project.actions}
          initial={open.slot === -1 ? undefined : openRow.slots[open.slot]}
          isLast={open.slot === -1 || open.slot === openRow.slots.length - 1}
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
  slotAction: { borderColor: t.colors.accent },
  slotText: { color: t.colors.text, fontSize: 14, fontWeight: '600' },
  slotDuration: { color: t.colors.textMuted, fontSize: 13, fontWeight: '600' },
  add: { borderStyle: 'dashed' },
  addRow: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
    alignItems: 'center',
  },
  addRowText: { color: t.colors.accent, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.75 },
}));
