import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { PortKind } from '@/catalog/boards';

const ICONS = {
  light: 'lightbulb-on-outline',
  motor: 'engine-outline',
} as const satisfies Record<PortKind, string>;

export function KindIcon({ kind, size = 22, color }: { kind: PortKind; size?: number; color: string }) {
  return <MaterialCommunityIcons name={ICONS[kind]} size={size} color={color} />;
}
