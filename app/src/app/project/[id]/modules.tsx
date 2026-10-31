import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { ModuleGroupList } from '@/modules/ModuleGroupList';
import { ModuleSheet } from '@/modules/ModuleSheet';
import { useProject } from '@/project/store';
import { colors } from '@/theme';

export default function ModulesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const insets = useSafeAreaInsets();
  const [deviceId, setDeviceId] = useState<string | null>(null);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const selected = project.devices.find((d) => d.id === deviceId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t('hub.modules.title') }} />
      {project.devices.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>{t('modules.empty')}</Text>
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/project/[id]/hardware', params: { id } })}
          >
            <Text style={styles.primaryText}>{t('modules.goToHardware')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}>
          <ModuleGroupList project={project} onSelect={(device) => setDeviceId(device.id)} />
        </ScrollView>
      )}
      {selected && <ModuleSheet key={selected.id} device={selected} onClose={() => setDeviceId(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  list: { padding: 16 },
  muted: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  primary: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, backgroundColor: colors.accent },
  primaryText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
