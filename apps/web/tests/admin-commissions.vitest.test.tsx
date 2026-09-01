import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  commissionAccountCommissionSchema,
  commissionAccountOverrideSchema,
  commissionChangeLogListDataSchema,
  commissionConfirmationListDataSchema,
  commissionExceptionListDataSchema,
  commissionExceptionSchema,
  commissionPolicyListDataSchema,
  commissionPolicySchema
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  AdminCommissions,
  createAdminAccountCommissionOverride,
  createAdminCommissionException,
  createAdminCommissionPolicy,
  getAdminCommissionsCopy,
  loadAdminAccountCommission,
  loadAdminCommissionChangeLog,
  loadAdminCommissionConfirmations,
  loadAdminCommissionExceptions,
  loadAdminCommissionPolicies
} from '../src/features/admin_commissions/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const policyId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const accountId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const exceptionId = 'cccccccccccccccccccccccc';
const confirmationId = 'dddddddddddddddddddddddd';
const auditId = 'eeeeeeeeeeeeeeeeeeeeeeee';
const adminId = 'ffffffffffffffffffffffff';
const date = '2026-08-20T09:00:00.000Z';

const policy = commissionPolicySchema.parse({
  id: policyId,
  key: 'default.sale',
  label: 'Default sale commission',
  kind: 'percentage',
  scope: { kind: 'default' },
  percentageBps: 250,
  effectiveFrom: date,
  status: 'active',
  version: 2,
  createdBy: adminId,
  updatedBy: adminId,
  createdAt: date,
  updatedAt: date
});
const exception = commissionExceptionSchema.parse({
  id: exceptionId,
  accountId,
  kind: 'fixed',
  fixedAmountMinor: 5000,
  currency: 'EGP',
  reason: 'Approved account exception',
  effectiveFrom: date,
  status: 'draft',
  source: 'exception',
  version: 0,
  createdBy: adminId,
  updatedBy: adminId,
  createdAt: date,
  updatedAt: date
});
const account = commissionAccountCommissionSchema.parse({ accountId, source: 'policy', effectiveAt: date, policyId, policyVersion: policy.version, kind: policy.kind, percentageBps: policy.percentageBps });
const override = commissionAccountOverrideSchema.parse({ id: '111111111111111111111111', accountId, kind: 'percentage', percentageBps: 300, effectiveFrom: date, status: 'draft', version: 0, source: 'account_override', createdBy: adminId, updatedBy: adminId, createdAt: date, updatedAt: date });
const confirmationList = commissionConfirmationListDataSchema.parse({ items: [{ id: confirmationId, accountId, source: 'policy', sourceRecordId: policyId, policyVersion: policy.version, policyId, effectiveAt: date, status: 'acknowledged', acknowledgedAt: date, acknowledgedBy: adminId, version: 1, createdAt: date, updatedAt: date }], page: 1, limit: 20, total: 1 });
const exceptionList = commissionExceptionListDataSchema.parse({ items: [exception], page: 1, limit: 20, total: 1 });
const policyList = commissionPolicyListDataSchema.parse({ items: [policy], page: 1, limit: 20, total: 1 });
const changeLog = commissionChangeLogListDataSchema.parse({ items: [{ id: auditId, targetType: 'commission_policy', targetId: policyId, actorType: 'admin', actorId: adminId, action: 'commission.policy.created', reason: 'Approved policy change', before: {}, after: { status: 'active' }, effectiveFrom: date, requestId: 'commission-test', traceId: '0123456789abcdef0123456789abcdef', createdAt: date }], page: 1, limit: 25, total: 1 });

const session = { status: 'authenticated' as const, role: 'admin' as const };
const authorization = { getAuthorizationHeader: () => 'Bearer admin.commissions.test' };

function envelope(data: unknown, meta: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-commissions-test', ...meta } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; query: string; authorization: string | null; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      const method = init?.method ?? 'GET';
      requests.push({ method, path: url.pathname, query: url.search, authorization: new Headers(init?.headers).get('authorization'), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown });
      if (method === 'POST' && url.pathname.endsWith('/commission-policies')) return envelope(policy);
      if (method === 'POST' && url.pathname.endsWith('/commission-exceptions')) return envelope(exception);
      if (method === 'PUT') return envelope(override);
      if (url.pathname.endsWith('/account-commissions/' + accountId)) return envelope(account);
      if (url.pathname.endsWith('/commission-exceptions')) return envelope(exceptionList, { page: 1, limit: 20, total: 1 });
      if (url.pathname.endsWith('/commission-confirmations')) return envelope(confirmationList, { page: 1, limit: 20, total: 1 });
      if (url.pathname.endsWith('/commission-change-log')) return envelope(changeLog, { page: 1, limit: 25, total: 1 });
      return envelope(policyList, { page: 1, limit: 20, total: 1 });
    }
  });
}

const loaders = {
  loadPolicies: vi.fn(async () => policyList),
  createPolicy: vi.fn(async () => policy),
  loadAccount: vi.fn(async () => account),
  createAccountOverride: vi.fn(async () => override),
  loadExceptions: vi.fn(async () => exceptionList),
  createException: vi.fn(async () => exception),
  loadConfirmations: vi.fn(async () => confirmationList),
  loadChangeLog: vi.fn(async () => changeLog)
};

