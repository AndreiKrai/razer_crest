import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';

import { MockAuthService } from './MockAuthService';
import type { AuthService } from './service';

const AuthContext = createContext<AuthService | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Swap MockAuthService for the Firebase implementation here.
  const [service] = useState<AuthService>(() => new MockAuthService());
  return <AuthContext.Provider value={service}>{children}</AuthContext.Provider>;
}

/** The current user plus signIn / signOut. `signedIn` is false for the anonymous guest. */
export function useAuth() {
  const service = useContext(AuthContext);
  if (!service) throw new Error('useAuth must be used inside AuthProvider');
  const user = useSyncExternalStore(service.subscribe, service.getUser);
  return {
    user,
    signedIn: user.provider !== 'anonymous',
    signIn: service.signIn.bind(service),
    signOut: service.signOut.bind(service),
  };
}
