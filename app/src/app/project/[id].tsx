import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTROLLER_ID, getBoard, optionValue } from '@/catalog/boards';
import { t } from '@/i18n';
import { useProject, useProjects } from '@/project/store';
import { BoardPicker } from '@/schematic/BoardPicker';
import { layoutProject } from '@/schematic/layout';
import { Schematic } from '@/schematic/Schematic';
import { colors } from '@/theme';

export default function SchematicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const { addBoard, removeBoard, setBoardOption } = useProjects();
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('schematic.notFound')}</Text>
      </View>
    );
  }

  const layout = layoutProject(project);
  const selected = project.boards.find((b) => b.uid === selectedUid);
  const selectedDef = selected ? getBoard(selected.boardId) : undefined;
  const isController = selected?.boardId === CONTROLLER_ID;
  const hasChildren = selected ? project.boards.some((b) => b.parentUid === selected.uid) : false;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: project.name }} />

      <View style={styles.canvas}>
        <Schematic
          layout={layout}
          selectedUid={selectedUid}
          onSelectBoard={setSelectedUid}
          onPressFreeSocket={() => setPickerOpen(true)}
        />
      </View>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        {selected && selectedDef ? (
          <View style={styles.selection}>
            <View style={styles.selectionText}>
              <Text style={styles.selectionName}>{t(selectedDef.nameKey)}</Text>
              <Text style={styles.muted}>
                {isController
                  ? t('schematic.cannotRemoveController')
                  : hasChildren
                    ? t('schematic.removeWithChildren')
                    : t(selectedDef.descKey)}
              </Text>
            </View>
            {selectedDef.options?.map((option) => {
              const current = optionValue(selectedDef, selected.options, option.id);
              return (
                <View key={option.id} style={styles.option}>
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{t(option.labelKey)}</Text>
                    <Text style={styles.muted}>{t(option.hintKey)}</Text>
                  </View>
                  <View style={styles.segments}>
                    {option.values.map((value) => (
                      <Pressable
                        key={value}
                        style={[styles.segment, value === current && styles.segmentActive]}
                        onPress={() => setBoardOption(project.id, selected.uid, option.id, value)}
                      >
                        <Text style={[styles.segmentText, value === current && styles.segmentTextActive]}>
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
            <View style={styles.selectionActions}>
              {!isController && (
                <Pressable
                  style={({ pressed }) => [styles.secondary, styles.dangerButton, pressed && styles.pressed]}
                  onPress={() => {
                    removeBoard(project.id, selected.uid);
                    setSelectedUid(null);
                  }}
                >
                  <Text style={styles.dangerText}>{t('schematic.remove')}</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                onPress={() => setSelectedUid(null)}
              >
                <Text style={styles.secondaryText}>{t('schematic.close')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={() => setPickerOpen(true)}
          >
            <Text style={styles.primaryText}>+ {t('schematic.addBoard')}</Text>
          </Pressable>
        )}
      </View>

      <BoardPicker
        visible={pickerOpen}
        project={project}
        onClose={() => setPickerOpen(false)}
        onPick={(boardId) => {
          // Select the new board right away so its options (if any) are in front of the user.
          setSelectedUid(addBoard(project.id, boardId));
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  canvas: { flex: 1 },
  bar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  selection: { gap: 12 },
  selectionText: { gap: 4 },
  selectionName: { color: colors.text, fontSize: 17, fontWeight: '600' },
  selectionActions: { flexDirection: 'row', gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  segments: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  segment: { minWidth: 48, paddingVertical: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  segmentTextActive: { color: colors.accentText },
  muted: { color: colors.textMuted, fontSize: 14 },
  primary: { paddingVertical: 16, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center' },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  secondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  dangerButton: { borderColor: colors.danger },
  dangerText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
