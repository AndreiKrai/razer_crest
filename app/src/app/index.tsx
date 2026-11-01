import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { pickProject, shareProject } from '@/project/exchange';
import { ProjectSheet } from '@/project/ProjectSheet';
import { useProjects } from '@/project/store';
import type { Project } from '@/project/types';
import { colors } from '@/theme';

// Files can be shared and picked on a phone only.
const CAN_EXCHANGE = Platform.OS !== 'web';

export default function ProjectsScreen() {
  const { projects, duplicateProject, removeProject, importProject } = useProjects();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Project | null>(null);

  const exportProject = async (project: Project) => {
    setSelected(null);
    try {
      await shareProject(project);
    } catch {
      Alert.alert(t('projects.exportFailed'));
    }
  };

  const importFromFile = async () => {
    try {
      const result = await pickProject();
      if (result.status === 'ok') {
        const id = importProject(result.project);
        router.push({ pathname: '/project/[id]', params: { id } });
      } else if (result.status === 'invalid') {
        Alert.alert(t('projects.importFailedTitle'), t('projects.importInvalid'));
      }
    } catch {
      Alert.alert(t('projects.importFailedTitle'), t('projects.importInvalid'));
    }
  };

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
              onLongPress={() => setSelected(item)}
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
              onPress={() => setSelected(item)}
            >
              <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
      />
      {CAN_EXCHANGE && (
        <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={importFromFile}>
          <Text style={styles.secondaryText}>{t('projects.import')}</Text>
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [styles.primary, { marginBottom: insets.bottom + 16 }, pressed && styles.pressed]}
        onPress={() => router.push('/project/new')}
      >
        <Text style={styles.primaryText}>{t('projects.create')}</Text>
      </Pressable>
      {selected && (
        <ProjectSheet
          project={selected}
          onExport={CAN_EXCHANGE ? () => exportProject(selected) : undefined}
          onDuplicate={() => {
            duplicateProject(selected.id, t('projects.copyName', { name: selected.name }));
            setSelected(null);
          }}
          onDelete={() => {
            removeProject(selected.id);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
        />
      )}
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
  secondary: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
