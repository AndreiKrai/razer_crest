import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLink } from '@/ble/LinkProvider';
import { isValidDeviceName, MAX_NAME_BYTES, SHIP_STATUSES } from '@/ble/protocol';
import { t } from '@/i18n';
import { colors } from '@/theme';

/** Hidden helper for talking to the model: connect, set statuses, stop everything, rename. */
export default function DebugScreen() {
  const { state, link } = useLink();
  const [name, setName] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const connected = state.phase === 'connected';
  const busy = state.phase === 'connecting' || state.phase === 'reconnecting';

  const report = (error: string | null) =>
    setResult(error ? t('debug.commandFailed', { code: error }) : t('debug.commandOk'));

  const rename = async () => {
    report(await link.rename(name));
    setName('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {state.simulated && <Text style={styles.notice}>{t('debug.simulated')}</Text>}

      <Text style={styles.section}>{t('debug.connection')}</Text>
      <Text style={styles.text}>{t(`debug.phase.${state.phase}`)}</Text>
      {state.failure && <Text style={styles.error}>{t(`debug.failed.${state.failure}`)}</Text>}

      {connected && state.device && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{state.device.name}</Text>
          <Text style={styles.muted}>{t('debug.firmware', { version: state.device.fw })}</Text>
        </View>
      )}

      {state.phase === 'idle' && (
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={link.scan}>
          <Text style={styles.buttonText}>{t('debug.scan')}</Text>
        </Pressable>
      )}
      {state.phase === 'scanning' && (
        <>
          <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={link.stopScan}>
            <Text style={styles.secondaryText}>{t('debug.stopScan')}</Text>
          </Pressable>
          {state.devices.length === 0 && <Text style={styles.muted}>{t('debug.noDevices')}</Text>}
          {state.devices.map((device) => (
            <Pressable
              key={device.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => link.connect(device.id)}
            >
              <Text style={styles.cardTitle}>{device.name || t('debug.unnamed')}</Text>
            </Pressable>
          ))}
        </>
      )}
      {(connected || busy) && (
        <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} onPress={link.disconnect}>
          <Text style={styles.secondaryText}>{t('debug.disconnect')}</Text>
        </Pressable>
      )}

      {connected && (
        <>
          <Text style={styles.section}>{t('debug.status')}</Text>
          <View style={styles.chips}>
            {SHIP_STATUSES.map((status) => (
              <Pressable
                key={status}
                style={({ pressed }) => [
                  styles.chip,
                  state.shipStatus === status && styles.chipActive,
                  pressed && styles.pressed,
                ]}
                onPress={async () => report(await link.setStatus(status))}
              >
                <Text style={[styles.chipText, state.shipStatus === status && styles.chipTextActive]}>
                  {t(`status.${status}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
            onPress={async () => report(await link.stopAll())}
          >
            <Text style={styles.stopText}>{t('debug.stopAll')}</Text>
          </Pressable>

          <Text style={styles.section}>{t('debug.rename')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={state.device?.name}
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_NAME_BYTES}
            autoCorrect={false}
          />
          <Text style={styles.muted}>{t('debug.renameHint')}</Text>
          <Pressable
            disabled={!isValidDeviceName(name)}
            style={({ pressed }) => [styles.button, !isValidDeviceName(name) && styles.disabled, pressed && styles.pressed]}
            onPress={rename}
          >
            <Text style={styles.buttonText}>{t('debug.renameButton')}</Text>
          </Pressable>

          {result && <Text style={styles.muted}>{result}</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  notice: { color: colors.textMuted, fontSize: 13, padding: 12, borderRadius: 12, backgroundColor: colors.surface },
  section: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 8 },
  text: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 14 },
  card: {
    gap: 4,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  button: { paddingVertical: 14, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center' },
  buttonText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  secondary: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '600' },
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
  stop: { paddingVertical: 16, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center' },
  stopText: { color: colors.accentText, fontSize: 18, fontWeight: '800' },
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
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
