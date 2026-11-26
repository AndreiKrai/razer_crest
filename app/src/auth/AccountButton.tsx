import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { t } from '@/i18n';
import { useTheme } from '@/design/ThemeProvider';

import { useAuth } from './AuthProvider';

/** Header button on the project list that opens the account screen. */
export function AccountButton() {
  const theme = useTheme();
  const { signedIn } = useAuth();
  return (
    <Pressable accessibilityLabel={t('auth.title')} hitSlop={10} onPress={() => router.push('/account')}>
      <MaterialCommunityIcons
        name={signedIn ? 'account-check' : 'account-circle-outline'}
        size={26}
        color={signedIn ? theme.colors.accent : theme.colors.text}
      />
    </Pressable>
  );
}
