import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  accountReportDataSchema,
  accountReportListDataSchema,
  accountTransitionDataSchema,
  adminAccountUserDataSchema
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  AdminAccountReports,
  getAdminAccountReportsCopy,
  loadAdminAccountReports,
  resolveAdminAccountReport,
  transitionAdminAccount
} from '../src/features/admin_accounts/index.ts';
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
  availableActions: ['restrict', 'suspend']
});
const report = accountReportDataSchema.parse({
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  accountId: user.id,
  accountRoleType: 'seeker',
  reporterId: 'cccccccccccccccccccccccc',
  reason: 'Repeated policy violations',
  details: 'The account has received multiple reports.',
  relatedReports: 2,
  status: 'open',
  version: 1,
  createdAt: '2026-08-17T08:00:00.000Z',
  updatedAt: '2026-08-18T08:00:00.000Z'
});
const reportList = accountReportListDataSchema.parse({ items: [report], page: 1, limit: 20, total: 1 });
const resolvedReport = accountReportDataSchema.parse({ ...report, status: 'resolved', resolutionReason: 'Reviewed and resolved with evidence', version: 2, updatedAt: '2026-08-19T08:00:00.000Z' });
const transition = accountTransitionDataSchema.parse({
  transitionId: 'dddddddddddddddddddddddd',
  userId: user.id,
  roleType: 'seeker',
  action: 'restrict',
  fromStatus: 'verified',
  status: 'restricted',
  reason: 'Restriction reason with evidence',
  version: 3,
  changedAt: '2026-08-19T08:00:00.000Z',
  availableActions: ['verify']
});

function success(data: unknown): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-account-reports-test' } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('Admin account reports and restrictions', () => {
  it('uses strict list, resolution, and account-transition contracts with authorization', async () => {
    const requests: Array<{ method: string; path: string; query: URLSearchParams; authorization: string | null; body: unknown }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown;
        requests.push({ method: init?.method ?? 'GET', path: url.pathname, query: url.searchParams, authorization: new Headers(init?.headers).get('authorization'), body });
        if (url.pathname === '/api/v1/admin/account-reports') return success(reportList);
        if (url.pathname.endsWith('/resolve')) return success(resolvedReport);
        return success(transition);
      }
    });
    const authorization = { getAuthorizationHeader: () => 'Bearer admin.account-reports.test' };

    await expect(loadAdminAccountReports({ apiClient: client, authorization, query: { status: 'open', page: 2, limit: 5 } })).resolves.toEqual(reportList);
    await expect(resolveAdminAccountReport(report.id, { version: report.version, action: 'resolve', reason: 'Reviewed with evidence' }, { apiClient: client, authorization })).resolves.toEqual(resolvedReport);
    await expect(transitionAdminAccount(user.id, { action: 'restrict', reason: 'Restriction reason' }, { apiClient: client, authorization })).resolves.toEqual(transition);

    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual([
      'GET /api/v1/admin/account-reports',
      `POST /api/v1/admin/account-reports/${report.id}/resolve`,
      `POST /api/v1/admin/users/${user.id}/transitions`
    ]);
    expect(requests[0]?.query.get('status')).toBe('open');
    expect(requests[0]?.query.get('page')).toBe('2');
    expect(requests[0]?.query.get('limit')).toBe('5');
    expect(requests[1]?.body).toEqual({ version: 1, action: 'resolve', reason: 'Reviewed with evidence' });
    expect(requests[2]?.body).toEqual({ action: 'restrict', reason: 'Restriction reason' });
    expect(requests.every(request => request.authorization === 'Bearer admin.account-reports.test')).toBe(true);
  });

  it.each(['ar', 'en',] as const)('renders the report list with locale direction for %s', async locale => {
    const result = renderWithLocale(<AdminAccountReports locale={locale} session={session} view="reports" initialData={reportList} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`admin-account-report-${report.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: getAdminAccountReportsCopy(locale).list.title, level: 1 })).toBeInTheDocument();
    expect(result.container.querySelector('[data-screen-id="ADM-06"]')).not.toBeNull();
    expect(result.container.textContent).not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    result.unmount();
  });

  it('requires a reason and applies server-authoritative report and account actions', async () => {
    const resolve = vi.fn().mockResolvedValue(resolvedReport);
    const transitionAccount = vi.fn().mockResolvedValue(transition);
    renderWithLocale(<AdminAccountReports locale="en" session={session} view="reports" reportId={report.id} initialData={reportList} initialAccountData={user} resolveReport={resolve} transitionAccount={transitionAccount} />, { locale: 'en' });
    await waitFor(() => expect(screen.queryByTestId(`admin-account-report-${report.id}`)).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Report details', level: 1 })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Resolve report' }));
    expect(resolve).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Reason for this action'), { target: { value: 'Restriction reason' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restrict' }));
    await waitFor(() => expect(transitionAccount).toHaveBeenCalledWith(user.id, { action: 'restrict', reason: 'Restriction reason' }, undefined));
    fireEvent.change(screen.getByLabelText('Reason for this action'), { target: { value: 'Reviewed with evidence' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve report' }));
    await waitFor(() => expect(resolve).toHaveBeenCalledWith(report.id, { version: 1, action: 'resolve', reason: 'Reviewed with evidence' }, undefined));
    expect(screen.getByRole('status')).toHaveTextContent(getAdminAccountReportsCopy('en').success);
    expect(screen.getByRole('main').textContent ?? '').not.toMatch(/internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
  });

  it('fails closed for non-admin sessions without calling loaders', async () => {
    const load = vi.fn();
    renderWithLocale(<AdminAccountReports locale="en" session={{ status: 'anonymous' }} view="reports" loadReports={load} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getAdminAccountReportsCopy('en').states.permission.title })).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
});
