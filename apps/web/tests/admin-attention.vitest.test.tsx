import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAttentionProvider, AdminAttentionBell, adminAttentionCount } from '../src/features/routing/admin-attention.tsx';
import { AdminNavigation } from '../src/features/admin/overview.tsx';
import { ApiClient } from '../src/features/contracts/index.ts';
import { adminNotificationReadAllSuccessEnvelopeSchema } from '@sadat-real-estate/contracts';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { server } from '../src/features/testing/msw/server.ts';

let pending = 3;
let calls = 0;
let fail = false;
const authorization = { getAuthorizationHeader: () => 'Bearer admin-test' };
beforeEach(() => {
  pending = 3; calls = 0; fail = false; sessionStorage.clear();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation(media => ({ matches: false, media, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  server.use(http.get('*/api/v1/admin/notifications', ({ request }) => {
    expect(request.headers.get('authorization')).toBe('Bearer admin-test');
    calls++;
    if (fail) return HttpResponse.json({ error: { code: 'UNAVAILABLE', messageKey: 'errors.internal', requestId: 'attention-error' } }, { status: 503 });
    return HttpResponse.json({ data: { items: [], total: 0, page: 1, limit: 1, unreadCount: 1, attention: { counts: { 'property-review': pending, 'community-reports': 2, 'contact-requests': 1 }, total: pending + 3 } }, meta: { requestId: 'attention-test' } });
  }));
});
afterEach(() => { vi.useRealTimers(); });

function renderAttention(locale: 'ar' | 'en' = 'ar', enabled = true) {
  return renderWithLocale(<AdminAttentionProvider enabled={enabled} authorization={authorization}><AdminAttentionBell locale={locale} /><AdminNavigation locale={locale} activePath="/admin" /></AdminAttentionProvider>, { locale });
}

describe('administrator queue alerts', () => {
  it.each(['ar', 'en'] as const)('shows real queue badges and a localized bell with direct links in %s', async locale => {
    renderAttention(locale);
    expect(await screen.findByTestId('admin-attention-property-review')).toHaveTextContent(new Intl.NumberFormat(locale).format(3));
    expect(screen.getByTestId('admin-attention-properties')).toBeVisible();
    expect(screen.getByTestId('admin-attention-community-reports')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 7' : 'Alerts: 7' }));
    const panel = screen.getByRole('region', { name: locale === 'ar' ? 'التنبيهات الجديدة' : 'New alerts' });
    expect(panel.querySelector('a[href*="/admin/properties/review"]')).toHaveAttribute('href', `/admin/properties/review?lang=${locale}`);
    expect(panel.querySelector('a[href*="/admin/community/moderation"]')).toHaveAttribute('href', `/admin/community/moderation?lang=${locale}`);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: locale === 'ar' ? 'التنبيهات: 7' : 'Alerts: 7' })).toHaveFocus();
  });

  it('refreshes on focus and successful admin mutations, removing a processed queue badge', async () => {
    renderAttention();
    await screen.findByTestId('admin-attention-property-review');
    pending = 0;
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(screen.queryByTestId('admin-attention-property-review')).not.toBeInTheDocument());
    pending = 4;
    server.use(http.post('*/api/v1/admin/notifications/read-all', () => HttpResponse.json({ data: { updatedCount: 1 }, meta: { requestId: 'read-all' } })));
    await new ApiClient().request('/admin/notifications/read-all', { method: 'POST', responseSchema: adminNotificationReadAllSuccessEnvelopeSchema });
    await waitFor(() => expect(screen.getByTestId('admin-attention-property-review')).toHaveTextContent(new Intl.NumberFormat('ar').format(4)));
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it('polls every thirty seconds and stops polling after unmount', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const view = renderAttention();
    await screen.findByTestId('admin-attention-property-review');
    pending = 0;
    vi.advanceTimersByTime(30_000);
    await waitFor(() => expect(screen.queryByTestId('admin-attention-property-review')).not.toBeInTheDocument());
    view.unmount();
    const before = calls;
    vi.advanceTimersByTime(60_000);
    expect(calls).toBe(before);
  });

  it('does not fetch for other surfaces and does not double-count request subqueues', async () => {
    renderAttention('en', false);
    expect(calls).toBe(0);
    expect(adminAttentionCount('requests', { counts: { 'contact-requests': 3, 'viewing-requests': 2 }, total: 5 })).toBe(5);
  });

  it('keeps the previous real counts and offers retry when a refresh fails', async () => {
    renderAttention();
    await screen.findByTestId('admin-attention-property-review');
    fail = true;
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(calls).toBeGreaterThan(1));
    fireEvent.click(screen.getByRole('button', { name: 'التنبيهات: 7' }));
    expect(screen.getByTestId('admin-attention-property-review')).toHaveTextContent(new Intl.NumberFormat('ar').format(3));
    expect(await screen.findByText('تعذر تحديث التنبيهات. اضغط على الجرس لإعادة المحاولة.')).toBeVisible();
  });
});
