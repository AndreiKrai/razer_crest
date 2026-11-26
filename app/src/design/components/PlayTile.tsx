import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { makeStyles, useTheme } from '../ThemeProvider';

const SIZE = 64;
const RADIUS = 16;
const PARTICLES = 10;
const BURST_MS = 650;

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

// A run the phone started: when (Date.now()) and for how long; `ms` null = until stopped.
export type TileRun = { startedAt: number; ms: number | null };

type Props = { icon: string; name: string; running?: TileRun; onPress: () => void };

/** One Play button: an icon tile with the name under it, in the template's shape and motion. */
export function PlayTile({ icon, name, running, onPress }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const [burst, setBurst] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const tileStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));

  const pressIn = () => {
    if (!reducedMotion) scale.set(withSpring(theme.motion.pressScale, { damping: 15, stiffness: 400 }));
    glow.set(withTiming(0.6, { duration: 90 }));
  };
  const pressOut = () => {
    scale.set(withSpring(1, { damping: 9, stiffness: 260 }));
    glow.set(withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 420 })));
  };
  const press = () => {
    if (theme.motion.burst && !reducedMotion) {
      setBurst((b) => b + 1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setBurst(0), BURST_MS);
    }
    onPress();
  };

  const cut = theme.shape.tileCut;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      style={styles.cell}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={press}
    >
      <Animated.View style={[styles.tile, tileStyle]}>
        {cut > 0 ? (
          <>
            <Svg style={StyleSheet.absoluteFill}>
              <Path d={tilePath(cut)} fill={theme.colors.tile} stroke={theme.colors.border} strokeWidth={1} />
            </Svg>
            <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
              <Svg style={StyleSheet.absoluteFill}>
                <Path d={tilePath(cut)} fill={theme.colors.glow} fillOpacity={0.14} stroke={theme.colors.glow} strokeWidth={1.5} />
              </Svg>
            </Animated.View>
          </>
        ) : (
          <>
            <View style={[StyleSheet.absoluteFill, styles.plain]} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.plainGlow, glowStyle]} />
          </>
        )}
        {running && <RunRing key={running.startedAt} startedAt={running.startedAt} ms={running.ms} />}
        <MaterialCommunityIcons name={icon as Icon} size={32} color={theme.colors.accent} />
        {burst > 0 && <Burst key={burst} color={theme.colors.secondary} />}
      </Animated.View>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The ring sits this far outside the tile.
const RING_GAP = 4;
const RING_SIZE = SIZE + RING_GAP * 2;
// The share of the outline the endless ring's comet covers.
const COMET = 0.28;
const ORBIT_MS = 1800;
const PULSE_MS = 900;

/**
 * Shows that the button's action or scenario runs: a timed run fills the outline like a timer, an endless one sends
 * a comet round it; both under a pulsing glow. With Reduce Motion it is a still outline.
 */
function RunRing({ startedAt, ms }: TileRun) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [outline] = useState(() => outlinePath(RING_SIZE, RADIUS + RING_GAP, theme.shape.tileCut && theme.shape.tileCut + 2));
  const { d, length } = outline;
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    if (ms === null) {
      progress.set(withRepeat(withTiming(1, { duration: ORBIT_MS, easing: Easing.linear }), -1));
    } else {
      // A tile mounted mid-run (the list re-created it) carries on from where the run is.
      const elapsed = Math.min(Math.max(Date.now() - startedAt, 0), ms);
      progress.set(elapsed / ms);
      progress.set(withTiming(1, { duration: ms - elapsed, easing: Easing.linear }));
    }
    pulse.set(withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(progress);
      cancelAnimation(pulse);
    };
  }, [startedAt, ms, reducedMotion, progress, pulse]);

  const ringProps = useAnimatedProps(() =>
    ms === null
      ? { strokeDasharray: [length * COMET, length * (1 - COMET)], strokeDashoffset: -length * progress.get() }
      : { strokeDasharray: [length, length], strokeDashoffset: length * (1 - progress.get()) },
  );
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.15 + pulse.get() * theme.motion.runPulse }));

  return (
    <View style={ringStyles.ring} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Svg style={StyleSheet.absoluteFill}>
          <Path d={d} fill="none" stroke={theme.colors.secondary} strokeWidth={4} strokeOpacity={0.35} />
        </Svg>
      </Animated.View>
      <Svg style={StyleSheet.absoluteFill}>
        {reducedMotion ? (
          <Path d={d} fill="none" stroke={theme.colors.secondary} strokeWidth={2} />
        ) : (
          <AnimatedPath
            d={d}
            fill="none"
            stroke={theme.colors.secondary}
            strokeWidth={2}
            strokeLinecap="round"
            animatedProps={ringProps}
          />
        )}
      </Svg>
    </View>
  );
}

