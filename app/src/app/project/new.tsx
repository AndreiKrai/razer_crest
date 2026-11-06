import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { pickCover } from '@/project/coverPicker';
import { useProjects } from '@/project/store';
import { TEMPLATE_IDS, templateContent, type TemplateId } from '@/project/templates';
import { MAX_PROJECT_NAME_LENGTH } from '@/project/types';
import { colors } from '@/theme';

export default function NewProjectScreen() {
  const { createProject } = useProjects();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [template, setTemplate] = useState<TemplateId>('empty');
  const trimmed = name.trim();

  // The sample's name is filled in for the user, but a name they typed themselves is left alone.
  const chooseTemplate = (id: TemplateId) => {
    setTemplate(id);
    setName((current) => {
      if (current.trim() && current !== t('template.name')) return current;
      return id === 'starship' ? t('template.name') : '';
    });
  };

  const pickImage = async () => {
    const uri = await pickCover();
    if (uri) setImageUri(uri);
  };

  const next = () => {
    if (!trimmed) return;
    const id = createProject(trimmed, imageUri, templateContent(template));
    // Replace, so "back" from the schematic returns to the project list, not to this form.
    router.replace({ pathname: '/project/[id]', params: { id } });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.form}>
        <Text style={styles.label}>{t('newProject.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('newProject.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={next}
          maxLength={MAX_PROJECT_NAME_LENGTH}
        />

        <Text style={[styles.label, styles.spaced]}>{t('newProject.templateLabel')}</Text>
        <View style={styles.chips}>
          {TEMPLATE_IDS.map((id) => (
            <Pressable
              key={id}
              style={({ pressed }) => [styles.chip, template === id && styles.chipActive, pressed && styles.pressed]}
              onPress={() => chooseTemplate(id)}
            >
              <Text style={[styles.chipText, template === id && styles.chipTextActive]}>
                {t(`newProject.template.${id}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{t(`newProject.templateHint.${template}`)}</Text>

        <Text style={[styles.label, styles.spaced]}>{t('newProject.imageLabel')}</Text>
        {imageUri ? (
          <View style={styles.imageBox}>
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
            <View style={styles.imageActions}>
              <Pressable onPress={pickImage} hitSlop={8}>
                <Text style={styles.link}>{t('newProject.changeImage')}</Text>
              </Pressable>
              <Pressable onPress={() => setImageUri(undefined)} hitSlop={8}>
                <Text style={[styles.link, styles.danger]}>{t('newProject.removeImage')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={({ pressed }) => [styles.imagePlaceholder, pressed && styles.pressed]} onPress={pickImage}>
            <Text style={styles.imagePlaceholderText}>{t('newProject.chooseImage')}</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        disabled={!trimmed}
        style={({ pressed }) => [
          styles.primary,
          { marginBottom: insets.bottom + 16 },
          !trimmed && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={next}
      >
        <Text style={styles.primaryText}>{t('newProject.next')}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  form: { padding: 16 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  spaced: { marginTop: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  chipTextActive: { color: colors.accentText },
  hint: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 17,
  },
  imagePlaceholder: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: { color: colors.accent, fontSize: 16 },
  imageBox: { gap: 10 },
  image: { width: 140, height: 140, borderRadius: 12 },
  imageActions: { flexDirection: 'row', gap: 24 },
  link: { color: colors.accent, fontSize: 15 },
  danger: { color: colors.danger },
  primary: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  primaryText: { color: colors.accentText, fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
