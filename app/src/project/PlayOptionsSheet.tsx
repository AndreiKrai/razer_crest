import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { heading, makeStyles, useTheme } from '@/design/ThemeProvider';

type Props = {
  onEffects: () => void;
  onEditPlay: () => void;
  onClose: () => void;
};

/** The Play screen's Options sheet: build the effects, or arrange the Play screen itself. */
export function PlayOptionsSheet({ onEffects, onEditPlay, onClose }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('play.options')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>{t('schematic.close')}</Text>
            </Pressable>
          </View>
          <Row icon="tools" title={t('play.menu.effects')} desc={t('play.menu.effectsDesc')} onPress={onEffects} />
          <Row icon="gesture-tap-button" title={t('play.menu.edit')} desc={t('play.menu.editDesc')} onPress={onEditPlay} />
        </View>
      </View>
    </Modal>
  );
}

type RowProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  desc: string;
  onPress: () => void;
};

function Row({ icon, title, desc, onPress }: RowProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={26} color={theme.colors.accent} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.muted}>{desc}</Text>
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: t.colors.border,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: t.colors.text, fontSize: 17, fontWeight: '600' },
  muted: { color: t.colors.textMuted, fontSize: 14 },
  pressed: { opacity: 0.75 },
}));
