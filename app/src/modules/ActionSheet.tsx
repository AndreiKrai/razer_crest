import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACTIONS } from '@/catalog/actions';
import { t } from '@/i18n';
import type { Device } from '@/project/types';
import { colors } from '@/theme';

import { KindIcon } from './KindIcon';

type Props = {
  device: Device;
  onClose: () => void;
};

/** One device: a test button and the actions its kind offers. Nothing reaches the model until BLE exists. */
export function ActionSheet({ device, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState(false);
  const press = () => setNotice(true);

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
            <Pressable style={({ pressed }) => [styles.test, pressed && styles.pressed]} onPress={press}>
              <Text style={styles.testText}>{t('modules.test')}</Text>
            </Pressable>
            {notice && <Text style={styles.notice}>{t('modules.notConnected')}</Text>}

            <Text style={styles.section}>{t('modules.actions')}</Text>
            <View style={styles.chips}>
              {ACTIONS[device.kind].map((action) => (
                <Pressable
                  key={action}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                  onPress={press}
                >
                  <Text style={styles.chipText}>{t(`action.${action}`)}</Text>
                </Pressable>
              ))}
            </View>
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
  section: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
