import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LinkState } from '@/ble/LinkController';
import { useLink } from '@/ble/LinkProvider';
import { useConnectToModel } from '@/ble/useConnectToModel';
import { t } from '@/i18n';
import { ConnectNotice } from '@/modules/ConnectNotice';
import { runAction, runScenario } from '@/modules/run';
import { pickCover } from '@/project/coverPicker';
import { PlayOptionsSheet } from '@/project/PlayOptionsSheet';
import { ProjectEditSheet } from '@/project/ProjectEditSheet';
import { useProject, useProjects } from '@/project/store';
import type { PlayButton } from '@/project/types';
import { colors } from '@/theme';

type Notice = 'notConnected' | 'failed' | 'tooLong';

function noticeFor(error: string | null): Notice | null {
  if (!error) return null;
  if (error === 'not_connected') return 'notConnected';
  return error === 'too_long' ? 'tooLong' : 'failed';
}

const NOTICE_KEYS = {
  failed: 'play.runFailed',
  tooLong: 'play.tooLong',
} as const;

// Buttons per row: icon-sized, like a phone's home screen.
const COLUMNS = 4;

// How long the connection status stays under the header after it changes.
const STATUS_MS = 3000;

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

function linkIcon(state: LinkState): { name: Icon; color: string } {
  if (state.failure) return { name: 'bluetooth-off', color: colors.danger };
  if (state.phase === 'connected') return { name: 'bluetooth-connect', color: colors.accent };
  if (state.phase === 'idle') return { name: 'bluetooth-off', color: colors.textMuted };
  return { name: 'bluetooth', color: colors.textMuted };
}

const statusText = (state: LinkState) =>
  state.failure ? t(`debug.failed.${state.failure}`) : t(`debug.phase.${state.phase}`);

