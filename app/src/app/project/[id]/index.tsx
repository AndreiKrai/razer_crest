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
import { targetIsExclusive, targetRunMs } from '@/project/play';
import type { PlayButton, PlayTarget } from '@/project/types';
import { PlayTile, type TileRun } from '@/design/components/PlayTile';
import { makeStyles, useTheme } from '@/design/ThemeProvider';
import type { Colors } from '@/design/tokens';

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

function linkIcon(state: LinkState, colors: Colors): { name: Icon; color: string } {
  if (state.failure) return { name: 'bluetooth-off', color: colors.danger };
  if (state.phase === 'connected') return { name: 'bluetooth-connect', color: colors.accent };
  if (state.phase === 'idle') return { name: 'bluetooth-off', color: colors.textMuted };
  return { name: 'bluetooth', color: colors.textMuted };
}

// What the phone started and when; keyed by target, so every button of the same action shows it.
type Run = TileRun;
const targetKey = (target: PlayTarget) => `${target.type}:${target.id}`;

const statusText = (state: LinkState) =>
  state.failure ? t(`debug.failed.${state.failure}`) : t(`debug.phase.${state.phase}`);

/** The project's Play screen: big buttons that run its actions and scenarios, STOP ALL and the Options menu. */
export default function PlayScreen() {
  const theme = useTheme();
  const styles = useStyles();
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
  const [runs, setRuns] = useState<Record<string, Run>>({});
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

  // A run that ended by itself drops off at its end time.
  useEffect(() => {
    const ends = Object.values(runs).flatMap((r) => (r.ms === null ? [] : [r.startedAt + r.ms]));
    if (ends.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setRuns((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([, r]) => r.ms === null || r.startedAt + r.ms > now)),
      );
    }, Math.max(0, Math.min(...ends) - Date.now()));
    return () => clearTimeout(timer);
  }, [runs]);

  // Without the link the phone can't tell what still runs.
  const connected = state.phase === 'connected';
  const [wasConnected, setWasConnected] = useState(connected);
  if (connected !== wasConnected) {
    setWasConnected(connected);
    if (!connected) setRuns({});
  }

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
    if (!action && !scenario) return;
    const error = action ? await runAction(link, project, action) : await runScenario(link, project, scenario!);
    setNotice(noticeFor(error));
    if (error) return;
    const ms = targetRunMs(button.target, project.actions, project.scenarios);
    const exclusive = targetIsExclusive(button.target, project.actions, project.scenarios);
    setRuns((prev) => {
      const rest = exclusive ? {} : { ...prev };
      delete rest[targetKey(button.target)];
      // Only off/stop: nothing keeps running.
      return ms === 0 ? rest : { ...rest, [targetKey(button.target)]: { startedAt: Date.now(), ms } };
    });
  };

  const stopAll = async () => {
    setNotice(null);
    const error = await link.stopAll();
    setNotice(noticeFor(error));
    if (!error) setRuns({});
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

  const icon = linkIcon(state, theme.colors);

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
                <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
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
        // The tiles show what runs, which isn't in `data`.
        extraData={runs}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={<Text style={styles.empty}>{t('play.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <PlayTile icon={item.icon} name={item.name} running={runs[targetKey(item.target)]} onPress={() => press(item)} />
          </View>
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
          <MaterialCommunityIcons name="cog" size={28} color={theme.colors.accentText} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shade: { backgroundColor: t.colors.shade },
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
    backgroundColor: t.colors.surfaceRaised,
    color: t.colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  error: { color: t.colors.danger },
  banner: {
    gap: 10,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 16,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  primary: { paddingVertical: 12, borderRadius: 12, backgroundColor: t.colors.accent, alignItems: 'center' },
  primaryText: { color: t.colors.accentText, fontSize: 16, fontWeight: '700' },
  notice: { color: t.colors.text, fontSize: 13, textAlign: 'center', paddingTop: 12, paddingHorizontal: 16 },
  connect: { paddingHorizontal: 16, paddingTop: 12 },
  grid: { padding: 16, rowGap: 18, flexGrow: 1 },
  empty: { color: t.colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
  // Like an app icon on a phone's home screen: a tile with the name under it (design/components/PlayTile.tsx).
  cell: { width: `${100 / COLUMNS}%`, paddingHorizontal: 2 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  stopAll: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: t.colors.danger, alignItems: 'center' },
  stopAllText: { color: t.colors.accentText, fontSize: 17, fontWeight: '800' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: { color: t.colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.75 },
}));
