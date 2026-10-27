import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useProjects } from '@/project/store';
import { colors } from '@/theme';

export default function NewProjectScreen() {
  const { createProject } = useProjects();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const trimmed = name.trim();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const next = () => {
    if (!trimmed) return;
    const id = createProject(trimmed, imageUri);
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
          maxLength={40}
        />

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
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
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