/** The project's Play screen: big buttons that run its actions and scenarios, STOP ALL and the Options menu. */
export default function PlayScreen() {
  const headerHeight = useHeaderHeight();
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const { bindController, renameProject, setProjectCover } = useProjects();
  const { state, link } = useLink();
  const insets = useSafeAreaInsets();
  const bound = project?.controller;
  const { connect, find: openConnect } = useConnectToModel(id, bound);
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState(false);
  const [notice, setNoticeState] = useState<Notice | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const setNotice = (next: Notice | null) => {
    if (next === 'notConnected') link.watchBluetooth();
    setNoticeState(next);
  };

  // One model at a time: a link to anything but this project's own model is dropped when the project opens, and
  // the project's saved model is connected straight away.
  const boundId = bound?.bleId;
  useEffect(() => {
    const current = link.getState();
    const stale = current.phase !== 'idle' && current.device?.id !== boundId;
    // A failure message left over from another project is cleared the same way.
    if (stale || current.failure) link.disconnect();
    if (boundId && link.getState().phase === 'idle') link.connect(boundId);
  }, [link, boundId]);

  // The model can be renamed from the debug screen; keep the saved name current.
  const liveName = state.phase === 'connected' && state.device?.id === bound?.bleId ? state.device?.name : undefined;
  useEffect(() => {
    if (id && bound && liveName && liveName !== bound.name) bindController(id, bound.bleId, liveName);
  }, [id, bound, liveName, bindController]);

  // Every change of the connection shows its status for a few seconds; the icon in the header stays.
  const first = useRef(true);
  const text = statusText(state);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus(text);
    const timer = setTimeout(() => setStatus(null), STATUS_MS);
    return () => clearTimeout(timer);
  }, [text]);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  // Both run while the sheet is still up and close it afterwards: presenting over a modal that is being dismissed
  // can silently fail on iOS. Alert.prompt exists on iOS only.
  const rename = () =>
    Alert.prompt(
      t('projects.rename'),
      undefined,
      [
        { text: t('projects.cancel'), style: 'cancel', onPress: () => setEditing(false) },
        {
          text: t('projects.save'),
          onPress: (value?: string) => {
            if (value) renameProject(id, value);
            setEditing(false);
          },
        },
      ],
      'plain-text',
      project.name,
    );

  const changeImage = async () => {
    const uri = await pickCover();
    if (uri) setProjectCover(id, uri);
    setEditing(false);
  };

  const press = async (button: PlayButton) => {
    setNotice(null);
    const { type, id: targetId } = button.target;
    const action = type === 'action' ? project.actions.find((a) => a.id === targetId) : undefined;
    const scenario = type === 'scenario' ? project.scenarios.find((s) => s.id === targetId) : undefined;
    if (action) setNotice(noticeFor(await runAction(link, project, action)));
    else if (scenario) setNotice(noticeFor(await runScenario(link, project, scenario)));
  };

  const stopAll = async () => {
    setNotice(null);
    setNotice(noticeFor(await link.stopAll()));
  };

  // The icon shows the status again; when nothing is connecting it also connects (or opens the search).
  const tapLink = () => {
    setStatus(statusText(link.getState()));
    if (link.getState().phase === 'idle') connect();
  };

  const go = (pathname: '/project/[id]/effects' | '/project/[id]/play') => {
    setOptions(false);
    router.push({ pathname, params: { id } });
  };

  const icon = linkIcon(state);

  return (
    <View style={[styles.container, { paddingTop: headerHeight }]}>
      <Stack.Screen
        options={{
          title: project.name,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable
                accessibilityLabel={t('hub.link.title')}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}
                onPress={tapLink}
              >
                <MaterialCommunityIcons name={icon.name} size={22} color={icon.color} />
              </Pressable>
              <Pressable
                accessibilityLabel={t('projects.options')}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}
                onPress={() => setEditing(true)}
              >
                <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      {project.backgroundUri && (
        <>
          <Image source={{ uri: project.backgroundUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, styles.shade]} />
        </>
      )}
      {editing && (
        <ProjectEditSheet
          project={project}
          onRename={rename}
          onChangeImage={changeImage}
          onClose={() => setEditing(false)}
        />
      )}
      {options && (
        <PlayOptionsSheet
          onEffects={() => go('/project/[id]/effects')}
          onEditPlay={() => go('/project/[id]/play')}
          onClose={() => setOptions(false)}
        />
      )}
      {status && (
        <View style={[styles.status, { top: headerHeight + 8 }]} pointerEvents="none">
          <Text style={[styles.statusText, state.failure && styles.error]}>{status}</Text>
        </View>
      )}
      {!bound && (
        <View style={styles.banner}>
          <Text style={styles.muted}>{t('hub.link.none')}</Text>
          <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={openConnect}>
            <Text style={styles.primaryText}>{t('hub.link.find')}</Text>
          </Pressable>
        </View>
      )}
      {notice === 'notConnected'
        ? bound &&
          state.phase !== 'connected' && (
            <View style={styles.connect}>
              <ConnectNotice projectId={project.id} controller={bound} />
            </View>
          )
        : notice && <Text style={styles.notice}>{t(NOTICE_KEYS[notice])}</Text>}
      <FlatList
        data={project.buttons}
        keyExtractor={(b) => b.id}
        numColumns={COLUMNS}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={<Text style={styles.empty}>{t('play.empty')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cell, pressed && styles.pressedButton]}
            onPress={() => press(item)}
          >
            <View style={styles.tile}>
              <MaterialCommunityIcons name={item.icon as Icon} size={32} color={colors.accent} />
            </View>
            <Text style={styles.buttonText} numberOfLines={2}>
              {item.name}
            </Text>
          </Pressable>
        )}
      />
      <View style={[styles.bar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={({ pressed }) => [styles.stopAll, pressed && styles.pressed]} onPress={stopAll}>
          <Text style={styles.stopAllText}>{t('debug.stopAll')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('play.options')}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={() => setOptions(true)}
        >
          <MaterialCommunityIcons name="cog" size={28} color={colors.accentText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  shade: { backgroundColor: 'rgba(11,18,32,0.45)' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  status: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1,
    alignItems: 'center',
  },
  statusText: {
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  error: { color: colors.danger },
  banner: {
    gap: 10,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primary: { paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center' },
  primaryText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  notice: { color: colors.text, fontSize: 13, textAlign: 'center', paddingTop: 12, paddingHorizontal: 16 },
  connect: { paddingHorizontal: 16, paddingTop: 12 },
  grid: { padding: 16, rowGap: 18, flexGrow: 1 },
  empty: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
  // Like an app icon on a phone's home screen: a rounded square with the name under it.
  cell: { width: `${100 / COLUMNS}%`, alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  tile: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(19,28,46,0.85)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressedButton: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  buttonText: { color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  stopAll: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center' },
  stopAllText: { color: colors.accentText, fontSize: 17, fontWeight: '800' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: { color: colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.75 },
});
