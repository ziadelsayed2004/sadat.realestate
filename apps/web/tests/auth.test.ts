import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiClientError,
  type ApiClientResponse,
  type ApiRequestOptions
} from '../src/features/contracts/index.ts';
import {
  AuthClient,
  AuthStore,
  BrowserAuthSync,
  type AuthApiClient,
  type AuthSyncAdapter,
  type BroadcastChannelLike
} from '../src/features/auth/index.ts';
import { guardRoute } from '../src/features/routing/index.ts';
import { resolveRoute } from '../src/routes/route-table.ts';
import type {
  AuthSessionData,
  OtpVerifyData,
  RequestId
} from '@sadat-real-estate/contracts';

const REQUEST_ID = 'auth-test-request';
const USER_ID = 'a'.repeat(24);

function session(roleType: AuthSessionData['user']['roleType'] = 'admin', accessToken = 'header.payload.signature'): AuthSessionData {
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresInSeconds: 900,
    user: { id: USER_ID, roleType, status: 'verified' }
  };
}

function response<T>(data: T): ApiClientResponse<{ data: T; meta: { requestId: RequestId } }> {
  return {
    data: { data, meta: { requestId: REQUEST_ID } },
    requestId: REQUEST_ID,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' })
  };
}

type FakeResponder = (
  path: string,
  options: ApiRequestOptions<unknown>
) => Promise<ApiClientResponse<unknown>>;

class FakeApiClient implements AuthApiClient {
  readonly calls: Array<{ path: string; options: ApiRequestOptions<unknown> }> = [];

  constructor(private readonly responder: FakeResponder) {}

  request<TResponse>(path: string, options: ApiRequestOptions<TResponse>): Promise<ApiClientResponse<TResponse>> {
    this.calls.push({ path, options: options as ApiRequestOptions<unknown> });
    return this.responder(path, options as ApiRequestOptions<unknown>) as Promise<ApiClientResponse<TResponse>>;
  }
}

class TestSync implements AuthSyncAdapter {
  publishCount = 0;
  private listener: (() => void) | undefined;

  subscribe(listener: () => void): () => void {
    this.listener = listener;
    return () => {
      if (this.listener === listener) this.listener = undefined;
    };
  }

  publishLogout(): void {
    this.publishCount += 1;
  }

  emitRemoteLogout(): void {
    this.listener?.();
  }

  close(): void {
    this.listener = undefined;
  }
}

class TestChannel implements BroadcastChannelLike {
  readonly posted: unknown[] = [];
  private listener: ((event: { readonly data: unknown }) => void) | undefined;

  addEventListener(_type: 'message', listener: (event: { readonly data: unknown }) => void): void {
    this.listener = listener;
  }

