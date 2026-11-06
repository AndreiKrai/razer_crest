import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLink } from '@/ble/LinkProvider';
import { t } from '@/i18n';
import { testTarget } from '@/project/outputs';
import type { Device, Project } from '@/project/types';
import { colors } from '@/theme';

import { ConnectNotice } from './ConnectNotice';
import { KindIcon } from './KindIcon';

type Props = {
  device: Device;
  project: Project;
  onClose: () => void;
};

/** One device: a test button that runs a short default action on the model, and what that action does. */
export function ModuleSheet({ device, project, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { state, link } = useLink();
  const [notice, setNotice] = useState<'notConnected' | 'failed' | null>(null);
  const [busy, setBusy] = useState(false);

  const press = async () => {
    const target = testTarget(project.boards, device);
    if (!target) {
      setNotice('failed');
      return;
    }
    if (link.getState().phase !== 'connected') {
      link.watchBluetooth();
      setNotice('notConnected');
      return;
    }
    setNotice(null);
    setBusy(true);
    const error = await link.deviceTest(target);
    setBusy(false);
    if (error) setNotice(error === 'not_connected' ? 'notConnected' : 'failed');
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <KindIcon kind={device.kind} size={28} color={colors.accent} />
            <View style={styles.headerText}>
              <Text style={styles.title}>{device.name}</Text>
              <Text style={styles.muted}>
                {t(`ports.kind.${device.kind}`)}
                {device.group ? ` · ${device.group}` : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Pressable
              style={({ pressed }) => [styles.test, (pressed || busy) && styles.pressed]}
              disabled={busy}
              onPress={press}
            >
              <Text style={styles.testText}>{t('modules.test')}</Text>
            </Pressable>
            <Text style={styles.hint}>{t(`modules.testHint.${device.kind}`)}</Text>
            {notice === 'notConnected' && state.phase !== 'connected' && (
              <ConnectNotice projectId={project.id} controller={project.controller} onNavigate={onClose} />
            )}
            {notice === 'failed' && <Text style={styles.notice}>{t('modules.testFailed')}</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerText: { flex: 1, gap: 2, marginHorizontal: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  close: { color: colors.accent, fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 14 },
  test: { paddingVertical: 14, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center' },
  testText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  notice: { color: colors.textMuted, fontSize: 13 },
  hint: { color: colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.75 },
});