/**
 * The tile outline as a path starting at the top-left, clockwise, with its exact length (for dash animations):
 * size × size, corner radius r, the top-right corner cut by `cut` (0 = rounded like the others).
 */
function outlinePath(size: number, r: number, cut: number): { d: string; length: number } {
  const a = 1;
  const b = size - 1;
  const side = b - a;
  const arc = (Math.PI * r) / 2;
  const topRight = cut > 0 ? `H${b - cut} L${b},${a + cut}` : `H${b - r} A${r},${r} 0 0 1 ${b},${a + r}`;
  const d =
    `M${a + r},${a} ${topRight} V${b - r} A${r},${r} 0 0 1 ${b - r},${b} H${a + r} ` +
    `A${r},${r} 0 0 1 ${a},${b - r} V${a + r} A${r},${r} 0 0 1 ${a + r},${a} Z`;
  const length =
    cut > 0
      ? 3 * arc + (side - r - cut) * 2 + cut * Math.SQRT2 + 2 * (side - 2 * r)
      : 4 * arc + 4 * (side - 2 * r);
  return { d, length };
}

const ringStyles = StyleSheet.create({
  ring: { position: 'absolute', left: -RING_GAP, top: -RING_GAP, width: RING_SIZE, height: RING_SIZE },
});

// A rounded square with its top-right corner cut off, inset half a pixel so the border isn't clipped.
function tilePath(cut: number): string {
  const a = 0.5;
  const b = SIZE - 0.5;
  const r = RADIUS;
  return `M${a + r},${a} H${b - cut} L${b},${a + cut} V${b - r} Q${b},${b} ${b - r},${b} H${a + r} Q${a},${b} ${a},${b - r} V${a + r} Q${a},${a} ${a + r},${a} Z`;
}

/** Star particles flying out from the tile's centre once. */
function Burst({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PARTICLES }, (_, i) => (
        <Particle key={i} index={i} color={color} />
      ))}
    </View>
  );
}

function Particle({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0);
  // Spread evenly with a little jitter, so every burst doesn't look stamped.
  const [angle] = useState(() => (index / PARTICLES) * Math.PI * 2 + (Math.random() - 0.5) * 0.5);
  const [distance] = useState(() => 38 + Math.random() * 18);
  const [size] = useState(() => 2 + Math.random() * 2.5);

  useEffect(() => {
    progress.set(withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [
      { translateX: Math.cos(angle) * distance * progress.get() },
      { translateY: Math.sin(angle) * distance * progress.get() },
      { scale: 1 - progress.get() * 0.6 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: SIZE / 2 - size / 2,
          top: SIZE / 2 - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

const useStyles = makeStyles((t) => ({
  cell: { alignItems: 'center', gap: 6 },
  tile: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  plain: { borderRadius: RADIUS, backgroundColor: t.colors.tile, borderWidth: 1, borderColor: t.colors.border },
  plainGlow: { borderRadius: RADIUS, borderWidth: 1.5, borderColor: t.colors.glow, backgroundColor: 'transparent' },
  name: { color: t.colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
}));
