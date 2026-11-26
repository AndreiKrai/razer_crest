import type { TextStyle } from 'react-native';

import type { Category, PinKind } from '@/catalog/boards';

/** Stable ids saved in projects (`Project.designTemplate`); never rename one. */
export type TemplateId = 'blueprint' | 'space';

export type Colors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  // A second highlight: progress, wires, "connected".
  secondary: string;
  // Soft light around active or pressed elements.
  glow: string;
  danger: string;
  // Dims the screen behind a sheet.
  backdrop: string;
  // Laid over a user's background image so text stays readable.
  shade: string;
  // Play button tiles, drawn over the background image.
  tile: string;
  // Schematic.
  grid: string;
  board: string;
  chip: string;
  pinFree: string;
  pinUsed: string;
};

export type FontWeight = NonNullable<TextStyle['fontWeight']>;

export type Typography = {
  // Font family per weight; absent = the system font. Glyphs a font lacks (Cyrillic) fall back to the system font.
  family?: (weight: FontWeight | undefined) => string;
  // Applied on top of titles (screen titles, header, sheet titles) by makeStyles' `heading` helper.
  heading: { textTransform?: TextStyle['textTransform']; fontWeight?: FontWeight; letterSpacingEm?: number };
};

export type Motion = {
  // Scale of a tappable while pressed.
  pressScale: number;
  // Draw the template's ambient background behind every screen.
  ambient: boolean;
  // Play buttons throw a short burst of particles when tapped.
  burst: boolean;
  // Strongest glow of a running Play button's pulse (0..1); a calm template keeps it low.
  runPulse: number;
};

export type Shape = {
  // Size of the cut top-right corner of Play tiles; 0 = a plain rounded square.
  tileCut: number;
};

export type Theme = {
  id: TemplateId;
  // Status bar content colour.
  statusBar: 'light' | 'dark';
  colors: Colors;
  category: Record<Category, string>;
  wire: { gnd: string; power: string; battery: string; signals: string[] };
  typography: Typography;
  motion: Motion;
  shape: Shape;
};

export function wireColor(theme: Theme, kind: PinKind, signalIndex: number): string {
  if (kind === 'gnd') return theme.wire.gnd;
  if (kind === 'power') return theme.wire.power;
  if (kind === 'battery') return theme.wire.battery;
  return theme.wire.signals[signalIndex % theme.wire.signals.length];
}
