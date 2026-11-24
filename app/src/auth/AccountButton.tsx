import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { t } from '@/i18n';
import { colors } from '@/theme';

import { useAuth } from './AuthProvider';

/** Header button on the project list that opens the account screen. */
export function AccountButton() {
  const { signedIn } = useAuth();
  return (
    <Pressable accessibilityLabel={t('auth.title')} hitSlop={10} onPress={() => router.push('/account')}>
      <MaterialCommunityIcons
        name={signedIn ? 'account-check' : 'account-circle-outline'}
        size={26}
        color={signedIn ? colors.accent : colors.text}
      />
    </Pressable>
  );
}
