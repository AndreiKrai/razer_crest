import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLink } from '@/ble/LinkProvider';
import { t } from '@/i18n';
import { ConnectNotice } from '@/modules/ConnectNotice';
import { hasRunningMotor } from '@/project/actions';
import { scenarioPlan } from '@/project/outputs';
import { scenarioActionIds } from '@/project/scenarios';
import { useProject } from '@/project/store';
import type { Scenario } from '@/project/types';
import { colors } from '@/theme';

type Notice = 'notConnected' | 'failed' | 'tooLong';

function noticeFor(error: string | null): Notice | null {
  if (!error) return null;
  if (error === 'not_connected') return 'notConnected';
  return error === 'too_long' ? 'tooLong' : 'failed';
}

const NOTICE_KEYS = {
  failed: 'scenarios.runFailed',
  tooLong: 'scenarios.tooLong',
} as const;

export default function ScenariosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const insets = useSafeAreaInsets();
  const { state, link } = useLink();
  const [notice, setNoticeState] = useState<Notice | null>(null);
  const setNotice = (next: Notice | null) => {
    if (next === 'notConnected') link.watchBluetooth();
    setNoticeState(next);
  };

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const noActions = project.actions.length === 0;

  const run = async (scenario: Scenario) => {
    setNotice(null);
    const plan = scenarioPlan(project.boards, project.devices, project.actions, scenario);
    if (!plan) {
      setNotice('failed');
      return;
    }
    setNotice(noticeFor(await link.runScenario(scenario.id, scenario.exclusive === true, scenario.loop === true, plan.actions, plan.rows)));
  };

  const stop = async (scenario: Scenario) => {
    setNotice(null);
    setNotice(noticeFor(await link.stopAction(scenario.id)));
  };

  const stopAll = async () => {
    setNotice(null);
    setNotice(noticeFor(await link.stopAll()));
  };

  // A motor that an action of the scenario turns with no end keeps turning after the scenario is over.
  const hasMotorWarning = (scenario: Scenario) =>
    scenarioActionIds(scenario.rows).some((actionId) => {
      const action = project.actions.find((a) => a.id === actionId);
      return action !== undefined && hasRunningMotor(project.devices, action);
    });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('hub.scenarios.title') }} />
      {notice === 'notConnected'
        ? state.phase !== 'connected' && (
            <View style={styles.connect}>
              <ConnectNotice projectId={project.id} controller={project.controller} />
            </View>
          )
        : notice && <Text style={styles.notice}>{t(NOTICE_KEYS[notice])}</Text>}
      <FlatList
        data={project.scenarios}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{t(noActions ? 'scenarios.needActions' : 'scenarios.empty')}</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/project/[id]/scenario', params: { id, scenarioId: item.id } })}
          >
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.muted}>{t('hub.actions.count', { count: scenarioActionIds(item.rows).length })}</Text>
              {hasMotorWarning(item) && <Text style={styles.warning}>{t('actions.motorWarning')}</Text>}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('actions.run')}
              style={({ pressed }) => [styles.icon, styles.play, pressed && styles.pressed]}
              onPress={() => run(item)}
              hitSlop={6}
            >
              <Ionicons name="play" size={20} color={colors.accentText} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('actions.stop')}
              style={({ pressed }) => [styles.icon, styles.stop, pressed && styles.pressed]}
              onPress={() => stop(item)}
              hitSlop={6}
            >
              <Ionicons name="stop" size={18} color={colors.accentText} />
            </Pressable>
          </Pressable>
        )}
      />
      <Pressable style={({ pressed }) => [styles.stopAll, pressed && styles.pressed]} onPress={stopAll}>
        <Text style={styles.stopAllText}>{t('debug.stopAll')}</Text>
      </Pressable>
      <Pressable
        disabled={noActions}
        style={({ pressed }) => [
          styles.primary,
          { marginBottom: insets.bottom + 16 },
          noActions && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push({ pathname: '/project/[id]/scenario', params: { id } })}
      >
        <Text style={styles.primaryText}>{t('scenarios.add')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  notice: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingTop: 12 },
  connect: { paddingHorizontal: 16, paddingTop: 12 },
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
  cardTitle: { flexShrink: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 14 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  play: { backgroundColor: colors.accent },
  stop: { backgroundColor: colors.danger },
  warning: { color: colors.danger, fontSize: 13 },
  stopAll: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  stopAllText: { color: colors.accentText, fontSize: 17, fontWeight: '800' },
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