describe('Admin commission policies, exceptions, and confirmations', () => {
  it('uses implemented API routes, strict schemas, and authorization headers', async () => {
    const requests: Array<{ method: string; path: string; query: string; authorization: string | null; body: unknown }> = [];
    const client = apiClientFor(requests);
    await expect(loadAdminCommissionPolicies({ apiClient: client, authorization, query: { status: 'active', page: 2, limit: 10 } })).resolves.toEqual(policyList);
    await expect(createAdminCommissionPolicy({ key: 'default.sale', label: 'Default sale commission', kind: 'percentage', scope: { kind: 'default' }, percentageBps: 250, effectiveFrom: date }, { apiClient: client, authorization })).resolves.toEqual(policy);
    await expect(loadAdminAccountCommission(accountId, { apiClient: client, authorization })).resolves.toEqual(account);
    await expect(createAdminAccountCommissionOverride(accountId, { kind: 'percentage', percentageBps: 300, effectiveFrom: date }, { apiClient: client, authorization })).resolves.toEqual(override);
    await expect(loadAdminCommissionExceptions({ apiClient: client, authorization })).resolves.toEqual(exceptionList);
    await expect(createAdminCommissionException({ accountId, kind: 'fixed', fixedAmountMinor: 5000, currency: 'EGP', reason: 'Approved account exception', effectiveFrom: date }, { apiClient: client, authorization })).resolves.toEqual(exception);
    await expect(loadAdminCommissionConfirmations({ apiClient: client, authorization })).resolves.toEqual(confirmationList);
    await expect(loadAdminCommissionChangeLog({ apiClient: client, authorization })).resolves.toEqual(changeLog);
    expect(requests.every(item => item.authorization === 'Bearer admin.commissions.test')).toBe(true);
    expect(requests.map(item => `${item.method} ${item.path}`)).toEqual([
      'GET /api/v1/admin/commission-policies',
      'POST /api/v1/admin/commission-policies',
      `GET /api/v1/admin/account-commissions/${accountId}`,
      `PUT /api/v1/admin/account-commissions/${accountId}`,
      'GET /api/v1/admin/commission-exceptions',
      'POST /api/v1/admin/commission-exceptions',
      'GET /api/v1/admin/commission-confirmations',
      'GET /api/v1/admin/commission-change-log'
    ]);
    expect(requests[1]?.body).toEqual({ key: 'default.sale', label: 'Default sale commission', kind: 'percentage', scope: { kind: 'default' }, percentageBps: 250, effectiveFrom: date });
  });

  it.each([
    ['/admin/commissions', 'ADM-39'],
    ['/admin/commissions/new', 'ADM-40'],
    ['/admin/commissions/history', 'ADM-41'],
    [`/admin/commissions/account?accountId=${accountId}`, 'ADM-42'],
    ['/admin/commissions/exceptions', 'ADM-43'],
    ['/admin/commissions/exceptions/new', 'ADM-44'],
    ['/admin/commissions/confirmations', 'ADM-45']
  ] as const)('renders %s as %s in every locale with desktop state and safe projections', async (path, screenId) => {
    for (const locale of ['ar', 'en',] as const) {
      window.history.pushState({}, '', path);
      const result = renderWithLocale(<AdminCommissions locale={locale} session={session} authClient={authorization} {...loaders} />, { locale });
      await waitFor(() => expect(result.container.querySelector(`[data-screen-id="${screenId}"]`)).not.toBeNull());
      expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
      expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
      expect(result.container.textContent).not.toMatch(/storageKey|privateUrl|internalNotes|assignedTo|auditData|accessToken|refreshToken|universal commission/u);
      result.unmount();
    }
  });

  it('validates a policy before mutation and sends no unsupported universal value', async () => {
    const create = vi.fn(async () => policy);
    window.history.pushState({}, '', '/admin/commissions/new');
    const result = renderWithLocale(<AdminCommissions locale="en" session={session} authClient={authorization} {...loaders} createPolicy={create} />, { locale: 'en' });
    const form = result.container.querySelector('form.admin-commissions__form');
    expect(form).not.toBeNull();
    if (form === null) throw new Error('Expected the policy form to render.');
    fireEvent.submit(form);
    expect(create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'default.sale' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Default sale commission' } });
    fireEvent.change(screen.getByLabelText('Percentage basis points'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-08-20T09:00' } });
    fireEvent.submit(form);
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'percentage', percentageBps: 250, scope: { kind: 'default' } })));
  });

  it('does not offer mutation to a view-only admin while still loading read views', async () => {
    const viewOnlyAuthorization = { getAuthorizationHeader: () => 'Bearer admin.view-only', hasAvailableAction: (action: string) => action === 'admin:commissions.view' };
    window.history.pushState({}, '', '/admin/commissions/new');
    const result = renderWithLocale(<AdminCommissions locale="en" session={session} authClient={viewOnlyAuthorization} createPolicy={loaders.createPolicy} />, { locale: 'en' });
    const form = result.container.querySelector('form.admin-commissions__form');
    expect(form).not.toBeNull();
    if (form === null) throw new Error('Expected the view-only policy form to render.');
    expect(screen.getByRole('button', { name: getAdminCommissionsCopy('en').actions.save })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Key'), { target: { value: 'default.sale' } });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Default sale commission' } });
    fireEvent.change(screen.getByLabelText('Percentage basis points'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-08-20T09:00' } });
    fireEvent.submit(form);
    expect(await screen.findByText(getAdminCommissionsCopy('en').states.permission.body)).toBeInTheDocument();
  });
});
