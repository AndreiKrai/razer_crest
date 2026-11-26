import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTemplate, TEMPLATE_IDS, TEMPLATES } from '@/design/templates';
import { heading, makeStyles, useTheme } from '@/design/ThemeProvider';
import { t } from '@/i18n';

import { useProjects } from './store';
import type { Project } from './types';

type Props = {
  project: Project;
  onRename: () => void;
  onChangeImage: () => void;
  onClose: () => void;
};

/** The hub's ⋮ sheet: edit the project's own details (name, cover, design template). */
export function ProjectEditSheet({ project, onRename, onChangeImage, onClose }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { setDesignTemplate } = useProjects();
  const [choosing, setChoosing] = useState(false);
  const current = getTemplate(project.designTemplate).id;

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
          <Row label={t('projects.rename')} onPress={onRename} />
          <Row label={t('projects.editImage')} onPress={onChangeImage} />
          <Row
            label={t('projects.design')}
            value={t(`design.${current}`)}
            open={choosing}
            onPress={() => setChoosing((c) => !c)}
          />
          {choosing && (
            <View style={styles.templates}>
              {TEMPLATE_IDS.map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: id === current }}
                  style={({ pressed }) => [styles.template, id === current && styles.templateOn, pressed && styles.pressed]}
                  // The sheet re-styles at once, so the choice previews itself.
                  onPress={() => setDesignTemplate(project.id, id)}
                >
                  <View style={[styles.swatch, { backgroundColor: TEMPLATES[id].colors.background }]}>
                    <View style={[styles.swatchDot, { backgroundColor: TEMPLATES[id].colors.accent }]} />
                    <View style={[styles.swatchDot, { backgroundColor: TEMPLATES[id].colors.secondary }]} />
                  </View>
                  <Text style={styles.templateText}>{t(`design.${id}`)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

type RowProps = { label: string; value?: string; open?: boolean; onPress: () => void };

function Row({ label, value, open, onPress }: RowProps) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
      {value !== undefined && (
        <View style={styles.rowEnd}>
          <Text style={styles.rowValue}>{value}</Text>
          <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: t.colors.border,
  },
  rowText: { color: t.colors.text, fontSize: 17 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { color: t.colors.textMuted, fontSize: 15 },
  templates: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  template: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  templateOn: { borderColor: t.colors.accent, backgroundColor: t.colors.surfaceRaised },
  swatch: { flexDirection: 'row', gap: 6, alignSelf: 'stretch', height: 44, borderRadius: 10, padding: 10 },
  swatchDot: { width: 14, height: 14, borderRadius: 7 },
  templateText: { color: t.colors.text, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.75 },
}));
