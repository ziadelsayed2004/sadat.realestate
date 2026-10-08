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
import { adminAccountUserListDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
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
  loadUsers: vi.fn(async () => adminAccountUserListDataSchema.parse({ items: [{ id: accountId, displayName: 'Brokerage Office', email: 'office@example.test', roleType: 'provider', status: 'verified', locale: 'en', version: 1, statusChangedAt: date, createdAt: date, updatedAt: date, availableActions: [] }], page: 1, limit: 20, total: 1 })),
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
  it('creates a six-percent exception starting now with no ending date by default', async () => {
    window.history.pushState({}, '', '/admin/commissions/exceptions/new');
    const update = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ...exception, status: 'active', version: 1 });
    const create = vi.fn(async (_input: import('@sadat-real-estate/contracts').CommissionExceptionCreate) => exception);
    renderWithLocale(<AdminCommissions locale="en" session={session} {...loaders} createException={create} updateException={update} />, { locale: 'en' });
    const copy = getAdminCommissionsCopy('en');
    expect(screen.getByLabelText('Starts now')).toBeChecked();
    expect(screen.getByLabelText('Continues until I change it')).toBeChecked();
    expect(screen.queryByLabelText(copy.labels.effectiveTo!)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(copy.labels.accountId!), { target: { value: accountId } });
    fireEvent.change(screen.getByLabelText(copy.labels.percentageBps!), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(copy.labels.reason!), { target: { value: 'Owner special commission' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0]?.[0]).toMatchObject({ accountId, percentageBps: 600 });
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('effectiveTo');
    const activate = await screen.findByRole('button', { name: 'Approve and activate exception' });
    fireEvent.click(activate);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(activate);
    expect(await screen.findByText('Exception approved and activated for this account.')).toBeInTheDocument();
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenLastCalledWith(exception.id, { expectedVersion: exception.version, reason: exception.reason, status: 'active' });

  });
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
    const create = vi.fn(async (_input: unknown) => policy);
    window.history.pushState({}, '', '/admin/commissions/new');
    const result = renderWithLocale(<AdminCommissions locale="en" session={session} authClient={authorization} {...loaders} createPolicy={create} />, { locale: 'en' });
    const form = result.container.querySelector('form.admin-commissions__form');
    expect(form).not.toBeNull();
    if (form === null) throw new Error('Expected the policy form to render.');
    fireEvent.submit(form);
    expect(create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Default sale commission' } });
    fireEvent.change(screen.getByLabelText('Commission (%)'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-08-20' } });
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
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Default sale commission' } });
    fireEvent.change(screen.getByLabelText('Commission (%)'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-08-20' } });
    fireEvent.submit(form);
    expect(await screen.findByText(getAdminCommissionsCopy('en').states.permission.body)).toBeInTheDocument();
  });

  it('requests an automatically generated policy code and translates percentages and amounts to API units', async () => {
    const create = vi.fn(async (_input: unknown) => policy);
    window.history.pushState({}, '', '/admin/commissions/new');
    const result = renderWithLocale(<AdminCommissions locale="en" session={session} {...loaders} createPolicy={create} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Standard commission' } });
    fireEvent.change(screen.getByLabelText('Commission (%)'), { target: { value: '2.5' } });
    const form = result.container.querySelector('form.admin-commissions__form')!;
    fireEvent.submit(form);
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ percentageBps: 250 })));
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty('key');
    fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'fixed' } });
    fireEvent.change(screen.getByLabelText('Commission amount'), { target: { value: '125.50' } });
    fireEvent.submit(form);
    await waitFor(() => expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ fixedAmountMinor: 12550, currency: 'EGP' })));
  });

  it.each(['ar', 'en'] as const)('explains account duplicate conflicts in %s without losing entered values', async locale => {
    const copy = getAdminCommissionsCopy(locale);
    const create = vi.fn().mockRejectedValue(new ApiClientError('errors.conflict', {
      code: 'HTTP_ERROR', status: 409,
      apiError: { code: 'COMMISSION_ACCOUNT_DUPLICATE', messageKey: 'errors.conflict', details: [], requestId: 'commission-duplicate-test' }
    }));
    window.history.pushState({}, '', `/admin/commissions/account?accountId=${accountId}`);
    const result = renderWithLocale(<AdminCommissions locale={locale} session={session} {...loaders} createAccountOverride={create} />, { locale });
    const percentage = await screen.findByLabelText(copy.labels.percentageBps!);
    fireEvent.change(percentage, { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(copy.labels.effectiveFrom!), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText(copy.labels.effectiveTo!), { target: { value: '2026-10-06' } });
    fireEvent.submit(result.container.querySelector('form.admin-commissions__form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent(copy.mutation.duplicateAccount);
    expect(result.container).not.toHaveTextContent('errors.conflict');
    expect(percentage).toHaveValue(3);
    expect(screen.getByLabelText(copy.labels.effectiveTo!)).toHaveValue('2026-10-06');
    expect(create).toHaveBeenCalledWith(accountId, { kind: 'percentage', percentageBps: 300, effectiveFrom: '2026-10-05T00:00:00.000Z', effectiveTo: '2026-10-06T00:00:00.000Z' });
  });

  it('shows a draft confirmation on repeated saves rather than claiming the active commission changed', async () => {
    const copy = getAdminCommissionsCopy('ar');
    const create = vi.fn(async () => override);
    window.history.pushState({}, '', `/admin/commissions/account?accountId=${accountId}`);
    const result = renderWithLocale(<AdminCommissions locale="ar" session={session} {...loaders} createAccountOverride={create} />, { locale: 'ar' });
    fireEvent.change(await screen.findByLabelText(copy.labels.percentageBps!), { target: { value: '3' } });
    const form = result.container.querySelector('form.admin-commissions__form')!;
    fireEvent.submit(form);
    await waitFor(() => expect(result.container).toHaveTextContent(copy.mutation.savedDraft));
    fireEvent.submit(form);
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.container).toHaveTextContent(copy.mutation.savedDraft));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    new ApiClientError('errors.conflict', { code: 'HTTP_ERROR', status: 409 }),
    new ApiClientError('private network failure', { code: 'NETWORK_ERROR' })
  ])('uses a readable message for a generic conflict or network failure', async failure => {
    const copy = getAdminCommissionsCopy('ar');
    window.history.pushState({}, '', `/admin/commissions/account?accountId=${accountId}`);
    const result = renderWithLocale(<AdminCommissions locale="ar" session={session} {...loaders} createAccountOverride={vi.fn().mockRejectedValue(failure)} />, { locale: 'ar' });
    fireEvent.change(await screen.findByLabelText(copy.labels.percentageBps!), { target: { value: '3' } });
    fireEvent.submit(result.container.querySelector('form.admin-commissions__form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent(failure.status === 409 ? copy.mutation.conflict : copy.mutation.network);
    expect(result.container).not.toHaveTextContent(failure.message);
  });

  it('opens an account from the provider list without showing an error for the empty initial selection', async () => {
    const loadAccount = vi.fn(async () => account);
    window.history.pushState({}, '', '/admin/commissions/account');
    renderWithLocale(<AdminCommissions locale="en" session={session} {...loaders} loadAccount={loadAccount} />, { locale: 'en' });
    await screen.findByRole('option', { name: 'Brokerage Office — office@example.test' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(loadAccount).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Provider account'), { target: { value: accountId } });
    await waitFor(() => expect(loadAccount).toHaveBeenCalledWith(accountId, undefined, expect.any(AbortSignal)));
    expect(new URL(window.location.href).searchParams.get('accountId')).toBe(accountId);
    expect(await screen.findByText('2.50%')).toBeInTheDocument();
  });
});
