import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLink } from '@/ble/LinkProvider';
import { t } from '@/i18n';
import { useProject, useProjects } from '@/project/store';
import { colors } from '@/theme';

export default function ProjectHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const { bindController } = useProjects();
  const { state, link } = useLink();
  const bound = project?.controller;

  // One model at a time: a link to anything but this project's own model is dropped when its hub opens.
  useEffect(() => {
    const current = link.getState();
    const stale = current.phase !== 'idle' && current.device?.id !== bound?.bleId;
    // A failure message left over from another project is cleared the same way.
    if (stale || current.failure) link.disconnect();
  }, [link, bound?.bleId]);

  // The model can be renamed from the debug screen; keep the saved name current.
  const liveName = state.phase === 'connected' && state.device?.id === bound?.bleId ? state.device?.name : undefined;
  useEffect(() => {
    if (id && bound && liveName && liveName !== bound.name) bindController(id, bound.bleId, liveName);
  }, [id, bound, liveName, bindController]);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const linked = state.phase === 'connecting' || state.phase === 'connected' || state.phase === 'reconnecting';
  const openConnect = () => router.push({ pathname: '/project/[id]/connect', params: { id } });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: project.name }} />
      <View style={styles.link}>
        <Text style={styles.linkTitle}>{t('hub.link.title')}</Text>
        <Text style={styles.muted}>
          {bound ? t('hub.link.bound', { name: liveName ?? bound.name }) : t('hub.link.none')}
        </Text>
        {linked && <Text style={styles.status}>{t(`debug.phase.${state.phase}`)}</Text>}
        {state.failure && <Text style={styles.error}>{t(`debug.failed.${state.failure}`)}</Text>}
        {linked ? (
          <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={link.disconnect}>
            <Text style={styles.secondaryText}>{t('hub.link.disconnect')}</Text>
          </Pressable>
        ) : bound ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              onPress={() => link.connect(bound.bleId)}
            >
              <Text style={styles.primaryText}>{t('hub.link.connect')}</Text>
            </Pressable>
            <Pressable onPress={openConnect} hitSlop={8} style={styles.change}>
              <Text style={styles.changeText}>{t('hub.link.change')}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={openConnect}>
            <Text style={styles.primaryText}>{t('hub.link.find')}</Text>
          </Pressable>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/project/[id]/hardware', params: { id } })}
      >
        <Text style={styles.cardTitle}>{t('hub.hardware.title')}</Text>
        <Text style={styles.muted}>{t('hub.hardware.desc')}</Text>
        <Text style={styles.meta}>{t('projects.boardCount', { count: project.boards.length })}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/project/[id]/modules', params: { id } })}
      >
        <Text style={styles.cardTitle}>{t('hub.modules.title')}</Text>
        <Text style={styles.muted}>{t('hub.modules.desc')}</Text>
        <Text style={styles.meta}>{t('hub.modules.count', { count: project.devices.length })}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/project/[id]/actions', params: { id } })}
      >
        <Text style={styles.cardTitle}>{t('hub.actions.title')}</Text>
        <Text style={styles.muted}>{t('hub.actions.desc')}</Text>
        <Text style={styles.meta}>{t('hub.actions.count', { count: project.actions.length })}</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.debug, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/project/[id]/debug', params: { id } })}
      >
        <Text style={styles.muted}>{t('hub.debug')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  link: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  status: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14 },
  primary: { paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center' },
  primaryText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  secondary: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  change: { alignSelf: 'center' },
  changeText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  card: {
    flex: 1,
    maxHeight: 200,
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  meta: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  debug: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 12 },
  pressed: { opacity: 0.75 },
});
