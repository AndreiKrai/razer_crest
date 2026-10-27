import type { Category, PinKind } from '@/catalog/boards';

// One dark "blueprint" palette for the whole app while it's a concept.
export const colors = {
  background: '#0b1220',
  surface: '#131c2e',
  surfaceRaised: '#1b2640',
  border: '#2a3754',
  text: '#e6edf7',
  textMuted: '#8b9bb8',
  accent: '#38bdf8',
  accentText: '#04121f',
  danger: '#f87171',
  grid: '#1c2943',
  board: '#101a2c',
  chip: '#1f2b45',
  pinFree: '#3b4a6b',
  pinUsed: '#e2b33c',
};

export const categoryColors: Record<Category, string> = {
  controller: '#38bdf8',
  lighting: '#facc15',
  motors: '#34d399',
  power: '#fb923c',
  servo: '#a78bfa',
  sound: '#f472b6',
  sensors: '#2dd4bf',
};

const signalColors = ['#22d3ee', '#a78bfa', '#facc15', '#34d399', '#f472b6', '#60a5fa', '#fb923c', '#c084fc'];

export function wireColor(kind: PinKind, signalIndex: number): string {
  if (kind === 'gnd') return '#64748b';
  if (kind === 'power') return '#ef4444';
  if (kind === 'battery') return '#f97316';
  return signalColors[signalIndex % signalColors.length];
}
