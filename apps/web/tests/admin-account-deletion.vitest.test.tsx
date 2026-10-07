import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminAccountUserDataSchema } from '@sadat-real-estate/contracts';
import { DeleteAccount } from '../src/features/admin_accounts/delete-account.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const stamp = '2026-10-07T12:00:00.000Z';
const user = adminAccountUserDataSchema.parse({ id: 'c'.repeat(24), roleType: 'seeker', status: 'verified', email: 'customer@example.test', displayName: 'Example Customer', locale: 'en', version: 3, statusChangedAt: stamp, createdAt: stamp, updatedAt: stamp, availableActions: ['suspend'], canManage: true });
const authorization = { getAuthorizationHeader: () => 'Bearer transient-admin' };
afterEach(() => vi.unstubAllGlobals());

describe('administrative deletion confirmation', () => {
  it('hides deletion for read-only or unknown permissions', () => {
    const result = renderWithLocale(<DeleteAccount user={{ ...user, canManage: false }} locale="en" />, { locale: 'en' });
    expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
    result.rerender(<DeleteAccount user={{ ...user, canManage: undefined }} locale="en" />);
    expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
  });

  it('requires reason and confirmation and cancellation never calls the API', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    renderWithLocale(<DeleteAccount user={user} locale="en" />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(user.email!);
    expect(screen.getByRole('button', { name: 'Confirm deletion' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Duplicate account' } });
    expect(screen.getByRole('button', { name: 'Confirm deletion' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Confirm deletion' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserves confirmation after a transient error and refreshes only after successful deletion', async () => {
    const onDeleted = vi.fn();
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: user.id, deleted: true }, meta: { requestId: 'account-deleted' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    renderWithLocale(<DeleteAccount user={user} locale="en" authorization={authorization} apiOrigin="https://example.test/api/v1" onDeleted={onDeleted} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Duplicate account' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to delete'));
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('Duplicate account');
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(fetcher.mock.calls[0]![1]).toMatchObject({ method: 'DELETE', body: JSON.stringify({ version: 3, reason: 'Duplicate account', confirmed: true }) });
    expect(new Headers(fetcher.mock.calls[0]![1].headers).get('authorization')).toBe('Bearer transient-admin');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
