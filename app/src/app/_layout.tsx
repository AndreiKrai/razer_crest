import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AccountButton } from '@/auth/AccountButton';
import { AuthProvider } from '@/auth/AuthProvider';
import { LinkProvider } from '@/ble/LinkProvider';
import { t } from '@/i18n';
import { useTemplateFonts } from '@/design/fonts';
import { HeaderTitle, ScreenFrame, useRouteTheme } from '@/design/ScreenFrame';
import { fontFor } from '@/design/ThemeProvider';
import { ProjectsProvider, useProjects } from '@/project/store';

// Keep the splash screen up until the saved projects and the template fonts are loaded, so the list never flashes
// empty or in the wrong font.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function HideSplashWhenReady({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useProjects();
  useEffect(() => {
    if (ready && fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, fontsReady]);
  return null;
}

export default function RootLayout() {
  const fontsReady = useTemplateFonts();
  return (
    <AuthProvider>
    <ProjectsProvider>
      <HideSplashWhenReady fontsReady={fontsReady} />
      <LinkProvider>
        <StatusBar style="light" />
        <AppStack />
      </LinkProvider>
    </ProjectsProvider>
    </AuthProvider>
  );
}

function AppStack() {
  const themeFor = useRouteTheme();
  return (
    <Stack
      // Each screen wears its project's template (design/ScreenFrame.tsx).
      screenLayout={({ route, children }) => <ScreenFrame theme={themeFor(route)}>{children}</ScreenFrame>}
      screenOptions={({ route }) => {
        const theme = themeFor(route);
        return {
          // Screens pad their content by the header's height (useHeaderHeight), so it floats over them.
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: theme.colors.text,
          headerTitle: ({ children }) => <HeaderTitle theme={theme}>{children}</HeaderTitle>,
          headerBackTitleStyle: fontFor(theme, { fontSize: 17 }),
          contentStyle: { backgroundColor: theme.colors.background },
        };
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: t('projects.title'), headerRight: () => <AccountButton /> }}
      />
      <Stack.Screen name="account" options={{ title: t('auth.title') }} />
      <Stack.Screen name="project/new" options={{ title: t('newProject.title') }} />
      <Stack.Screen name="project/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/effects" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/play" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/play-button" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/hardware" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/modules" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/actions" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/action" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/scenarios" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/scenario" options={{ title: '' }} />
      <Stack.Screen name="project/[id]/connect" options={{ title: t('connect.title') }} />
      <Stack.Screen name="project/[id]/debug" options={{ title: t('debug.title') }} />
    </Stack>
  );
}
