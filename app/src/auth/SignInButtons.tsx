import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { colors } from '@/theme';

import { useAuth } from './AuthProvider';
import type { SignInProvider } from './service';

/** One-tap Sign in with Apple / Google. Both are always offered together (App Store guideline 4.8). */
export function SignInButtons({ onSignedIn }: { onSignedIn?: () => void }) {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState<SignInProvider | null>(null);

  const start = async (provider: SignInProvider) => {
    setBusy(provider);
    try {
      await signIn(provider);
      onSignedIn?.();
    } catch {
      Alert.alert(t('auth.failedTitle'), t('auth.failedMessage'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.column}>
      <Button
        icon="apple"
        label={t('auth.signInApple')}
        busy={busy === 'apple'}
        disabled={busy !== null}
        onPress={() => start('apple')}
      />
      <Button
        icon="google"
        label={t('auth.signInGoogle')}
        busy={busy === 'google'}
        disabled={busy !== null}
        onPress={() => start('google')}
      />
    </View>
  );
}

function Button({
  icon,
  label,
  busy,
  disabled,
  onPress,
}: {
  icon: 'apple' | 'google';
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [styles.button, disabled && !busy && styles.dimmed, pressed && styles.pressed]}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      )}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { gap: 10 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.text, fontSize: 17, fontWeight: '600' },
  dimmed: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
});
