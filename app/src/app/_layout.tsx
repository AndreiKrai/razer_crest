import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LinkProvider } from '@/ble/LinkProvider';
import { t } from '@/i18n';
import { ProjectsProvider } from '@/project/store';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <ProjectsProvider>
      <LinkProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ title: t('projects.title') }} />
          <Stack.Screen name="project/new" options={{ title: t('newProject.title') }} />
          <Stack.Screen name="project/[id]/index" options={{ title: '' }} />
          <Stack.Screen name="project/[id]/hardware" options={{ title: '' }} />
          <Stack.Screen name="project/[id]/modules" options={{ title: '' }} />
          <Stack.Screen name="project/[id]/actions" options={{ title: '' }} />
          <Stack.Screen name="project/[id]/action" options={{ title: '' }} />
          <Stack.Screen name="project/[id]/debug" options={{ title: t('debug.title') }} />
        </Stack>
      </LinkProvider>
    </ProjectsProvider>
  );
}
