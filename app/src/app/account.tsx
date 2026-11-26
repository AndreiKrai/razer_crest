import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { SignInButtons } from '@/auth/SignInButtons';
import { t } from '@/i18n';
import { makeStyles, useTheme } from '@/design/ThemeProvider';

export default function AccountScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const headerHeight = useHeaderHeight();
  const { user, signedIn, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: headerHeight, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.card}>
        <MaterialCommunityIcons
          name={signedIn ? 'account-check' : 'account-outline'}
          size={40}
          color={signedIn ? theme.colors.accent : theme.colors.textMuted}
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

const useStyles = makeStyles((t) => ({
  container: { flex: 1, padding: 16, gap: 20 },
  card: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 14,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  status: { color: t.colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { color: t.colors.textMuted, fontSize: 14, textAlign: 'center' },
  signOut: {
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: t.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
  },
  signOutText: { color: t.colors.danger, fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.75 },
}));
