import {
  authSessionDataSchema,
  type AuthRoleType,
  type AuthenticatedUser,
  type RequestId
} from '@sadat-real-estate/contracts';
import { BrowserAuthSync, type AuthSyncAdapter } from './sync.ts';

export type AuthStatus = 'anonymous' | 'refreshing' | 'authenticated' | 'error';

export interface AuthErrorState {
  readonly kind: 'refresh_failed';
  readonly requestId?: RequestId;
}

export interface AuthSnapshot {
  readonly status: AuthStatus;
  readonly user?: Readonly<AuthenticatedUser>;
  readonly availableActions: readonly string[];
  readonly error?: AuthErrorState;
}

export type AuthRouteSession =
  | { readonly status: 'anonymous' }
  | {
      readonly status: 'authenticated';
      readonly role: AuthRoleType;
      readonly availableActions: readonly string[];
    };

export interface AuthStoreOptions {
  sync?: AuthSyncAdapter;
}

export interface ClearAuthOptions {
  broadcast?: boolean;
}

type AuthListener = (snapshot: AuthSnapshot) => void;

const MAX_AVAILABLE_ACTIONS = 256;
const MAX_AVAILABLE_ACTION_LENGTH = 128;

function freezeActions(actions: readonly string[]): readonly string[] {
  return Object.freeze([...actions]);
}

function anonymousSnapshot(): AuthSnapshot {
  return Object.freeze({
    status: 'anonymous' as const,
    availableActions: freezeActions([])
  });
}

function normalizeAvailableActions(value: unknown): readonly string[] {
  if (value === undefined) return freezeActions([]);
  if (!Array.isArray(value)) throw new TypeError('availableActions must be an array.');
  if (value.length > MAX_AVAILABLE_ACTIONS) throw new TypeError('availableActions is too large.');

  const actions: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') throw new TypeError('availableActions must contain strings.');
    const action = item.trim();
    if (!action || action.length > MAX_AVAILABLE_ACTION_LENGTH || /[\u0000-\u001f\u007f]/u.test(action)) {
      throw new TypeError('availableActions contains an invalid action.');
    }
    if (!seen.has(action)) {
      seen.add(action);
      actions.push(action);
    }
  }
  return freezeActions(actions);
}

function authenticatedSnapshot(
  user: AuthenticatedUser,
  availableActions: readonly string[]
): AuthSnapshot {
  return Object.freeze({
    status: 'authenticated' as const,
    user: Object.freeze({ ...user }),
    availableActions: freezeActions(availableActions)
  });
}

export class AuthStore {
  private readonly sync: AuthSyncAdapter;
  private readonly listeners = new Set<AuthListener>();
  private readonly unsubscribeSync: () => void;
  private accessToken: string | undefined;
  private snapshot: AuthSnapshot = anonymousSnapshot();
  private disposed = false;

  constructor(options: AuthStoreOptions = {}) {
    this.sync = options.sync ?? new BrowserAuthSync();
    this.unsubscribeSync = this.sync.subscribe(() => {
      this.clear({ broadcast: false });
    });
  }

  getSnapshot(): AuthSnapshot {
    return this.snapshot;
  }

  subscribe(listener: AuthListener): () => void {
    if (this.disposed) return () => undefined;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  beginRefresh(): AuthSnapshot {
    this.accessToken = undefined;
    this.setSnapshot(Object.freeze({
      status: 'refreshing' as const,
      availableActions: freezeActions([])
    }));
    return this.snapshot;
  }

  setSession(session: unknown, availableActions?: unknown): AuthSnapshot {
    const parsedSession = authSessionDataSchema.parse(session);
    const normalizedActions = normalizeAvailableActions(availableActions);
    this.accessToken = parsedSession.accessToken;
    this.setSnapshot(authenticatedSnapshot(parsedSession.user, normalizedActions));
    return this.snapshot;
  }

  setAvailableActions(availableActions: unknown): AuthSnapshot {
    const normalizedActions = normalizeAvailableActions(availableActions);
    if (this.snapshot.status !== 'authenticated' || this.snapshot.user === undefined) return this.snapshot;
    this.setSnapshot(authenticatedSnapshot(this.snapshot.user, normalizedActions));
    return this.snapshot;
  }

  setError(requestId?: RequestId): AuthSnapshot {
    this.accessToken = undefined;
    const error: AuthErrorState = requestId === undefined
      ? { kind: 'refresh_failed' }
      : { kind: 'refresh_failed', requestId };
    this.setSnapshot(Object.freeze({
      status: 'error' as const,
      availableActions: freezeActions([]),
      error
    }));
    return this.snapshot;
  }

  clear(options: ClearAuthOptions = {}): AuthSnapshot {
    this.accessToken = undefined;
    this.setSnapshot(anonymousSnapshot());
    if (options.broadcast ?? true) this.sync.publishLogout();
    return this.snapshot;
  }

  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  getAuthorizationHeader(): string | undefined {
    return this.accessToken === undefined ? undefined : `Bearer ${this.accessToken}`;
  }

  hasRole(role: AuthRoleType): boolean {
    return this.snapshot.status === 'authenticated' && this.snapshot.user?.roleType === role;
  }

  hasAvailableAction(action: string): boolean {
    return this.snapshot.status === 'authenticated' && this.snapshot.availableActions.includes(action);
  }

  getRouteSession(): AuthRouteSession {
    if (this.snapshot.status !== 'authenticated' || this.snapshot.user === undefined) {
      return { status: 'anonymous' };
    }
    return {
      status: 'authenticated',
      role: this.snapshot.user.roleType,
      availableActions: this.snapshot.availableActions
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeSync();
    this.sync.close();
    this.listeners.clear();
    this.accessToken = undefined;
  }

  private setSnapshot(snapshot: AuthSnapshot): void {
    if (this.disposed) return;
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
