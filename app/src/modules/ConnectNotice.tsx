import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLink } from '@/ble/LinkProvider';
import { useConnectToModel } from '@/ble/useConnectToModel';
import { t } from '@/i18n';
import type { Controller } from '@/project/types';
import { colors } from '@/theme';

type Props = {
  projectId: string;
  // The project's model; without one the button opens the search screen.
  controller?: Controller;
  // Called before leaving for the search screen, e.g. to close the sheet this notice sits in.
  onNavigate?: () => void;
};

/** "Connect to your model first" with a Connect button, the link's progress and why it failed (e.g. Bluetooth off). */
export function ConnectNotice({ projectId, controller, onNavigate }: Props) {
  const { state } = useLink();
  const { connect } = useConnectToModel(projectId, controller, onNavigate);
  const busy = state.phase === 'connecting' || state.phase === 'reconnecting';
  // The radio may be known to be off before the user has tried to connect.
  const failure = state.failure ?? (state.bluetooth === 'off' ? 'off' : null);

  return (
    <View style={styles.panel}>
      <View style={styles.title}>
        <Ionicons name="bluetooth" size={18} color={colors.accent} />
        <Text style={styles.titleText}>{t('link.needed')}</Text>
      </View>
      {busy && <Text style={styles.muted}>{t(`debug.phase.${state.phase}`)}</Text>}
      {failure && <Text style={styles.error}>{t(`debug.failed.${failure}`)}</Text>}
      {!busy && (
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={connect}>
          <Text style={styles.buttonText}>{t(controller ? 'hub.link.connect' : 'hub.link.find')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  button: { paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center' },
  buttonText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
