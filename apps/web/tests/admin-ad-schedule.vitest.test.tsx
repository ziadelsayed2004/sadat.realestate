import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { adAdminRequestSchema } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../src/features/contracts/index.ts';
import { AdSchedulePanel } from '../src/features/admin_ads/schedule-panel.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const data = adAdminRequestSchema.parse({ request: {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa', providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  placementKey: 'homepage.hero', purpose: 'Advertisement', status: 'waiting_payment', version: 3,
  intervalStart: '2099-01-01T08:00:00.000Z', intervalEnd: '2099-01-01T10:00:00.000Z',
  createdAt: '2026-10-08T08:00:00.000Z', updatedAt: '2026-10-08T08:00:00.000Z'
} });

describe('advertisement scheduling explanations and validation', () => {
  it.each(['ar', 'en'] as const)('explains short waiver reasons and submits free and paid choices separately in %s', async locale => {
    const save = vi.fn(async () => {});
    const ar = locale === 'ar';
    renderWithLocale(<AdSchedulePanel data={data} locale={locale} save={save} />, { locale });
    expect(screen.getByRole('link')).toHaveAttribute('href', `/admin/ads/financial-review?requestId=${data.request.id}&lang=${locale}`);
    fireEvent.click(screen.getByRole('radio', { name: ar ? 'إعلان مجاني — إعفاء من الدفع' : 'Free advertisement — waive payment' }));
    const reason = screen.getByLabelText(ar ? 'سبب الإعفاء من الدفع (مطلوب)' : 'Payment waiver reason (required)');
    fireEvent.change(reason, { target: { value: 'هه' } });
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveAccessibleDescription(ar ? /٣ حروف على الأقل/u : /at least 3 characters/u);
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.submit(reason.closest('form')!);
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(reason, { target: { value: '  Complimentary promotional campaign  ' } });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ waiverReason: 'Complimentary promotional campaign', interval: { start: data.request.intervalStart, end: data.request.intervalEnd } }));
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.click(screen.getByRole('radio', { name: ar ? 'إعلان مدفوع' : 'Paid advertisement' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith({ interval: { start: data.request.intervalStart, end: data.request.intervalEnd } }));
  });

  it.each([
    { start: '', end: '', message: 'Choose the display start and end' },
    { start: '2099-01-01T12:00', end: '2099-01-01T10:00', message: 'Display end must be after its start' },
    { start: '2020-01-01T10:00', end: '2020-01-01T12:00', message: 'This display period has ended' }
  ])('explains invalid or expired dates: $message', ({ start, end, message }) => {
    const save = vi.fn(async () => {});
    renderWithLocale(<AdSchedulePanel data={data} locale="en" save={save} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText('Display start in Egypt time'), { target: { value: start } });
    fireEvent.change(screen.getByLabelText('Display end in Egypt time'), { target: { value: end } });
    expect(screen.getByText(new RegExp(message, 'u'))).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    expect(save).not.toHaveBeenCalled();
  });

  it.each([
    { error: new ApiClientError('Conflict', { code: 'HTTP_ERROR', status: 409, apiError: { code: 'AD_PLACEMENT_CONFLICT', messageKey: 'errors.conflict', details: [], requestId: 'schedule-conflict' } }), message: 'Another advertisement occupies this placement' },
    { error: new ApiClientError('Forbidden', { code: 'HTTP_ERROR', status: 403 }), message: 'Your account needs permission' },
    { error: new ApiClientError('Conflict', { code: 'HTTP_ERROR', status: 409 }), message: 'request state or payment approval' },
    { error: new ApiClientError('Offline', { code: 'NETWORK_ERROR' }), message: 'Unable to reach the server' }
  ])('shows actionable errors and preserves entries for retry: $message', async ({ error, message }) => {
    const save = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
    renderWithLocale(<AdSchedulePanel data={data} locale="en" save={save} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('radio', { name: 'Free advertisement — waive payment' }));
    const reason = screen.getByLabelText('Payment waiver reason (required)');
    fireEvent.change(reason, { target: { value: 'Complimentary campaign' } });
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(reason).toHaveValue('Complimentary campaign');
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
