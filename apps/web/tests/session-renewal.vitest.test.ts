import { afterEach, expect, it, vi } from 'vitest';
import { AuthClient, AuthStore } from '../src/features/auth/index.ts';
import { ApiClient } from '../src/features/contracts/index.ts';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('renews all authenticated roles before expiry, preserves state on outage, and retries without logging in again', async () => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  for (const roleType of ['seeker', 'provider', 'admin'] as const) {
    let calls = 0;
    const fetcher = vi.fn<typeof fetch>(async () => {
      if (++calls === 2) throw new Error('Temporary network outage');
      return new Response(JSON.stringify({ data: { accessToken: `header.${roleType}-${calls}.signature`, tokenType: 'Bearer', expiresInSeconds: 60, user: { id: 'a'.repeat(24), roleType, status: 'verified' } }, meta: { requestId: 'renewal-test' } }));
    });
    const client = new AuthClient({ apiClient: new ApiClient({ fetcher }), store: new AuthStore({ sync: { publishLogout: vi.fn(), subscribe: () => () => {}, close: vi.fn() } }) });
    await client.refresh();
    await vi.advanceTimersByTimeAsync(48_000);
    expect(calls).toBe(2);
    expect(client.getSnapshot().status).toBe('authenticated');
    expect(client.getAuthorizationHeader()).toBe(`Bearer header.${roleType}-1.signature`);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(calls).toBe(3);
    expect(client.getAuthorizationHeader()).toBe(`Bearer header.${roleType}-3.signature`);
    expect(fetcher.mock.calls.every(([url]) => String(url).endsWith('/auth/refresh'))).toBe(true);
    client.dispose();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(calls).toBe(3);
  }
});

it('restores an expired idle tab on visibility/focus and never renews a logged-out session', async () => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  let calls = 0;
  const client = new AuthClient({ apiClient: new ApiClient({ fetcher: async () => {
    calls++;
    return new Response(JSON.stringify({ data: { accessToken: `header.token-${calls}.signature`, tokenType: 'Bearer', expiresInSeconds: 60, user: { id: 'a'.repeat(24), roleType: 'provider', status: 'verified' } }, meta: { requestId: 'idle-tab-test' } }));
  } }) });
  await client.refresh();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  await vi.advanceTimersByTimeAsync(180_000);
  expect(calls).toBe(1);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(0);
  expect(calls).toBe(2);
  expect(client.getAuthorizationHeader()).toBe('Bearer header.token-2.signature');
  client.store.clear();
  await vi.advanceTimersByTimeAsync(120_000); window.dispatchEvent(new Event('online'));
  expect(calls).toBe(2);
  client.dispose();
});

it('recovers from an outage during initial restoration without another login or reload', async () => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  let calls = 0;
  const client = new AuthClient({ apiClient: new ApiClient({ fetcher: async () => {
    if (++calls === 1) throw new Error('Rolling restart');
    return new Response(JSON.stringify({ data: { accessToken: 'restored.admin.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'a'.repeat(24), roleType: 'admin', status: 'verified' } }, meta: { requestId: 'restore-retry' } }));
  } }) });
  await expect(client.refresh()).rejects.toThrow();
  expect(client.getSnapshot().status).toBe('error');
  await vi.advanceTimersByTimeAsync(15_000);
  expect(client.getSnapshot().status).toBe('authenticated');
  expect(calls).toBe(2);
  client.dispose();
});

it('retries a concurrent refresh conflict using the latest cookie without broadcasting logout', async () => {
  vi.useFakeTimers();
  let calls = 0;
  const logout = vi.fn();
  const fetcher = vi.fn<typeof fetch>(async (_url, options) => {
    expect(options?.keepalive).toBe(true);
    if (++calls === 1) return new Response(JSON.stringify({ error: { code: 'SESSION_REFRESH_CONFLICT', messageKey: 'errors.conflict', details: [], requestId: 'overlapping-tab' } }), { status: 409 });
    return new Response(JSON.stringify({ data: { accessToken: 'renewed.admin.token', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'a'.repeat(24), roleType: 'admin', status: 'verified' } }, meta: { requestId: 'renewal-winner' } }));
  });
  const client = new AuthClient({ apiClient: new ApiClient({ fetcher }), store: new AuthStore({ sync: { publishLogout: logout, subscribe: () => () => {}, close: vi.fn() } }) });
  const promise = client.refresh();
  await vi.advanceTimersByTimeAsync(250);
  expect((await promise).status).toBe('authenticated');
  expect(calls).toBe(2);
  expect(logout).not.toHaveBeenCalled();
  client.dispose();
});
