import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLink } from '@/ble/LinkProvider';
import { t } from '@/i18n';
import { actionDeviceIds, isSequence, sequenceDurationMs } from '@/project/actions';
import { actionSteps, sequenceRows } from '@/project/outputs';
import { useProject } from '@/project/store';
import type { Action, Project } from '@/project/types';
import { colors } from '@/theme';

type Notice = 'notConnected' | 'failed' | 'tooLong';

function noticeFor(error: string | null): Notice | null {
  if (!error) return null;
  if (error === 'not_connected') return 'notConnected';
  return error === 'too_long' ? 'tooLong' : 'failed';
}

const NOTICE_KEYS = {
  notConnected: 'modules.notConnected',
  failed: 'actions.runFailed',
  tooLong: 'actions.tooLong',
} as const;

// A motor command with no end: it turns until someone stops it.
function hasRunningMotor(project: Project, action: Action): boolean {
  const commands = isSequence(action)
    ? action.rows.flatMap((r) => r.slots.map((s) => ({ deviceId: r.deviceId, command: s.type === 'command' ? s.command : null })))
    : action.steps;
  return commands.some(
    (s) => (s.command === 'forward' || s.command === 'reverse') && project.devices.some((d) => d.id === s.deviceId && d.kind === 'motor'),
  );
}

export default function ActionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const insets = useSafeAreaInsets();
  const { state, link } = useLink();
  const [notice, setNotice] = useState<Notice | null>(null);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const noModules = project.devices.length === 0;

  const toggle = async (action: Action) => {
    setNotice(null);
    if (state.runningActions.includes(action.id)) {
      setNotice(noticeFor(await link.stopAction(action.id)));
      return;
    }
    const exclusive = action.exclusive === true;
    if (isSequence(action)) {
      const rows = sequenceRows(project.boards, project.devices, action);
      if (!rows) {
        setNotice('failed');
        return;
      }
      const duration = sequenceDurationMs(action.rows);
      setNotice(noticeFor(await link.runSequence(action.id, exclusive, action.loop === true, rows, duration)));
      return;
    }
    const steps = actionSteps(project.boards, project.devices, action);
    if (!steps) {
      setNotice('failed');
      return;
    }
    setNotice(noticeFor(await link.runAction(action.id, exclusive, steps)));
  };

  const stopAll = async () => {
    setNotice(null);
    setNotice(noticeFor(await link.stopAll()));
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('hub.actions.title') }} />
      {notice && <Text style={styles.notice}>{t(NOTICE_KEYS[notice])}</Text>}
      <FlatList
        data={project.actions}
        keyExtractor={(a) => a.id}
        extraData={state.runningActions}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{t(noModules ? 'actions.needModules' : 'actions.empty')}</Text>
        }
        renderItem={({ item }) => {
          const running = state.runningActions.includes(item.id);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/project/[id]/action', params: { id, actionId: item.id } })}
            >
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.muted}>{t('hub.modules.count', { count: actionDeviceIds(item).length })}</Text>
                {hasRunningMotor(project, item) && <Text style={styles.warning}>{t('actions.motorWarning')}</Text>}
              </View>
              <Pressable
                style={({ pressed }) => [styles.run, running && styles.stop, pressed && styles.pressed]}
                onPress={() => toggle(item)}
                hitSlop={8}
              >
                <Text style={styles.runText}>{t(running ? 'actions.stop' : 'actions.run')}</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />
      <Pressable style={({ pressed }) => [styles.stopAll, pressed && styles.pressed]} onPress={stopAll}>
        <Text style={styles.stopAllText}>{t('debug.stopAll')}</Text>
      </Pressable>
      <Pressable
        disabled={noModules}
        style={({ pressed }) => [
          styles.primary,
          { marginBottom: insets.bottom + 16 },
          noModules && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push({ pathname: '/project/[id]/action', params: { id } })}
      >
        <Text style={styles.primaryText}>{t('actions.add')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  notice: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingTop: 12 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  run: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.accent },
  stop: { backgroundColor: colors.danger },
  runText: { color: colors.accentText, fontSize: 14, fontWeight: '700' },
  warning: { color: colors.danger, fontSize: 13 },
  stopAll: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  stopAllText: { color: colors.accentText, fontSize: 16, fontWeight: '800' },
  primary: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
