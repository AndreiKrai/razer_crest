import { router } from 'expo-router';

import type { Controller } from '@/project/types';

import { useLink } from './LinkProvider';

/**
 * How a screen reaches the project's model: `connect` goes straight to the saved model, or opens the search screen
 * when there is none yet; `find` always opens the search screen. onNavigate runs before leaving (e.g. close a sheet).
 */
export function useConnectToModel(projectId: string, controller?: Controller, onNavigate?: () => void) {
  const { link } = useLink();

  const find = () => {
    onNavigate?.();
    router.push({ pathname: '/project/[id]/connect', params: { id: projectId } });
  };

  const connect = () => {
    if (controller) link.connect(controller.bleId);
    else find();
  };

  return { connect, find };
}
