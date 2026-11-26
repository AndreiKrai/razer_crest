import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import type { Action } from '@/project/types';
import { heading, makeStyles } from '@/design/ThemeProvider';

import { ActionList } from './ActionList';

type Props = {
  actions: Action[];
  onPick: (action: Action) => void;
  onClose: () => void;
};

/** Sheet: choose one of the project's actions (a new row of a scenario starts with it). */
export function ActionPicker({ actions, onPick, onClose }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('scenario.pickAction')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <ActionList actions={actions} onSelect={onPick} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: t.colors.backdrop },
  sheet: {
    maxHeight: '85%',
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: t.colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  title: { flex: 1, color: t.colors.text, ...heading(t, 18) },
  close: { color: t.colors.accent, fontSize: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 8 },
}));
