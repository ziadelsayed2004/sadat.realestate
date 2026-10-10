import { useContext } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminAccountContext, AdminAccountProvider } from '../src/features/routing/admin-account.tsx';

function Name() { return <span>{useContext(AdminAccountContext)?.displayName ?? 'No account'}</span>; }
const authorization = { getAuthorizationHeader: () => 'Bearer admin-test.session' };
const response = () => new Response(JSON.stringify({ data: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', displayName: 'Tarek Admin' }, meta: { requestId: 'presence-ui' } }), { headers: { 'content-type': 'application/json' } });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('loads own name, polls visible dashboards and stops heartbeat on unmount', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn(async () => response());
  vi.stubGlobal('fetch', fetch);
  const view = render(<AdminAccountProvider enabled authorization={authorization}><Name /></AdminAccountProvider>);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByText('Tarek Admin')).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(fetch).toHaveBeenCalledTimes(2);
  view.unmount();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('loads the name immediately when initial session refresh completes', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn(async () => response());
  vi.stubGlobal('fetch', fetch);
  const session: { header?: string } = {};
  let notify: () => void = () => undefined;
  const unsubscribe = vi.fn();
  const auth = { getAuthorizationHeader: () => session.header, subscribe: (listener: unknown) => { notify = listener as () => void; return unsubscribe; } };
  const view = render(<AdminAccountProvider enabled authorization={auth}><Name /></AdminAccountProvider>);
  expect(fetch).not.toHaveBeenCalled();
  session.header = 'Bearer admin-test.session';
  await act(async () => { notify(); await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByText('Tarek Admin')).toBeVisible();
  view.unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

it('stops activity updates for hidden tabs and refreshes on visibility return', async () => {
  vi.useFakeTimers();
  const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  const fetch = vi.fn(async () => response());
  vi.stubGlobal('fetch', fetch);
  render(<AdminAccountProvider enabled authorization={authorization}><Name /></AdminAccountProvider>);
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(fetch).not.toHaveBeenCalled();
  visible.mockReturnValue('visible');
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByText('Tarek Admin')).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('clears identity after session denial and never heartbeats without authorization', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValueOnce(response()).mockResolvedValue(new Response('{}', { status: 401 }));
  vi.stubGlobal('fetch', fetch);
  const view = render(<AdminAccountProvider enabled authorization={authorization}><Name /></AdminAccountProvider>);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByText('Tarek Admin')).toBeVisible();
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(screen.getByText('No account')).toBeVisible();
  view.rerender(<AdminAccountProvider enabled><Name /></AdminAccountProvider>);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(fetch).toHaveBeenCalledTimes(2);
});
