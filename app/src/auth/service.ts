export type SignInProvider = 'apple' | 'google';

export type AuthUser = {
  id: string;
  // 'anonymous' is the silent account every install starts with (docs/AUTHENTICATION.md §3).
  provider: 'anonymous' | SignInProvider;
};

/** The seam between the UI and the identity backend. Today only MockAuthService implements it. */
export interface AuthService {
  getUser(): AuthUser;
  subscribe(listener: () => void): () => void;
  /** Links the anonymous account to the chosen provider; rejects when the user cancels or it fails. */
  signIn(provider: SignInProvider): Promise<void>;
  /** Back to a fresh anonymous account. */
  signOut(): Promise<void>;
}
