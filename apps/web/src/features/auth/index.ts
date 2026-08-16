export { AuthClient } from './client.ts';
export type {
  AuthApiClient,
  AuthenticatedOtpResult,
  AuthClientOptions,
  AuthOtpVerifyResult
} from './client.ts';
export { AuthStore } from './store.ts';
export type {
  AuthErrorState,
  AuthRouteSession,
  AuthSnapshot,
  AuthStatus,
  AuthStoreOptions,
  ClearAuthOptions
} from './store.ts';
export { BrowserAuthSync, AUTH_SYNC_CHANNEL_NAME, AUTH_SYNC_STORAGE_KEY } from './sync.ts';
export type {
  AuthSyncAdapter,
  BroadcastChannelLike,
  BrowserAuthSyncOptions,
  StorageEventSource,
  StorageLike
} from './sync.ts';
