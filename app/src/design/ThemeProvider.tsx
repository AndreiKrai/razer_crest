import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { getTemplate } from './templates';
import type { Theme } from './tokens';

const ThemeContext = createContext<Theme>(getTemplate(undefined));

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** A title's look on the current template: size plus the template's heading treatment (caps, spacing). */
export function heading(theme: Theme, fontSize: number): TextStyle {
  const { textTransform, fontWeight = '700', letterSpacingEm } = theme.typography.heading;
  return {
    fontSize,
    fontWeight,
    ...(textTransform && { textTransform }),
    ...(letterSpacingEm && { letterSpacing: fontSize * letterSpacingEm }),
  };
}

type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Styles that follow the current template. Every text style (one with a fontSize) gets the template's font for its
 * weight; the weight itself is dropped then, since the family already carries it (Android would fake-bold it).
 */
export function makeStyles<S extends Styles>(factory: (theme: Theme) => S & Styles): () => Readonly<S> {
  const cache = new WeakMap<Theme, Readonly<S>>();
  const build = (theme: Theme): Readonly<S> => {
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(withFonts(theme, factory(theme))) as Readonly<S>;
      cache.set(theme, styles);
    }
    return styles;
  };
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => build(theme), [theme]);
  };
}

function withFonts<T extends object>(theme: Theme, styles: T): T {
  const family = theme.typography.family;
  if (!family) return styles;
  const out: Record<string, unknown> = {};
  for (const [key, style] of Object.entries(styles)) {
    if (style && typeof style === 'object' && 'fontSize' in style && !('fontFamily' in style)) {
      const { fontWeight, ...rest } = style as TextStyle;
      out[key] = { ...rest, fontFamily: family(fontWeight) };
    } else {
      out[key] = style;
    }
  }
  return out as T;
}

/** For one-off text styles built in render (header titles, inline styles). */
export function fontFor(theme: Theme, style: TextStyle): TextStyle {
  const family = theme.typography.family;
  if (!family) return style;
  const { fontWeight, ...rest } = style;
  return { ...rest, fontFamily: family(fontWeight) };
}
