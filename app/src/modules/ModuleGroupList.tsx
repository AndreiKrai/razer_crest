import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getBoard, type PortKind } from '@/catalog/boards';
import { t } from '@/i18n';
import { groupDevices } from '@/project/devices';
import type { Device, Project } from '@/project/types';
import { makeStyles, useTheme } from '@/design/ThemeProvider';

import { KindIcon } from './KindIcon';

type Props = {
  project: Project;
  onSelect: (device: Device) => void;
  // Devices shown ticked and not selectable.
  disabledIds?: ReadonlySet<string>;
  // Only devices of this kind are listed.
  kind?: PortKind;
  // Chosen devices in order; each shows its place (1, 2, 3…) instead of a tick.
  order?: readonly string[];
  // Start with every group open (the default is collapsed).
  expanded?: boolean;
};

/** Every device of the project in collapsible groups, ungrouped ones as plain rows after them. */
export function ModuleGroupList({ project, onSelect, disabledIds, kind, order, expanded }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  // Group keys (lower-case name) the user has opened.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(expanded ? project.devices.flatMap((d) => (d.group ? [d.group.toLowerCase()] : [])) : []),
  );

  const boardIndex = (uid: string) => project.boards.findIndex((b) => b.uid === uid);
  const sorted = project.devices
    .filter((d) => !kind || d.kind === kind)
    .sort((a, b) => boardIndex(a.boardUid) - boardIndex(b.boardUid) || a.port - b.port);

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
    const place = order?.indexOf(item.id) ?? -1;
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
        <KindIcon kind={item.kind} color={def ? theme.category[def.category] : theme.colors.textMuted} />
        <View style={styles.rowText}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.muted}>
            {t(`ports.kind.${item.kind}`)}
            {def ? ` · ${t(def.nameKey)} · ${t('ports.output', { n: item.port + 1 })}` : ''}
          </Text>
        </View>
        {disabled && <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />}
        {place >= 0 && (
          <View style={styles.place}>
            <Text style={styles.placeText}>{place + 1}</Text>
          </View>
        )}
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
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color={theme.colors.textMuted} />
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

const useStyles = makeStyles((t) => ({
  list: { gap: 12 },
  group: { gap: 8 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: t.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  groupName: { flex: 1, color: t.colors.text, fontSize: 17, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  rowIndented: { marginLeft: 12 },
  rowDisabled: { opacity: 0.5 },
  rowText: { flex: 1, gap: 2 },
  place: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
  },
  placeText: { color: t.colors.accentText, fontSize: 14, fontWeight: '700' },
  rowName: { color: t.colors.text, fontSize: 17, fontWeight: '600' },
  muted: { color: t.colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.75 },
}));
