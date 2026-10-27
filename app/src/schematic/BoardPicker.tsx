import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOARDS, CABLES, CATEGORY_KEYS, PICKER_CATEGORIES } from '@/catalog/boards';
import { t } from '@/i18n';
import { findPlacement, type Placement } from '@/project/placement';
import type { Project } from '@/project/types';
import { categoryColors, colors } from '@/theme';

type Props = {
  visible: boolean;
  project: Project;
  onPick: (boardId: string) => void;
  onClose: () => void;
};

function reasonText(placement: Placement): string | null {
  if (placement.ok) return null;
  if (placement.reason === 'needs') {
    return t('picker.reason.needs', { category: t(CATEGORY_KEYS[placement.needs.category]) });
  }
  if (placement.reason === 'taken') return t('picker.reason.taken', { socket: t(CABLES[placement.cable].labelKey) });
  return t('picker.reason.comingSoon');
}

export function BoardPicker({ visible, project, onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('picker.title')}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{t('schematic.close')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {PICKER_CATEGORIES.map((category) => (
            <View key={category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.dot, { backgroundColor: categoryColors[category] }]} />
                <Text style={styles.sectionTitle}>{t(CATEGORY_KEYS[category])}</Text>
              </View>
              {BOARDS.filter((b) => b.category === category).map((board) => {
                const placement = findPlacement(project, board);
                const reason = reasonText(placement);
                return (
                  <Pressable
                    key={board.id}
                    disabled={!placement.ok}
                    onPress={() => onPick(board.id)}
                    style={({ pressed }) => [
                      styles.item,
                      { borderLeftColor: categoryColors[category] },
                      !placement.ok && styles.itemDisabled,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <Text style={styles.itemName}>{t(board.nameKey)}</Text>
                    <Text style={styles.itemDesc}>{t(board.descKey)}</Text>
                    {reason && <Text style={styles.itemReason}>{reason}</Text>}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '75%',
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
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  close: { color: colors.accent, fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 8, gap: 18 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  item: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    gap: 4,
  },
  itemDisabled: { opacity: 0.45 },
  itemPressed: { opacity: 0.7 },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  itemDesc: { color: colors.textMuted, fontSize: 13 },
  itemReason: { color: colors.pinUsed, fontSize: 12, marginTop: 2 },
});
