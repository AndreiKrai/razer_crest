import type { Theme } from '../tokens';

// Font names registered by useTemplateFonts (design/fonts.ts).
const ORBITRON = {
  regular: 'Orbitron_400Regular',
  medium: 'Orbitron_500Medium',
  semibold: 'Orbitron_600SemiBold',
  bold: 'Orbitron_700Bold',
  heavy: 'Orbitron_800ExtraBold',
};

// Cold deep space: brief and sources in app/design/space/README.md.
export const space: Theme = {
  id: 'space',
  statusBar: 'light',
  colors: {
    background: '#05070F',
    surface: 'rgba(15,22,48,0.82)',
    surfaceRaised: '#18223F',
    border: '#2B3A66',
    text: '#E8EEFF',
    textMuted: '#8C9AC4',
    accent: '#8B7CFF',
    accentText: '#0A0820',
    secondary: '#5CE1E6',
    glow: '#6FA8FF',
    danger: '#FF6B81',
    backdrop: 'rgba(2,3,10,0.6)',
    shade: 'rgba(5,7,15,0.5)',
    tile: 'rgba(15,22,48,0.85)',
    grid: '#141B36',
    board: '#0C1228',
    chip: '#1A2346',
    pinFree: '#34437A',
    pinUsed: '#F5C86B',
  },
  category: {
    controller: '#8B7CFF',
    lighting: '#F5C86B',
    motors: '#5CE1E6',
    power: '#FF9E7A',
    servo: '#C59BFF',
    sound: '#FF8AD8',
    sensors: '#6FE3B4',
  },
  wire: {
    gnd: '#5B6690',
    power: '#FF6B81',
    battery: '#FF9E7A',
    signals: ['#5CE1E6', '#8B7CFF', '#F5C86B', '#6FE3B4', '#FF8AD8', '#6FA8FF', '#FF9E7A', '#C59BFF'],
  },
  typography: {
    family: (weight) => {
      switch (weight) {
        case '500':
          return ORBITRON.medium;
        case '600':
          return ORBITRON.semibold;
        case '700':
        case 'bold':
          return ORBITRON.bold;
        case '800':
        case '900':
          return ORBITRON.heavy;
        default:
          return ORBITRON.regular;
      }
    },
    heading: { textTransform: 'uppercase', fontWeight: '700', letterSpacingEm: 0.12 },
  },
  motion: { pressScale: 0.92, ambient: true, burst: true, runPulse: 0.6 },
  shape: { tileCut: 14 },
};
