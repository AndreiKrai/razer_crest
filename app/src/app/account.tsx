import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { SignInButtons } from '@/auth/SignInButtons';
import { t } from '@/i18n';
import { colors } from '@/theme';

export default function AccountScreen() {
  const { user, signedIn, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.card}>
        <MaterialCommunityIcons
          name={signedIn ? 'account-check' : 'account-outline'}
          size={40}
          color={signedIn ? colors.accent : colors.textMuted}
        />
        <Text style={styles.status}>
          {signedIn ? t(user.provider === 'apple' ? 'auth.signedInApple' : 'auth.signedInGoogle') : t('auth.guest')}
        </Text>
        <Text style={styles.hint}>{signedIn ? t('auth.signedInHint') : t('auth.guestHint')}</Text>
      </View>
      {signedIn ? (
        <Pressable style={({ pressed }) => [styles.signOut, pressed && styles.pressed]} onPress={() => signOut()}>
          <Text style={styles.signOutText}>{t('auth.signOut')}</Text>
        </Pressable>
      ) : (
        <SignInButtons />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 20 },
  card: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  status: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  signOut: {
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
