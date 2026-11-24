import type { AuthService, AuthUser, SignInProvider } from './service';

function anonymousUser(): AuthUser {
  return { id: 'mock-' + Math.random().toString(36).slice(2, 10), provider: 'anonymous' };
}

/** In-memory stand-in until Firebase Auth is wired in: nothing is stored, a restart is a fresh guest. */
export class MockAuthService implements AuthService {
  private user = anonymousUser();
  private listeners = new Set<() => void>();

  getUser = () => this.user;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  async signIn(provider: SignInProvider) {
    await delay(400);
    this.set({ id: this.user.id, provider });
  }

  async signOut() {
    await delay(150);
    this.set(anonymousUser());
  }

  private set(user: AuthUser) {
    this.user = user;
    this.listeners.forEach((listener) => listener());
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
