import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useProjects } from '@/project/store';
import type { Project } from '@/project/types';
import { colors } from '@/theme';

export default function ProjectsScreen() {
  const { projects, duplicateProject, removeProject } = useProjects();
  const insets = useSafeAreaInsets();

  const confirmDelete = (project: Project) =>
    Alert.alert(t('projects.deleteTitle', { name: project.name }), t('projects.deleteMessage'), [
      { text: t('projects.cancel'), style: 'cancel' },
      { text: t('projects.delete'), style: 'destructive', onPress: () => removeProject(project.id) },
    ]);

  const openOptions = (project: Project) =>
    Alert.alert(project.name, undefined, [
      {
        text: t('projects.duplicate'),
        onPress: () => duplicateProject(project.id, t('projects.copyName', { name: project.name })),
      },
      { text: t('projects.delete'), style: 'destructive', onPress: () => confirmDelete(project) },
      { text: t('projects.cancel'), style: 'cancel' },
    ]);

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('projects.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })}
              onLongPress={() => openOptions(item)}
            >
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]} />
              )}
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>{t('projects.boardCount', { count: item.boards.length })}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={t('projects.options')}
              hitSlop={8}
              style={({ pressed }) => [styles.more, pressed && styles.pressed]}
              onPress={() => openOptions(item)}
            >
              <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
      />
      <Pressable
        style={({ pressed }) => [styles.primary, { marginBottom: insets.bottom + 16 }, pressed && styles.pressed]}
        onPress={() => router.push('/project/new')}
      >
        <Text style={styles.primaryText}>{t('projects.create')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: 80, paddingHorizontal: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  more: { paddingHorizontal: 12, paddingVertical: 16 },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbEmpty: { backgroundColor: colors.surfaceRaised },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  cardMeta: { color: colors.textMuted, fontSize: 13 },
  primary: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
