import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

// One full-screen shader: a slowly breathing nebula, three parallax layers of twinkling stars and a rare shooting
// star. Colours follow the Space palette (design/templates/space.ts).
const source = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float time;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1, 0)), u.x), mix(hash(i + float2(0, 1)), hash(i + float2(1, 1)), u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

half4 main(float2 pos) {
  float2 uv = pos / res.y;
  float aspect = res.x / res.y;

  float2 p = uv * 1.6 + float2(time * 0.006, time * 0.003);
  float n = fbm(p + fbm(p + time * 0.012));
  float3 col = float3(0.020, 0.027, 0.059);
  col += float3(0.130, 0.085, 0.300) * smoothstep(0.38, 0.95, n);
  col += float3(0.050, 0.110, 0.200) * smoothstep(0.55, 0.95, fbm(p * 1.7 - 3.0)) * 0.8;
  // Cold light falling from the top.
  col += float3(0.27, 0.40, 0.90) * 0.07 * smoothstep(1.1, 0.0, length(uv - float2(aspect * 0.35, -0.1)));

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 22.0 + fi * 18.0;
    float2 q = (uv + float2(time * 0.0025 * (fi + 1.0), -time * 0.001 * (fi + 1.0))) * scale;
    float2 cell = floor(q);
    float h = hash(cell + fi * 17.0);
    if (h > 0.9) {
      float2 off = float2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
      float d = length(fract(q) - 0.5 - off * 0.6);
      float size = 0.04 + 0.06 * fract(h * 13.0);
      float twinkle = 0.55 + 0.45 * sin(time * (0.8 + h * 2.5) + h * 40.0);
      float3 tint = mix(float3(0.80, 0.86, 1.0), float3(0.55, 0.90, 0.95), fract(h * 7.0));
      col += tint * smoothstep(size, 0.0, d) * twinkle * (0.45 + fi * 0.3);
    }
  }

  // A shooting star every 11 s, crossing in the first 0.9 s of its cycle.
  float cycle = floor(time / 11.0);
  float t = fract(time / 11.0) * 11.0;
  if (t < 0.9) {
    float2 start = float2(hash(float2(cycle, 1.0)) * aspect, hash(float2(cycle, 2.0)) * 0.4);
    float2 dir = normalize(float2(-1.0, 0.45));
    float2 head = start + dir * t * 0.9;
    float2 rel = uv - head;
    float along = dot(rel, -dir);
    float across = abs(rel.x * dir.y - rel.y * dir.x);
    float tail = step(0.0, along) * smoothstep(0.25, 0.0, along) * smoothstep(0.004, 0.0, across);
    col += float3(0.75, 0.90, 1.0) * tail * (1.0 - t / 0.9);
  }

  return half4(half3(col), 1.0);
}
`)!;

// The nebula drifts slowly, so 30 updates a second look the same as 60 and cost half.
const FRAME_S = 1 / 30;

/** The Space template's ambient background. Stands still while `active` is false. */
export function SpaceBackground({ active }: { active: boolean }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const time = useSharedValue(0);
  const pending = useSharedValue(0);

  const frame = useFrameCallback(({ timeSincePreviousFrame }) => {
    pending.set(pending.get() + (timeSincePreviousFrame ?? 16) / 1000);
    if (pending.get() >= FRAME_S) {
      time.set(time.get() + pending.get());
      pending.set(0);
    }
  }, false);

  useEffect(() => {
    frame.setActive(active);
  }, [active, frame]);

  const uniforms = useDerivedValue(() => ({ res: [size.width, size.height], time: time.get() }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={source} uniforms={uniforms} />
          </Fill>
        </Canvas>
      )}
    </View>
  );
}
