import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountActions } from '../src/features/admin_accounts/account-actions.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { adminAccountUserDataSchema, adminProviderDataSchema } from '@sadat-real-estate/contracts';

const user = adminAccountUserDataSchema.parse({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', email: 'account@example.com', roleType: 'seeker', status: 'verified', locale: 'ar', version: 0, statusChangedAt: '2026-10-10T00:00:00.000Z', createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z', availableActions: ['suspend'], canManage: true });

describe('simplified account messaging and actions', () => {
  it.each(['ar', 'en'] as const)('reactivates suspended providers through coherent provider review and preserves a failed reason in %s', async locale => {
    const stopped = { ...user, roleType: 'provider' as const, status: 'suspended' as const, availableActions: [] };
    const provider = adminProviderDataSchema.parse({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', userId: user.id, providerType: 'brokerage_office', applicationStatus: 'suspended', accountStatus: 'suspended', accountVersion: 2, applicationVersion: 2, createdAt: user.createdAt, updatedAt: user.updatedAt, documents: [], availableActions: ['verify'] });
    const requests: Array<{ url: string; body: unknown }> = [], changed = vi.fn(); let fail = true;
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (options?.method !== 'POST') return new Response(JSON.stringify({ data: provider, meta: { requestId: 'provider-read' } }), { status: 200 });
      requests.push({ url: String(url), body: JSON.parse(options.body) });
      if (fail) return new Response(JSON.stringify({ error: { code: 'ACCOUNT_TRANSITION_CONFLICT', messageKey: 'errors.conflict', details: [], requestId: 'test' } }), { status: 409 });
      return new Response(JSON.stringify({ data: { transitionId: 'cccccccccccccccccccccccc', providerApplicationId: provider.id, userId: user.id, providerType: provider.providerType, action: 'verify', fromAccountStatus: 'suspended', accountStatus: 'verified', fromApplicationStatus: 'suspended', applicationStatus: 'approved', reason: 'Reviewed suspension', accountVersion: 3, applicationVersion: 3, changedAt: user.updatedAt, availableActions: ['suspend'] }, meta: { requestId: 'provider-restored' } }), { status: 200 });
    }));
    try {
      renderWithLocale(<AccountActions user={stopped} locale={locale} authorization={{ getAuthorizationHeader: () => 'Bearer admin' }} apiOrigin={undefined} onChanged={changed} />, { locale });
      const button = await screen.findByRole('button', { name: locale === 'ar' ? 'إعادة تفعيل الحساب' : 'Reactivate account' });
      expect(button).toBeVisible(); expect(button).toBeDisabled();
      const reason = screen.getByRole('textbox', { name: locale === 'ar' ? 'سبب الإجراء الإداري (مطلوب)' : 'Administrative action reason (required)' });
      fireEvent.change(reason, { target: { value: 'Reviewed suspension' } }); expect(button).toBeDisabled();
      fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(button);
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(locale === 'ar' ? 'البيانات المكتوبة محفوظة' : 'Your input is preserved'));
      expect(reason).toHaveValue('Reviewed suspension'); expect(screen.getByRole('checkbox')).toBeChecked(); expect(changed).not.toHaveBeenCalled();
      fail = false; fireEvent.click(button);
      await waitFor(() => expect(changed).toHaveBeenCalledOnce());
      expect(requests).toEqual(Array.from({ length: 2 }, () => ({ url: `/api/v1/admin/providers/${provider.id}/review`, body: { action: 'verify', reason: 'Reviewed suspension' } })));
      expect(reason).toHaveValue(''); expect(screen.getByRole('checkbox')).not.toBeChecked();
      expect(screen.getByRole('status')).toHaveTextContent(locale === 'ar' ? 'تمت إعادة تفعيل الحساب' : 'Account reactivated');
    } finally { vi.unstubAllGlobals(); }
  });

  it('does not offer provider reactivation without server review permission', async () => {
    const provider = adminProviderDataSchema.parse({ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', userId: user.id, providerType: 'brokerage_office', applicationStatus: 'suspended', accountStatus: 'suspended', accountVersion: 0, applicationVersion: 0, createdAt: user.createdAt, updatedAt: user.updatedAt, documents: [], availableActions: [] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: provider, meta: { requestId: 'view-only' } }), { status: 200 })));
    try {
      renderWithLocale(<AccountActions user={{ ...user, roleType: 'provider', status: 'suspended', availableActions: [] }} locale="en" authorization={undefined} apiOrigin={undefined} onChanged={() => {}} />, { locale: 'en' });
      await waitFor(() => expect(screen.queryByText('Loading provider account actions…')).not.toBeInTheDocument());
      expect(screen.queryByRole('button', { name: 'Reactivate account' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Review provider account and reactivation permission' })).toHaveAttribute('href', `/admin/providers/${user.id}?lang=en`);
    } finally { vi.unstubAllGlobals(); }
  });

  it('reactivates a suspended seeker through the ordinary account transition', async () => {
    const changed = vi.fn(), requests: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      requests.push(String(url));
      return new Response(JSON.stringify({ data: { transitionId: 'cccccccccccccccccccccccc', userId: user.id, roleType: 'seeker', action: 'verify', fromStatus: 'suspended', status: 'verified', reason: 'Reviewed suspension', version: 1, changedAt: user.updatedAt, availableActions: ['suspend', 'restrict'] }, meta: { requestId: 'seeker-restored' } }), { status: 200 });
    }));
    try {
      renderWithLocale(<AccountActions user={{ ...user, status: 'suspended', availableActions: ['verify'] }} locale="en" authorization={undefined} apiOrigin={undefined} onChanged={changed} />, { locale: 'en' });
      fireEvent.change(screen.getByRole('textbox', { name: 'Administrative action reason (required)' }), { target: { value: 'Reviewed suspension' } });
      fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Reactivate account' }));
      await waitFor(() => expect(changed).toHaveBeenCalledOnce());
      expect(requests).toEqual([`/api/v1/admin/users/${user.id}/transitions`]);
    } finally { vi.unstubAllGlobals(); }
  });

  it.each(['ar', 'en'] as const)('keeps messages separate from administrative reasons and preserves failures in %s', async locale => {
    const changed = vi.fn();
    const requests: unknown[] = [];
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
      requests.push(JSON.parse(options.body));
      if (fail) return new Response(JSON.stringify({ error: { code: 'FAILED', messageKey: 'errors.failed', details: [], requestId: 'test' } }), { status: 500 });
      return new Response(JSON.stringify({ data: { id: user.id, action: 'notify' }, meta: { requestId: 'test' } }), { status: 200 });
    }));
    const { container } = renderWithLocale(<AccountActions user={user} locale={locale} authorization={undefined} apiOrigin={undefined} onChanged={changed} />, { locale });
    const message = within(container.querySelectorAll('section')[0]!);
    const actions = within(container.querySelectorAll('section')[1]!);
    const messageInput = message.getByRole('textbox', { name: locale === 'ar' ? 'نص الرسالة' : 'Message' });
    expect(message.getByRole('button', { name: locale === 'ar' ? 'إرسال الرسالة' : 'Send message' })).toBeDisabled();
    fireEvent.change(message.getByRole('textbox', { name: locale === 'ar' ? 'نص الرسالة' : 'Message' }), { target: { value: 'A message for the account holder' } });
    fireEvent.click(actions.getByText(locale === 'ar' ? 'تغيير الحالة أو إنهاء الجلسات' : 'Change status or end sessions'));
    expect(actions.getByRole('textbox')).toHaveValue('');
    expect(actions.getByRole('button', { name: locale === 'ar' ? 'تعطيل الحساب' : 'Disable account' })).toBeDisabled();
    fireEvent.click(message.getByRole('button', { name: locale === 'ar' ? 'إرسال الرسالة' : 'Send message' }));
    await waitFor(() => expect(message.getByRole('status')).toHaveTextContent(locale === 'ar' ? 'البيانات المكتوبة محفوظة' : 'Your input is preserved'));
    expect(messageInput).toHaveValue('A message for the account holder');
    expect(requests[0]).toEqual({ action: 'notify', reason: 'A message for the account holder' });
    expect(changed).not.toHaveBeenCalled();
    fail = false;
    fireEvent.click(message.getByRole('button', { name: locale === 'ar' ? 'إرسال الرسالة' : 'Send message' }));
    await waitFor(() => expect(messageInput).toHaveValue(''));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    vi.unstubAllGlobals();
  });
});
