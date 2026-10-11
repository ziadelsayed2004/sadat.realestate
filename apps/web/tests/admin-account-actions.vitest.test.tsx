import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountActions } from '../src/features/admin_accounts/account-actions.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { adminAccountUserDataSchema } from '@sadat-real-estate/contracts';

const user = adminAccountUserDataSchema.parse({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', email: 'account@example.com', roleType: 'seeker', status: 'verified', locale: 'ar', version: 0, statusChangedAt: '2026-10-10T00:00:00.000Z', createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z', availableActions: ['suspend'], canManage: true });

describe('simplified account messaging and actions', () => {
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
