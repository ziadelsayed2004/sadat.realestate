import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  adminAccountUserDataSchema,
  adminAccountUserListDataSchema,
  adminProviderDataSchema,
  adminProviderListDataSchema
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import { AdminAccounts, getAdminAccountsCopy, loadAdminDocumentAccess, loadAdminProviders, loadAdminUsers } from '../src/features/admin_accounts/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const session = { status: 'authenticated' as const, role: 'admin' as const };
const user = adminAccountUserDataSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  roleType: 'seeker',
  status: 'verified',
  email: 'seeker@example.test',
  phone: '+201000000001',
  locale: 'ar',
  displayName: 'Amina Seeker',
  version: 2,
  statusChangedAt: '2026-08-18T08:00:00.000Z',
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-18T08:00:00.000Z',
  availableActions: ['suspend', 'restrict']
});
const userList = adminAccountUserListDataSchema.parse({ items: [user], page: 1, limit: 20, total: 1 });
const provider = adminProviderDataSchema.parse({
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  userId: 'cccccccccccccccccccccccc',
  providerType: 'brokerage_office',
  applicationStatus: 'pending_review',
  accountStatus: 'pending_review',
  accountVersion: 1,
  applicationVersion: 3,
  email: 'provider@example.test',
  accountOwnerFullName: 'Provider Owner',
  legalBusinessName: 'Provider Office',
  submittedAt: '2026-08-17T08:00:00.000Z',
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-18T08:00:00.000Z',
  documents: [{
    id: 'dddddddddddddddddddddddd',
    applicationId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    category: 'commercial_registration',
    originalFilename: 'registration.pdf',
    detectedMime: 'application/pdf',
    byteSize: 1_024,
    version: 1,
    securityState: 'clean',
    reviewState: 'pending_review',
    uploadedAt: '2026-08-17T08:00:00.000Z',
    active: true
  }],
  availableActions: ['verify', 'reject', 'needs_information']
});
const providerList = adminProviderListDataSchema.parse({ items: [provider], page: 1, limit: 20, total: 1 });

function success(data: unknown): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-accounts-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('Admin account and verification views', () => {
  it('uses the implemented list and reviewer document contracts with authorization', async () => {
    const requests: Array<{ path: string; query: URLSearchParams; authorization: string | null }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({ path: url.pathname, query: url.searchParams, authorization: new Headers(init?.headers).get('authorization') });
        if (url.pathname === '/api/v1/admin/users') return success(userList);
        if (url.pathname === '/api/v1/admin/providers') return success(providerList);
        return success({ url: '/api/v1/private/provider-documents/dddddddddddddddddddddddd', expiresAt: '2026-08-18T09:00:00.000Z', method: 'GET' });
      }
    });
    const authorization = { getAuthorizationHeader: () => 'Bearer admin.accounts.test' };

    await expect(loadAdminUsers({ apiClient: client, authorization, query: { roleType: 'seeker', page: 2, limit: 10 } })).resolves.toEqual(userList);
    await expect(loadAdminProviders({ apiClient: client, authorization, query: { status: 'pending_review', page: 1, limit: 5 } })).resolves.toEqual(providerList);
    await expect(loadAdminDocumentAccess('dddddddddddddddddddddddd', 'document_review', { apiClient: client, authorization })).resolves.toMatchObject({ method: 'GET' });

    expect(requests.map(request => request.path)).toEqual([
      '/api/v1/admin/users',
      '/api/v1/admin/providers',
      '/api/v1/admin/provider-documents/dddddddddddddddddddddddd/access'
    ]);
    expect(requests[0]?.query.get('roleType')).toBe('seeker');
    expect(requests[1]?.query.get('status')).toBe('pending_review');
    expect(requests[2]?.query.get('purpose')).toBe('document_review');
    expect(requests.every(request => request.authorization === 'Bearer admin.accounts.test')).toBe(true);
  });

  it.each(['ar', 'en',] as const)('renders the user list with the correct direction for %s', async locale => {
    const result = renderWithLocale(<AdminAccounts locale={locale} session={session} view="users" initialListData={userList} />, { locale });
    await waitFor(() => expect(screen.getByTestId('admin-user-aaaaaaaaaaaaaaaaaaaaaaaa')).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: getAdminAccountsCopy(locale).users.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('admin-accounts-total')).toHaveTextContent('1');
    expect(result.container.querySelector('[data-screen-id="ADM-02"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken/u);
    result.unmount();
  });

  it('renders provider verification safely and grants only clean active document access', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const grant = vi.fn().mockResolvedValue({ url: '/api/v1/private/provider-documents/dddddddddddddddddddddddd', expiresAt: '2026-08-18T09:00:00.000Z', method: 'GET' });
    renderWithLocale(<AdminAccounts locale="en" session={session} view="providers" detailId={provider.id} initialProviderData={provider} loadDocumentAccess={grant} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`admin-document-${provider.documents[0]!.id}`)).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Provider Owner', level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: getAdminAccountsCopy('en').actions.openDocument }));
    await waitFor(() => expect(grant).toHaveBeenCalledWith(provider.documents[0]!.id, 'document_review'));
    expect(open).toHaveBeenCalledWith('/api/v1/private/provider-documents/dddddddddddddddddddddddd', '_blank', 'noopener,noreferrer');
    expect(screen.getByRole('main').textContent ?? '').not.toMatch(/storageKey|privateUrl|internalNotes/u);
    open.mockRestore();
  });

  it('fails closed for non-admin sessions without calling an API loader', async () => {
    const load = vi.fn();
    renderWithLocale(<AdminAccounts locale="en" session={{ status: 'anonymous' }} view="seekers" loadUsers={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getAdminAccountsCopy('en').states.permission.title })).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
});
