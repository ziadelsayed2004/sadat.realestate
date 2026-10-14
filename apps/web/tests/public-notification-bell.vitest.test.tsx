import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthRoleType } from '@sadat-real-estate/contracts';
import { PublicNotificationBell } from '../src/features/public/notification-bell.tsx';
import { PublicSiteHeader } from '../src/features/public/components.tsx';
import { getPublicHomepageCopy } from '../src/features/public/copy.ts';
import { RouteShellAuthContext, type RouteShellAuthClient } from '../src/features/routing/shells.tsx';

const response = (unreadCount: number) => Response.json({ data: { items: [], unreadCount, page: 1, limit: 1, total: unreadCount }, meta: { requestId: 'public-notifications-test' } });
function bell(authorization: RouteShellAuthClient, role: AuthRoleType = 'seeker') {
  return <RouteShellAuthContext.Provider value={authorization}><PublicNotificationBell role={role} locale="en" /></RouteShellAuthContext.Provider>;
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('public header notifications', () => {
  it('includes administrative queues even when the message inbox is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { items: [], unreadCount: 0, page: 1, limit: 1, total: 0, attention: { counts: { advertising: 2 }, total: 2 } }, meta: { requestId: 'admin-queues' } })));
    render(bell({ getAuthorizationHeader: () => 'Bearer admin' }, 'admin'));
    expect(await screen.findByRole('link', { name: 'Notifications: 2 unread notifications' })).toHaveAttribute('href', '/admin/notifications?lang=en');
  });

  it('retries with the refreshed token and immediately displays the real unread count', async () => {
    let header = 'Bearer expired';
    const refresh = vi.fn(async () => { header = 'Bearer renewed'; });
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({}, { status: 401 })).mockResolvedValueOnce(response(4));
    vi.stubGlobal('fetch', fetcher);
    render(bell({ getAuthorizationHeader: () => header, refresh }, 'provider'));
    expect(await screen.findByRole('link', { name: 'Notifications: 4 unread notifications' })).toBeVisible();
    expect(refresh).toHaveBeenCalledOnce();
    expect(new Headers(fetcher.mock.calls[1]![1].headers).get('authorization')).toBe('Bearer renewed');
  });

  it('starts fetching when the initial session is restored without a parent rerender', async () => {
    let header: string | undefined;
    let notify: () => void = () => undefined;
    const unsubscribe = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(response(2));vi.stubGlobal('fetch', fetcher);
    const view = render(bell({ getAuthorizationHeader: () => header, subscribe: listener => { notify = () => listener({ status: 'authenticated', availableActions: [] }); return unsubscribe; } }));
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () => { header = 'Bearer restored'; notify(); });
    expect(await screen.findByRole('link', { name: 'Notifications: 2 unread notifications' })).toBeVisible();
    view.unmount();expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('keeps a previously verified unread count during a transient network failure', async () => {
    const fetcher=vi.fn().mockResolvedValueOnce(response(2)).mockRejectedValue(new Error('offline'));vi.stubGlobal('fetch',fetcher);
    render(bell({getAuthorizationHeader:()=> 'Bearer token'}));
    await screen.findByRole('link',{name:'Notifications: 2 unread notifications'});
    fireEvent(window,new Event('focus'));
    await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('link',{name:'Notifications: 2 unread notifications'})).toBeVisible();
  });

  it('clears the old account badge on subscription changes and ignores its late inbox response', async () => {
    let header = 'Bearer old-account';
    let notify: () => void = () => undefined;
    let release: ((value: Response) => void) | undefined;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { release = resolve; })).mockResolvedValue(response(1));
    vi.stubGlobal('fetch', fetcher);
    render(bell({ getAuthorizationHeader: () => header, subscribe: listener => { notify = () => listener({ status: 'authenticated', availableActions: [] }); return () => undefined; } }));
    await act(async () => { header = 'Bearer new-account'; notify(); release?.(response(9)); });
    expect(await screen.findByRole('link', { name: 'Notifications: 1 unread notifications' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Notifications: 9 unread notifications' })).toBeNull();
    expect(new Headers(fetcher.mock.calls[1]![1].headers).get('authorization')).toBe('Bearer new-account');
  });
  it('does not expose a bell or request an inbox for guests', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<PublicSiteHeader locale="en" copy={getPublicHomepageCopy('en')} />);
    expect(screen.queryByRole('link', { name: /Notifications/u })).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(['seeker', 'provider', 'admin'] as const)('loads the %s inbox with its session and links directly to notifications', async role => {
    const fetcher = vi.fn().mockResolvedValue(response(3)); vi.stubGlobal('fetch', fetcher);
    render(bell({ getAuthorizationHeader: () => 'Bearer customer-token' }, role));
    const link = await screen.findByRole('link', { name: 'Notifications: 3 unread notifications' });
    expect(link).toHaveAttribute('href', `/${role}/notifications?lang=en`);
    expect(fetcher.mock.calls[0]?.[0]).toBe(`/api/v1/${role}/notifications?page=1&limit=1`);
    expect(new Headers(fetcher.mock.calls[0]?.[1].headers).get('authorization')).toBe('Bearer customer-token');
  });

  it('refreshes on focus and removes the badge after the inbox is read', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(2)).mockResolvedValue(response(0)); vi.stubGlobal('fetch', fetcher);
    render(bell({ getAuthorizationHeader: () => 'Bearer token' }));
    await screen.findByRole('link', { name: 'Notifications: 2 unread notifications' });
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(document.querySelector('.public-homepage__notification-count')).toBeNull());
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('polls for newly delivered messages', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValueOnce(response(0)).mockResolvedValue(response(1)); vi.stubGlobal('fetch', fetcher);
    render(bell({ getAuthorizationHeader: () => 'Bearer token' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.getByRole('link', { name: 'Notifications: 1 unread notifications' })).toBeInTheDocument();
  });

  it('keeps the inbox link without inventing a badge when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(bell({ getAuthorizationHeader: () => 'Bearer token' }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
    expect(document.querySelector('.public-homepage__notification-count')).toBeNull();
  });

  it('aborts old requests and ignores a previous account response', async () => {
    let release: ((value: Response) => void) | undefined;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { release = resolve; })).mockResolvedValue(response(0));
    vi.stubGlobal('fetch', fetcher);
    const view = render(bell({ getAuthorizationHeader: () => 'Bearer old-account' }));
    view.rerender(bell({ getAuthorizationHeader: () => 'Bearer new-account' }));
    expect(fetcher.mock.calls[0]?.[1].signal.aborted).toBe(true);
    await act(async () => { release?.(response(9)); });
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
    expect(document.querySelector('.public-homepage__notification-count')).toBeNull();
  });

  it('renews an expired session once instead of displaying a false unread indicator', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: { code: 'UNAUTHORIZED', message: 'Expired' }, meta: { requestId: 'expired' } }, { status: 401 })));
    render(bell({ getAuthorizationHeader: () => 'Bearer expired', refresh }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(document.querySelector('.public-homepage__notification-count')).toBeNull();
  });
});
