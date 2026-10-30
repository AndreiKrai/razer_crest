import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBoard } from '@/catalog/boards';
import { t } from '@/i18n';
import { ActionSheet } from '@/modules/ActionSheet';
import { KindIcon } from '@/modules/KindIcon';
import { groupDevices } from '@/project/devices';
import { useProject } from '@/project/store';
import type { Device } from '@/project/types';
import { categoryColors, colors } from '@/theme';

export default function ModulesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const insets = useSafeAreaInsets();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  // Group keys (lower-case name) the user has opened; every group starts collapsed.
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const boardIndex = (uid: string) => project.boards.findIndex((b) => b.uid === uid);
  const sorted = [...project.devices].sort(
    (a, b) => boardIndex(a.boardUid) - boardIndex(b.boardUid) || a.port - b.port,
  );
  const groups = groupDevices(sorted);
  const selected = project.devices.find((d) => d.id === deviceId);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const renderRow = (item: Device, indented: boolean) => {
    const board = project.boards.find((b) => b.uid === item.boardUid);
    const def = board ? getBoard(board.boardId) : undefined;
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [styles.row, indented && styles.rowIndented, pressed && styles.pressed]}
        onPress={() => setDeviceId(item.id)}
      >
        <KindIcon kind={item.kind} color={def ? categoryColors[def.category] : colors.textMuted} />
        <View style={styles.rowText}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.muted}>
            {t(`ports.kind.${item.kind}`)}
            {def ? ` · ${t(def.nameKey)} · ${t('ports.output', { n: item.port + 1 })}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('hub.modules.title') }} />
      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>{t('modules.empty')}</Text>
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/project/[id]/hardware', params: { id } })}
          >
            <Text style={styles.primaryText}>{t('modules.goToHardware')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}>
          {groups.map((group) => {
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
        </ScrollView>
      )}
      {selected && <ActionSheet key={selected.id} device={selected} onClose={() => setDeviceId(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  list: { padding: 16, gap: 12 },
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
  rowText: { flex: 1, gap: 2 },
  rowName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  primary: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, backgroundColor: colors.accent },
  primaryText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
