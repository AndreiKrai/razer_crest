import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useProjects } from '@/project/store';
import { colors } from '@/theme';

export default function ProjectsScreen() {
  const { projects } = useProjects();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('projects.empty')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })}
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
    gap: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
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
