import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { heading, makeStyles } from '@/design/ThemeProvider';

import type { Project } from './types';

type Props = {
  project: Project;
  // Absent where files can't be shared (the web), which hides "Export".
  onExport?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

/** What can be done with a project from the list. A sheet rather than an Alert: Android shows at most 3 buttons. */
export function ProjectSheet({ project, onExport, onDuplicate, onDelete, onClose }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {project.name}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>
          {confirming ? (
            <>
              <Text style={styles.warning}>{t('projects.deleteMessage')}</Text>
              <Row label={t('projects.delete')} onPress={onDelete} danger />
              <Row label={t('projects.cancel')} onPress={() => setConfirming(false)} />
            </>
          ) : (
            <>
              <Row label={t('projects.duplicate')} onPress={onDuplicate} />
              {onExport && <Row label={t('projects.export')} onPress={onExport} />}
              <Row label={t('projects.delete')} onPress={() => setConfirming(true)} danger />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const styles = useStyles();
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <Text style={[styles.rowText, danger && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: t.colors.backdrop },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: t.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { flex: 1, color: t.colors.text, ...heading(t, 18) },
  close: { color: t.colors.accent, fontSize: 16 },
  row: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderColor: t.colors.border },
  rowText: { color: t.colors.text, fontSize: 17 },
  warning: { color: t.colors.textMuted, fontSize: 14, paddingHorizontal: 20, paddingBottom: 12 },
  danger: { color: t.colors.danger },
  pressed: { opacity: 0.75 },
}));
