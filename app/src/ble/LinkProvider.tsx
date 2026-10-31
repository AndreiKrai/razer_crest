import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';

import { createTransport } from './createTransport';
import { LinkController } from './LinkController';

const LinkContext = createContext<LinkController | null>(null);

export function LinkProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new LinkController(createTransport()));
  return <LinkContext.Provider value={controller}>{children}</LinkContext.Provider>;
}

/** The link state plus the controller with its commands. */
export function useLink() {
  const link = useContext(LinkContext);
  if (!link) throw new Error('useLink must be used inside LinkProvider');
  const state = useSyncExternalStore(link.subscribe, link.getState);
  return { state, link };
}
