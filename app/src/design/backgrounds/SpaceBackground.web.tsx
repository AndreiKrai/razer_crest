import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

// Web: a still nebula gradient instead of the Skia shader, so the web bundle skips Skia's 3 MB CanvasKit.
export function SpaceBackground(_props: { active: boolean }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="nebula" cx="30%" cy="0%" r="90%">
          <Stop offset="0" stopColor="#1B1240" />
          <Stop offset="0.45" stopColor="#0B1026" />
          <Stop offset="0.85" stopColor="#05070F" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#nebula)" />
    </Svg>
  );
}
