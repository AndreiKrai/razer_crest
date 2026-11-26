import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { pickBackground } from '@/project/coverPicker';
import { useProject, useProjects } from '@/project/store';
import { makeStyles, useTheme } from '@/design/ThemeProvider';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

/** Arranging the Play screen: its buttons (order, add, edit) and the background image. */
export default function PlayEditScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const headerHeight = useHeaderHeight();
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const { moveButton, setPlayBackground } = useProjects();
  const insets = useSafeAreaInsets();

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const noTargets = project.actions.length + project.scenarios.length === 0;
  const last = project.buttons.length - 1;

  const targetName = (type: 'action' | 'scenario', targetId: string) => {
    const list: { id: string; name: string }[] = type === 'action' ? project.actions : project.scenarios;
    return list.find((item) => item.id === targetId)?.name ?? '';
  };

  const chooseBackground = async () => {
    const uri = await pickBackground();
    if (uri) setPlayBackground(project.id, uri);
  };

  return (
    <View style={[styles.container, { paddingTop: headerHeight }]}>
      <Stack.Screen options={{ title: t('playEdit.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>{t('playEdit.background')}</Text>
        <View style={styles.background}>
          {project.backgroundUri ? (
            <Image source={{ uri: project.backgroundUri }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.noThumb]}>
              <MaterialCommunityIcons name="image-off" size={28} color={theme.colors.textMuted} />
            </View>
          )}
          <View style={styles.backgroundActions}>
            <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={chooseBackground}>
              <Text style={styles.secondaryText}>{t('playEdit.pickBackground')}</Text>
            </Pressable>
            {project.backgroundUri && (
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                onPress={() => setPlayBackground(project.id, undefined)}
              >
                <Text style={styles.dangerText}>{t('playEdit.removeBackground')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.label}>{t('playEdit.buttons')}</Text>
        {project.buttons.length === 0 && (
          <Text style={styles.muted}>{t(noTargets ? 'playEdit.needTargets' : 'playEdit.empty')}</Text>
        )}
        {project.buttons.map((button, index) => (
          <Pressable
            key={button.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/project/[id]/play-button', params: { id, buttonId: button.id } })}
          >
            <MaterialCommunityIcons name={button.icon as Icon} size={30} color={theme.colors.accent} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{button.name}</Text>
              <Text style={styles.muted} numberOfLines={1}>
                {t(button.target.type === 'action' ? 'playButton.runsAction' : 'playButton.runsScenario', {
                  name: targetName(button.target.type, button.target.id),
                })}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t('playEdit.moveUp')}
              disabled={index === 0}
              hitSlop={6}
              onPress={() => moveButton(project.id, index, index - 1)}
            >
              <MaterialCommunityIcons
                name="chevron-up"
                size={26}
                color={index === 0 ? theme.colors.border : theme.colors.textMuted}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={t('playEdit.moveDown')}
              disabled={index === last}
              hitSlop={6}
              onPress={() => moveButton(project.id, index, index + 1)}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={26}
                color={index === last ? theme.colors.border : theme.colors.textMuted}
              />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        disabled={noTargets}
        style={({ pressed }) => [
          styles.primary,
          { marginBottom: insets.bottom + 16 },
          noTargets && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push({ pathname: '/project/[id]/play-button', params: { id } })}
      >
        <Text style={styles.primaryText}>{t('playEdit.add')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  label: { color: t.colors.textMuted, fontSize: 13, marginTop: 6 },
  muted: { color: t.colors.textMuted, fontSize: 14 },
  background: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 72, height: 96, borderRadius: 12, backgroundColor: t.colors.surface },
  noThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.border },
  backgroundActions: { flex: 1, gap: 8 },
  secondary: { paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center' },
  secondaryText: { color: t.colors.text, fontSize: 15, fontWeight: '600' },
  dangerText: { color: t.colors.danger, fontSize: 15, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { color: t.colors.text, fontSize: 17, fontWeight: '600' },
  primary: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
  },
  primaryText: { color: t.colors.accentText, fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
}));
