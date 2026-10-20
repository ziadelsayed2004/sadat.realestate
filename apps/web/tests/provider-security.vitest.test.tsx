import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { ProviderSecurity } from '../src/features/provider/security.tsx';
import { getProviderSettingsCopy } from '../src/features/provider/settings-copy.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { server } from '../src/features/testing/msw/server.ts';

const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const envelope = (data: unknown) => HttpResponse.json({ data, meta: { requestId: 'security-test' } });

describe('provider security actions', () => {
  it.each(['ar', 'en'] as const)('validates confirmation and changes the password through authenticated API in %s', async locale => {
    const copy = getProviderSettingsCopy(locale).security;
    const change = vi.fn(), logout = vi.fn(async () => {});
    server.use(http.post('*/api/v1/auth/account-access/change', async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer provider-security');
      change(await request.json()); return envelope({ changed: true });
    }));
    renderWithLocale(<ProviderSecurity locale={locale} authorization={{ getAuthorizationHeader: () => 'Bearer provider-security', logout }} />, { locale });
    fireEvent.change(screen.getByLabelText(copy.current), { target: { value: 'Old-Password!2026' } });
    fireEvent.change(screen.getByLabelText(copy.next), { target: { value: 'New-Password!2026' } });
    fireEvent.change(screen.getByLabelText(copy.confirm), { target: { value: 'Different!2026' } });
    fireEvent.click(screen.getByRole('button', { name: copy.update }));
    expect(screen.getByRole('alert')).toBeInTheDocument(); expect(change).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(copy.confirm), { target: { value: 'New-Password!2026' } });
    fireEvent.click(screen.getByRole('button', { name: copy.update }));
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(change).toHaveBeenCalledWith({ currentPassword: 'Old-Password!2026', newPassword: 'New-Password!2026' });
    expect(screen.queryByLabelText(copy.current)).not.toBeInTheDocument();
  });

  it('requires explicit confirmation and sends deletion for administrative review without deleting the account', async () => {
    const send = vi.fn();
    server.use(http.post('*/api/v1/provider/account-deletion-requests', async ({ request }) => {
      send(await request.json()); return envelope({ id, type: 'contact', source: 'provider', status: 'new', payload: {}, version: 0, availableActions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }));
    renderWithLocale(<ProviderSecurity locale="en" authorization={{ getAuthorizationHeader: () => 'Bearer provider-security' }} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Request account deletion' }));
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send deletion request' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reason for account deletion'), { target: { value: 'Company has ceased trading' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send deletion request' }));
    await waitFor(() => expect(screen.getByText(id)).toBeInTheDocument());
    expect(send).toHaveBeenCalledWith({ reason: 'Company has ceased trading', locale: 'en' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
