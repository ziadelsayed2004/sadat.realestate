export const AUTH_SYNC_CHANNEL_NAME = 'sadat-real-estate.auth' as const;
export const AUTH_SYNC_STORAGE_KEY = 'sadat-real-estate.auth.logout' as const;

const AUTH_SYNC_MESSAGE_TYPE = 'logout' as const;

type SyncListener = () => void;
type MessageEventLike = { readonly data: unknown };
type MessageListener = (event: MessageEventLike) => void;
type StorageListener = (event: StorageEvent) => void;

export interface AuthSyncAdapter {
  subscribe(listener: SyncListener): () => void;
  publishLogout(): void;
  close(): void;
}

export interface BroadcastChannelLike {
  addEventListener(type: 'message', listener: MessageListener): void;
  removeEventListener(type: 'message', listener: MessageListener): void;
  postMessage(message: unknown): void;
  close(): void;
}

export interface StorageLike {
  setItem(key: string, value: string): void;
}

export interface StorageEventSource {
  addEventListener(type: 'storage', listener: StorageListener): void;
  removeEventListener(type: 'storage', listener: StorageListener): void;
}

export interface BrowserAuthSyncOptions {
  channelFactory?: (name: string) => BroadcastChannelLike;
  sourceId?: string;
  storage?: StorageLike;
  storageEventSource?: StorageEventSource;
}

type BrowserWindow = Window & {
  readonly BroadcastChannel?: new (name: string) => BroadcastChannelLike;
};

interface AuthSyncMessage {
  readonly type: typeof AUTH_SYNC_MESSAGE_TYPE;
  readonly sourceId: string;
  readonly nonce: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSyncMessage(value: unknown): value is AuthSyncMessage {
  return isRecord(value)
    && value.type === AUTH_SYNC_MESSAGE_TYPE
    && typeof value.sourceId === 'string'
    && value.sourceId.length > 0
    && value.sourceId.length <= 128
    && typeof value.nonce === 'string'
    && value.nonce.length > 0
    && value.nonce.length <= 128;
}

function parseSyncMessage(value: unknown): AuthSyncMessage | undefined {
  if (typeof value !== 'string') return isSyncMessage(value) ? value : undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isSyncMessage(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function randomIdentifier(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function browserWindow(): BrowserWindow | undefined {
  return typeof window === 'undefined' ? undefined : window as BrowserWindow;
}

function defaultChannelFactory(view: BrowserWindow | undefined): ((name: string) => BroadcastChannelLike) | undefined {
  const BroadcastChannelConstructor = view?.BroadcastChannel;
  if (typeof BroadcastChannelConstructor !== 'function') return undefined;
  return (name: string) => new BroadcastChannelConstructor(name);
}

function defaultStorage(view: BrowserWindow | undefined): StorageLike | undefined {
  if (view === undefined) return undefined;
  try {
    return view.localStorage;
  } catch {
    return undefined;
  }
}

function defaultStorageEventSource(view: BrowserWindow | undefined): StorageEventSource | undefined {
  if (view === undefined) return undefined;
  return {
    addEventListener: (type, listener) => view.addEventListener(type, listener),
    removeEventListener: (type, listener) => view.removeEventListener(type, listener)
  };
}

export class BrowserAuthSync implements AuthSyncAdapter {
  private readonly sourceId: string;
  private readonly channel: BroadcastChannelLike | undefined;
  private readonly storage: StorageLike | undefined;
  private readonly storageEventSource: StorageEventSource | undefined;
  private readonly listeners = new Set<SyncListener>();
  private readonly messageListener: MessageListener | undefined;
  private readonly storageListener: StorageListener | undefined;
  private closed = false;

  constructor(options: BrowserAuthSyncOptions = {}) {
    const view = browserWindow();
    this.sourceId = options.sourceId ?? randomIdentifier('auth-tab');

    let channel: BroadcastChannelLike | undefined;
    const channelFactory = options.channelFactory ?? defaultChannelFactory(view);
    if (channelFactory !== undefined) {
      try {
        channel = channelFactory(AUTH_SYNC_CHANNEL_NAME);
      } catch {
        channel = undefined;
      }
    }
    this.channel = channel;

    if (channel !== undefined) {
      this.messageListener = (event) => this.handleMessage(event.data);
      channel.addEventListener('message', this.messageListener);
      this.storage = undefined;
      this.storageEventSource = undefined;
      this.storageListener = undefined;
      return;
    }

    this.messageListener = undefined;
    this.storage = options.storage ?? defaultStorage(view);
    this.storageEventSource = options.storageEventSource ?? defaultStorageEventSource(view);
    if (this.storage !== undefined && this.storageEventSource !== undefined) {
      this.storageListener = (event) => {
        if (event.key === AUTH_SYNC_STORAGE_KEY) this.handleMessage(event.newValue);
      };
      this.storageEventSource.addEventListener('storage', this.storageListener);
    } else {
      this.storageListener = undefined;
    }
  }

  subscribe(listener: SyncListener): () => void {
    if (this.closed) return () => undefined;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publishLogout(): void {
    if (this.closed) return;
    const message: AuthSyncMessage = {
      type: AUTH_SYNC_MESSAGE_TYPE,
      sourceId: this.sourceId,
      nonce: randomIdentifier('logout')
    };

    if (this.channel !== undefined) {
      try {
        this.channel.postMessage(message);
      } catch {
        // A closed or unavailable channel cannot make local logout unsafe.
      }
      return;
    }

    if (this.storage !== undefined) {
      try {
        this.storage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(message));
      } catch {
        // Storage may be disabled by browser privacy settings.
      }
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.channel !== undefined) {
      if (this.messageListener !== undefined) {
        this.channel.removeEventListener('message', this.messageListener);
      }
      try {
        this.channel.close();
      } catch {
        // Closing an already closed channel is harmless.
      }
    }
    if (this.storageEventSource !== undefined && this.storageListener !== undefined) {
      this.storageEventSource.removeEventListener('storage', this.storageListener);
    }
    this.listeners.clear();
  }

  private handleMessage(value: unknown): void {
    const message = parseSyncMessage(value);
    if (message === undefined || message.sourceId === this.sourceId || this.closed) return;
    for (const listener of this.listeners) listener();
  }
}
