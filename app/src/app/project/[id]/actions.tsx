import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useProject } from '@/project/store';
import { colors } from '@/theme';

export default function ActionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState(false);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const noModules = project.devices.length === 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('hub.actions.title') }} />
      {notice && <Text style={styles.notice}>{t('modules.notConnected')}</Text>}
      <FlatList
        data={project.actions}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{t(noModules ? 'actions.needModules' : 'actions.empty')}</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/project/[id]/action', params: { id, actionId: item.id } })}
          >
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.muted}>{t('hub.modules.count', { count: item.steps.length })}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.run, pressed && styles.pressed]}
              onPress={() => setNotice(true)}
              hitSlop={8}
            >
              <Text style={styles.runText}>{t('actions.run')}</Text>
            </Pressable>
          </Pressable>
        )}
      />
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
  runText: { color: colors.accentText, fontSize: 14, fontWeight: '700' },
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
