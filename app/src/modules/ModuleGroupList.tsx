import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getBoard } from '@/catalog/boards';
import { t } from '@/i18n';
import { groupDevices } from '@/project/devices';
import type { Device, Project } from '@/project/types';
import { categoryColors, colors } from '@/theme';

import { KindIcon } from './KindIcon';

type Props = {
  project: Project;
  onSelect: (device: Device) => void;
  // Devices shown ticked and not selectable.
  disabledIds?: ReadonlySet<string>;
};

/** Every device of the project in collapsible groups, ungrouped ones as plain rows after them. */
export function ModuleGroupList({ project, onSelect, disabledIds }: Props) {
  // Group keys (lower-case name) the user has opened; every group starts collapsed.
  const [open, setOpen] = useState<Set<string>>(new Set());

  const boardIndex = (uid: string) => project.boards.findIndex((b) => b.uid === uid);
  const sorted = [...project.devices].sort(
    (a, b) => boardIndex(a.boardUid) - boardIndex(b.boardUid) || a.port - b.port,
  );

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const renderRow = (item: Device, indented: boolean) => {
    const board = project.boards.find((b) => b.uid === item.boardUid);
    const def = board ? getBoard(board.boardId) : undefined;
    const disabled = disabledIds?.has(item.id) ?? false;
    return (
      <Pressable
        key={item.id}
        disabled={disabled}
        style={({ pressed }) => [
          styles.row,
          indented && styles.rowIndented,
          disabled && styles.rowDisabled,
          pressed && styles.pressed,
        ]}
        onPress={() => onSelect(item)}
      >
        <KindIcon kind={item.kind} color={def ? categoryColors[def.category] : colors.textMuted} />
        <View style={styles.rowText}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.muted}>
            {t(`ports.kind.${item.kind}`)}
            {def ? ` · ${t(def.nameKey)} · ${t('ports.output', { n: item.port + 1 })}` : ''}
          </Text>
        </View>
        {disabled && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.list}>
      {groupDevices(sorted).map((group) => {
        // Devices without a group have no header: they follow the named groups as plain rows.
        if (!group.name) return group.devices.map((item) => renderRow(item, false));
        const key = group.name.toLowerCase();
        const expanded = open.has(key);
        return (
          <View key={key} style={styles.group}>
            <Pressable
              style={({ pressed }) => [styles.groupHeader, pressed && styles.pressed]}
              onPress={() => toggle(key)}
            >
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textMuted} />
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.muted}>{group.devices.length}</Text>
            </Pressable>
            {expanded && group.devices.map((item) => renderRow(item, true))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  group: { gap: 8 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupName: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIndented: { marginLeft: 12 },
  rowDisabled: { opacity: 0.5 },
  rowText: { flex: 1, gap: 2 },
  rowName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.75 },
});
