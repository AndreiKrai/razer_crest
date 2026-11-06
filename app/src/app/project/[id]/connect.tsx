import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useLink } from '@/ble/LinkProvider';
import { t } from '@/i18n';
import { useProject, useProjects } from '@/project/store';
import { colors } from '@/theme';

/** Scan, pick the project's model and connect; the first successful connection binds it to the project. */
export default function ConnectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const { bindController } = useProjects();
  const { state, link } = useLink();
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    // A model may already be connected (the one being replaced): start from a clean link.
    link.disconnect();
    link.scan();
    return () => {
      const { phase } = link.getState();
      if (phase === 'scanning') link.stopScan();
      // Also drops a scan or connect that waits for Bluetooth to come on.
      else if (phase === 'connecting' || phase === 'idle') link.disconnect();
    };
  }, [link]);

  const device = state.device;
  useEffect(() => {
    if (!project || !device || state.phase !== 'connected' || device.id !== picked) return;
    bindController(project.id, device.id, device.name);
    router.back();
  }, [project, device, state.phase, picked, bindController]);

  const pick = (deviceId: string) => {
    setPicked(deviceId);
    link.connect(deviceId);
  };

  const scanAgain = () => {
    setPicked(null);
    link.scan();
  };

  const busy = state.phase === 'connecting' || state.phase === 'connected';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {state.simulated && <Text style={styles.notice}>{t('debug.simulated')}</Text>}
      <Text style={styles.muted}>{t('connect.hint')}</Text>

      {busy && <Text style={styles.text}>{t(`debug.phase.${state.phase}`)}</Text>}
      {state.failure && <Text style={styles.error}>{t(`debug.failed.${state.failure}`)}</Text>}

      {state.phase === 'scanning' && (
        <>
          {state.devices.length === 0 && <Text style={styles.muted}>{t('debug.noDevices')}</Text>}
          {state.devices.map((found) => (
            <Pressable
              key={found.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => pick(found.id)}
            >
              <Text style={styles.cardTitle}>{found.name || t('debug.unnamed')}</Text>
            </Pressable>
          ))}
          <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={link.stopScan}>
            <Text style={styles.secondaryText}>{t('debug.stopScan')}</Text>
          </Pressable>
        </>
      )}

      {state.phase === 'idle' && (
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={scanAgain}>
          <Text style={styles.buttonText}>{t('connect.rescan')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  notice: { color: colors.textMuted, fontSize: 13, padding: 12, borderRadius: 12, backgroundColor: colors.surface },
  text: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  button: { paddingVertical: 14, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center' },
  buttonText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  secondary: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
