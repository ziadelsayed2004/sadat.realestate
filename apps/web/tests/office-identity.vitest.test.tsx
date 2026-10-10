import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { OfficeIdentitySubscription } from '../src/features/admin_accounts/identity-subscription.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { server } from '../src/features/testing/msw/server.ts';

const providerId = '1234567890abcdef12345678';
const path = `/api/v1/admin/providers/${providerId}/public-identity-subscription`;
const envelope = (data: unknown) => ({ data, meta: { requestId: 'identity-test' } });
const authorization = { getAuthorizationHeader: () => 'Bearer test-admin' };
describe('Office identity subscription', () => {
  it.each(['ar', 'en'] as const)('confirms external payment and saves Egypt times and version before stopping in %s', async locale => {
    const writes: Record<string, unknown>[] = [];
    server.use(http.get(path, () => HttpResponse.json(envelope({ providerId, status: 'inactive', paymentConfirmed: false, version: 0, visible: false, canManage: true }))), http.put(path, async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer test-admin');
      const body = await request.json() as Record<string, unknown>; writes.push(body);
      const { expectedVersion, ...value } = body; void expectedVersion;
      return HttpResponse.json(envelope({ providerId, ...value, version: writes.length, visible: body.status === 'active', canManage: true }));
    }));
    renderWithLocale(<OfficeIdentitySubscription providerId={providerId} locale={locale} authorization={authorization} />, { locale });
    await screen.findByRole('status');
    fireEvent.change(screen.getByLabelText(locale === 'ar' ? 'بداية الظهور' : 'Start'), { target: { value: '2030-01-01T10:00' } });
    fireEvent.change(screen.getByLabelText(locale === 'ar' ? 'نهاية الظهور' : 'End'), { target: { value: '2030-02-01T10:00' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'تفعيل الظهور' : 'Activate display' }));
    await screen.findByRole('button', { name: locale === 'ar' ? 'إيقاف الظهور' : 'Stop display' });
    expect(writes[0]).toEqual({ status: 'active', paymentConfirmed: true, expectedVersion: 0, startAt: '2030-01-01T08:00:00.000Z', endAt: '2030-02-01T08:00:00.000Z' });
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'إيقاف الظهور' : 'Stop display' }));
    await waitFor(() => expect(writes[1]).toMatchObject({ status: 'inactive', expectedVersion: 1 }));
  });
  it('keeps subscription editing disabled without the independent permission', async () => {
    server.use(http.get(path, () => HttpResponse.json(envelope({ providerId, status: 'inactive', paymentConfirmed: false, version: 0, visible: false, canManage: false }))));
    renderWithLocale(<OfficeIdentitySubscription providerId={providerId} locale="en" authorization={authorization} />, { locale: 'en' });
    await screen.findByRole('status');
    expect(screen.getByRole('button', { name: 'Activate display' })).toBeDisabled();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
