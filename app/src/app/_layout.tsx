import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AccountButton } from '@/auth/AccountButton';
import { AuthProvider } from '@/auth/AuthProvider';
import { LinkProvider } from '@/ble/LinkProvider';
import { t } from '@/i18n';
import { ProjectsProvider, useProjects } from '@/project/store';
import { colors } from '@/theme';

// Keep the splash screen up until the saved projects are loaded, so the list never flashes empty.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function HideSplashWhenReady() {
  const { ready } = useProjects();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
    <ProjectsProvider>
      <HideSplashWhenReady />
      <LinkProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            // Screens pad their content by the header's height (useHeaderHeight), so it floats over them.
            headerTransparent: true,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            contentStyle: { backgroundColor: colors.background },
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
      </LinkProvider>
    </ProjectsProvider>
    </AuthProvider>
  );
}
