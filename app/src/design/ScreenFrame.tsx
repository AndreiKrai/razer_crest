import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useProjects } from '@/project/store';

import { AmbientBackground } from './backgrounds/AmbientBackground';
import { getTemplate } from './templates';
import { fontFor, heading, ThemeProvider } from './ThemeProvider';
import type { Theme } from './tokens';

type RouteLike = { name: string; params?: object };

/** Screens inside a project wear that project's template; all others the default one. */
export function useRouteTheme(): (route: RouteLike) => Theme {
  const { projects } = useProjects();
  return (route) => {
    const id = route.params && 'id' in route.params ? route.params.id : undefined;
    if (!route.name.startsWith('project/[id]') || typeof id !== 'string') return getTemplate(undefined);
    return getTemplate(projects.find((p) => p.id === id)?.designTemplate);
  };
}

/** Wraps every screen (Stack `screenLayout`): its template, background colour and ambient background. */
export function ScreenFrame({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <View style={[styles.frame, { backgroundColor: theme.colors.background }]}>
        {theme.motion.ambient && <AmbientBackground theme={theme} />}
        {children}
      </View>
    </ThemeProvider>
  );
}

/** The header title in the template's heading style (caps and spacing can't be set through headerTitleStyle). */
export function HeaderTitle({ theme, children }: { theme: Theme; children: string }) {
  return (
    <Text numberOfLines={1} style={[fontFor(theme, heading(theme, 17)), { color: theme.colors.text }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({ frame: { flex: 1 } });
