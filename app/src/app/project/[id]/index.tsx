import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { useProject } from '@/project/store';
import { colors } from '@/theme';

export default function ProjectHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: project.name }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
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
  pressed: { opacity: 0.75 },
});
