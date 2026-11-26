import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import type { Theme } from '../tokens';
import { SpaceBackground } from './SpaceBackground';

/** The template's animated backdrop. Runs only while its screen is focused, the app is in front and motion is allowed. */
export function AmbientBackground({ theme }: { theme: Theme }) {
  const focused = useIsFocused();
  const reducedMotion = useReducedMotion();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);

  const active = focused && foreground && !reducedMotion;
  if (theme.id === 'space') return <SpaceBackground active={active} />;
  return null;
}
