import {
  Orbitron_400Regular,
  Orbitron_500Medium,
  Orbitron_600SemiBold,
  Orbitron_700Bold,
  Orbitron_800ExtraBold,
} from '@expo-google-fonts/orbitron';
import { useFonts } from 'expo-font';

/** Loads every template's fonts. True once they are ready, or failed (text then falls back to the system font). */
export function useTemplateFonts(): boolean {
  const [loaded, error] = useFonts({
    Orbitron_400Regular,
    Orbitron_500Medium,
    Orbitron_600SemiBold,
    Orbitron_700Bold,
    Orbitron_800ExtraBold,
  });
  return loaded || !!error;
}