  removeEventListener(_type: 'message', listener: (event: { readonly data: unknown }) => void): void {
    if (this.listener === listener) this.listener = undefined;
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  close(): void {
    this.listener = undefined;
  }

  emit(data: unknown): void {
    this.listener?.({ data });
  }
}

test('admin login normalizes input, keeps the access token in memory, and exposes a safe snapshot', async () => {
  const sync = new TestSync();
  const apiClient = new FakeApiClient(async (path, options) => {
    assert.equal(path, '/auth/login');
    assert.equal(options.method, 'POST');
    assert.deepEqual(options.json, { email: 'admin@example.com', password: 'secret' });
    return response(session());
  });
  const client = new AuthClient({ apiClient, store: new AuthStore({ sync }) });

  const snapshot = await client.loginAdmin({ email: ' ADMIN@EXAMPLE.COM ', password: 'secret' });

  assert.equal(snapshot.status, 'authenticated');
  assert.equal(snapshot.user?.roleType, 'admin');
  assert.equal(client.getAccessToken(), 'header.payload.signature');
  assert.equal(client.getAuthorizationHeader(), 'Bearer header.payload.signature');
  assert.equal('accessToken' in snapshot, false);
  assert.equal(sync.publishCount, 0);
  client.dispose();
});

test('refresh deduplicates concurrent calls and sends an empty request body', async () => {
  const sync = new TestSync();
  let resolveResponse: ((value: ApiClientResponse<unknown>) => void) | undefined;
  const pendingResponse = new Promise<ApiClientResponse<unknown>>((resolve) => {
    resolveResponse = resolve;
  });
  const apiClient = new FakeApiClient(async (path, options) => {
    assert.equal(path, '/auth/refresh');
    assert.equal(options.method, 'POST');
    assert.deepEqual(options.json, {});
    return pendingResponse;
  });
  const client = new AuthClient({ apiClient, store: new AuthStore({ sync }) });

  const first = client.refresh();
  const second = client.refresh();
  assert.equal(apiClient.calls.length, 1);
  assert.equal(client.getSnapshot().status, 'refreshing');
  resolveResponse?.(response(session('provider', 'refresh.payload.signature')));

  const [firstSnapshot, secondSnapshot] = await Promise.all([first, second]);
  assert.equal(firstSnapshot, secondSnapshot);
  assert.equal(client.getAuthorizationHeader(), 'Bearer refresh.payload.signature');
  assert.equal(sync.publishCount, 0);
  client.dispose();
});

test('invalid refresh clears the in-memory session and broadcasts logout', async () => {
  const sync = new TestSync();
  const apiClient = new FakeApiClient(async () => {
    throw new ApiClientError('refresh rejected', {
      code: 'HTTP_ERROR',
      status: 401,
      requestId: REQUEST_ID
    });
  });
  const client = new AuthClient({ apiClient, store: new AuthStore({ sync }) });
  client.store.setSession(session());

  const snapshot = await client.refresh();

  assert.equal(snapshot.status, 'anonymous');
  assert.equal(client.getAccessToken(), undefined);
  assert.equal(sync.publishCount, 1);
  client.dispose();
});

test('OTP send uses the implemented route and normalized phone contract', async () => {
  const apiClient = new FakeApiClient(async (path, options) => {
    assert.equal(path, '/auth/otp/send');
    assert.equal(options.method, 'POST');
    assert.deepEqual(options.json, {
      phone: '+201000000000',
      roleType: 'provider',
      purpose: 'registration'
    });
    return response({
      accepted: true,
      challengeId: '00000000-0000-4000-8000-000000000001',
      expiresInSeconds: 300,
      retryAfterSeconds: 30
    });
  });
  const client = new AuthClient({ apiClient, store: new AuthStore({ sync: new TestSync() }) });

  const result = await client.sendOtp({
    phone: '+20 100 000 0000',
    roleType: 'provider',
    purpose: 'registration'
  });

  assert.equal(result.accepted, true);
  assert.equal(client.getSnapshot().status, 'anonymous');
  client.dispose();
});

test('refresh failures retain a safe error state and request correlation', async () => {
  const apiClient = new FakeApiClient(async () => {
    throw new ApiClientError('network failure', {
      code: 'NETWORK_ERROR',
      requestId: REQUEST_ID
    });
  });
  const client = new AuthClient({ apiClient, store: new AuthStore({ sync: new TestSync() }) });

  await assert.rejects(client.refresh(), (error: unknown) => error instanceof ApiClientError && error.code === 'NETWORK_ERROR');
  assert.deepEqual(client.getSnapshot(), {
    status: 'error',
    availableActions: [],
    error: { kind: 'refresh_failed', requestId: REQUEST_ID }
  });
  client.dispose();
});

test('OTP verification stores authenticated sessions without exposing access tokens', async () => {
  const verifiedSession = session('seeker', 'otp.payload.signature');
  const otpResult: OtpVerifyData = { outcome: 'authenticated', ...verifiedSession };
  const apiClient = new FakeApiClient(async (path, options) => {
    assert.equal(path, '/auth/otp/verify');
    assert.deepEqual(options.json, {
      phone: '+201000000000',
      roleType: 'seeker',
      purpose: 'login',
      challengeId: '00000000-0000-4000-8000-000000000000',
      code: '123456'
    });
    return response(otpResult);
  });
  const client = new AuthClient({ apiClient, store: new AuthStore({ sync: new TestSync() }) });

  const result = await client.verifyOtp({
    phone: ' +20 100 000 0000 ',
    roleType: 'seeker',
    purpose: 'login',
    challengeId: '00000000-0000-4000-8000-000000000000',
    code: '123456'
  });

  assert.equal(result.outcome, 'authenticated');
  if (result.outcome === 'authenticated') {
    assert.equal(result.snapshot.user?.roleType, 'seeker');
    assert.equal('accessToken' in result.snapshot, false);
  }
  assert.equal(client.getAccessToken(), 'otp.payload.signature');
  client.dispose();
});

test('seeker registration uses the implemented contract and keeps verification and access tokens out of the snapshot', async () => {
  const apiClient = new FakeApiClient(async (path, options) => {
    assert.equal(path, '/auth/register/seeker');
    assert.equal(options.method, 'POST');
    assert.deepEqual(options.json, {
      verificationToken: 'A'.repeat(43),
      firstName: 'Mona',
      lastName: 'Hassan',
      locale: 'ar'
    });
    return response({ outcome: 'registered', session: session('seeker', 'registration.payload.signature') });
  });
  const client = new AuthClient({ apiClient, store: new AuthStore({ sync: new TestSync() }) });

  const snapshot = await client.registerSeeker({
    verificationToken: 'A'.repeat(43),
    firstName: ' Mona ',
    lastName: ' Hassan ',
    locale: 'ar'
  });

  assert.equal(snapshot.status, 'authenticated');
  assert.equal(snapshot.user?.roleType, 'seeker');
  assert.equal('accessToken' in snapshot, false);
  assert.equal(client.getAccessToken(), 'registration.payload.signature');
  client.dispose();
});

test('logout calls the implemented route and clears memory even when the request fails', async () => {
  const sync = new TestSync();
  const apiClient = new FakeApiClient(async (path, options) => {
    assert.equal(path, '/auth/logout');
    assert.equal(options.method, 'POST');
    assert.deepEqual(options.json, {});
    throw new ApiClientError('logout unavailable', { code: 'NETWORK_ERROR', requestId: REQUEST_ID });
  });
  const client = new AuthClient({ apiClient, store: new AuthStore({ sync }) });
  client.store.setSession(session());

  await assert.rejects(client.logout(), (error: unknown) => error instanceof ApiClientError && error.code === 'NETWORK_ERROR');
  assert.equal(client.getSnapshot().status, 'anonymous');
  assert.equal(client.getAccessToken(), undefined);
  assert.equal(sync.publishCount, 1);
  client.dispose();
});

test('server-provided availableActions control permissions without role inference', () => {
  const store = new AuthStore({ sync: new TestSync() });
  store.setSession(session('admin'));
  store.setAvailableActions(['properties.view', 'properties.view']);

  assert.equal(store.hasRole('admin'), true);
  assert.equal(store.hasRole('provider'), false);
  assert.equal(store.hasAvailableAction('properties.view'), true);
  assert.equal(store.hasAvailableAction('properties.edit'), false);
  assert.deepEqual(store.getRouteSession(), {
    status: 'authenticated',
    role: 'admin',
    availableActions: ['properties.view']
  });
  const adminGuard = guardRoute(resolveRoute('/admin/users'), store.getRouteSession());
  assert.equal(adminGuard.allowed, true);

  store.setSession(session('seeker'));
  const seekerGuard = guardRoute(resolveRoute('/admin/users'), store.getRouteSession());
  assert.equal(seekerGuard.allowed, false);
  if (!seekerGuard.allowed) assert.equal(seekerGuard.reason, 'forbidden');
  assert.equal(store.hasAvailableAction('properties.view'), false);
  store.dispose();
});

test('remote logout clears local memory without rebroadcasting, while local clear publishes', () => {
  const sync = new TestSync();
  const store = new AuthStore({ sync });
  store.setSession(session());
  sync.emitRemoteLogout();
  assert.equal(store.getSnapshot().status, 'anonymous');
  assert.equal(sync.publishCount, 0);

  store.setSession(session());
  store.clear();
  assert.equal(sync.publishCount, 1);
  assert.equal(store.getAccessToken(), undefined);
  store.dispose();
});

test('browser auth sync accepts foreign logout messages and never publishes a token', () => {
  const channel = new TestChannel();
  const sync = new BrowserAuthSync({
    channelFactory: () => channel,
    sourceId: 'local-tab'
  });
  let remoteLogouts = 0;
  sync.subscribe(() => {
    remoteLogouts += 1;
  });

  channel.emit({ type: 'logout', sourceId: 'foreign-tab', nonce: 'logout-1' });
  channel.emit({ type: 'logout', sourceId: 'local-tab', nonce: 'logout-2', accessToken: 'must-not-be-present' });
  sync.publishLogout();

  assert.equal(remoteLogouts, 1);
  assert.equal(channel.posted.length, 1);
  assert.equal(JSON.stringify(channel.posted[0]).includes('accessToken'), false);
  sync.close();
});
