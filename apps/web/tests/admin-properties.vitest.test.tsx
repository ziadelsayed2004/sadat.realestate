import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  propertyDataSchema,
  propertyDuplicateDataSchema,
  propertyReportDataSchema,
  propertyReportListDataSchema,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  AdminProperties,
  loadAdminProperties,
  loadAdminPropertyDuplicates,
  loadAdminPropertyReports,
  resolveAdminPropertyReport,
  reviewAdminProperty
} from '../src/features/admin_properties/index.ts';
import { ApiClient } from '../src/features/contracts/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';
import type { AdminPropertyListData } from '../src/features/admin_properties/index.ts';
import { getAdminPropertiesCopy } from '../src/features/admin_properties/copy.ts';

const session = { status: 'authenticated' as const, role: 'admin' as const };
const property = propertyDataSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  kind: 'property',
  name: { ar: 'فيلا النيل', en: 'Nile Villa', 'zh-CN': '尼罗别墅' },
  slug: 'nile-villa',
  transactionType: 'sale',
  source: { providerId: 'bbbbbbbbbbbbbbbbbbbbbbbb', sourceType: 'developer_company', organizationId: 'cccccccccccccccccccccccc' },
  status: 'pending_review',
  active: true,
  version: 3,
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
  availableActions: ['approve', 'reject', 'hide']
});
const candidateId = 'dddddddddddddddddddddddd';
const reportId = 'eeeeeeeeeeeeeeeeeeeeeeee';
const properties: AdminPropertyListData = { items: [property], page: 1, limit: 20, total: 1 };
const duplicates = propertyDuplicateDataSchema.parse({
  propertyId: property.id,
  items: [{ candidateId, signals: ['same_slug', 'same_location_transaction'], explanation: 'The slug and transaction location match.' }],
  total: 1
});
const report = propertyReportDataSchema.parse({
  id: reportId,
  propertyId: property.id,
  reporterId: 'ffffffffffffffffffffffff',
  reason: 'duplicate',
  details: 'The listing appears to duplicate another property.',
  status: 'open',
  version: 2,
  createdAt: '2026-08-17T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z'
});
const reports = propertyReportListDataSchema.parse({ items: [report], page: 1, limit: 20, total: 1 });
const authorization = { getAuthorizationHeader: () => 'Bearer admin.properties.test' };

function envelope(data: unknown, meta: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-properties-test', ...meta } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('Admin property management contracts and views', () => {
  it('uses implemented property, duplicate, and report routes with strict schemas and authorization', async () => {
    const requests: Array<{ method: string; path: string; query: URLSearchParams; authorization: string | null; body: unknown }> = [];
    const client = new ApiClient({
      fetcher: async (input, init) => {
        const url = new URL(String(input), 'http://sadat-real-estate.local');
        requests.push({
          method: init?.method ?? 'GET',
          path: url.pathname,
          query: url.searchParams,
          authorization: new Headers(init?.headers).get('authorization'),
          body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown
        });
        if (url.pathname === '/api/v1/admin/properties/possible-duplicates') return envelope(duplicates);
        if (url.pathname === '/api/v1/admin/property-reports') return envelope(reports);
        if (url.pathname.endsWith('/property-reports/eeeeeeeeeeeeeeeeeeeeeeee/resolve')) return envelope(report);
        if (url.pathname.endsWith('/review') || url.pathname.endsWith('/visibility')) return envelope(property);
        return envelope({ items: properties.items }, { page: 2, limit: 5, total: 1 });
      }
    });

    await expect(loadAdminProperties({ apiClient: client, authorization, query: { status: 'pending_review', page: 2, limit: 5 } })).resolves.toEqual({ ...properties, page: 2, limit: 5 });
    await expect(reviewAdminProperty(property.id, { version: property.version, action: 'approve', reason: 'Approved after evidence review' }, { apiClient: client, authorization })).resolves.toEqual(property);
    await expect(loadAdminPropertyDuplicates(property.id, { apiClient: client, authorization, query: { limit: 20 } })).resolves.toEqual(duplicates);
    await expect(loadAdminPropertyReports({ apiClient: client, authorization, query: { status: 'open', page: 2, limit: 5 } })).resolves.toEqual(reports);
    await expect(resolveAdminPropertyReport(report.id, { version: report.version, action: 'resolve', reason: 'Reviewed duplicate evidence' }, { apiClient: client, authorization })).resolves.toEqual(report);

    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual([
      'GET /api/v1/admin/properties',
      `POST /api/v1/admin/properties/${property.id}/review`,
      'GET /api/v1/admin/properties/possible-duplicates',
      'GET /api/v1/admin/property-reports',
      `POST /api/v1/admin/property-reports/${report.id}/resolve`
    ]);
    expect(requests.every(request => request.authorization === 'Bearer admin.properties.test')).toBe(true);
    expect(requests[0]?.query.get('status')).toBe('pending_review');
    expect(requests[2]?.query.get('propertyId')).toBe(property.id);
    expect(requests[4]?.body).toEqual({ version: 2, action: 'resolve', reason: 'Reviewed duplicate evidence' });
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders the safe property projection with locale direction for %s', async (locale: SupportedLocale) => {
    window.history.pushState({}, '', '/admin/properties');
    const result = renderWithLocale(<AdminProperties locale={locale} session={session} view="list" initialProperties={properties} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`admin-property-${property.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-screen-id="ADM-14"]')).not.toBeNull();
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.container.textContent).toContain(locale === 'en' ? 'Nile Villa' : locale === 'ar' ? 'فيلا النيل' : '尼罗别墅');
    expect(result.container.textContent).not.toMatch(/reviewedBy|reporterId|internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    result.unmount();
  });

  it('passes strict filter values to the list loader and fails closed for non-admin sessions', async () => {
    const load = vi.fn().mockResolvedValue(properties);
    renderWithLocale(<AdminProperties locale="en" session={session} view="list" loadProperties={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId(`admin-property-${property.id}`)).toBeInTheDocument());
    fireEvent.change(screen.getAllByLabelText('Search properties')[0]!, { target: { value: 'nile-villa' } });
    fireEvent.submit(screen.getAllByRole('search', { name: 'Search properties' })[0]!);
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'nile-villa', page: 1 }), expect.any(AbortSignal)));

    const deniedLoad = vi.fn();
    renderWithLocale(<AdminProperties locale="en" session={{ status: 'anonymous' }} view="list" loadProperties={deniedLoad} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: getAdminPropertiesCopy('en').states.permission.title })).toBeInTheDocument();
    expect(deniedLoad).not.toHaveBeenCalled();
  });

  it('requires a reason and submits only a server-provided property action', async () => {
    const review = vi.fn().mockResolvedValue(property);
    const visibility = vi.fn().mockResolvedValue(property);
    renderWithLocale(<AdminProperties locale="en" session={session} view="review" propertyId={property.id} initialProperties={properties} reviewProperty={review} changeVisibility={visibility} />, { locale: 'en' });
    await waitFor(() => expect(screen.getAllByRole('heading', { name: getAdminPropertiesCopy('en').titles.review, level: 1 })[0]).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: getAdminPropertiesCopy('en').saveAction }));
    expect(review).not.toHaveBeenCalled();
    expect(screen.getByText(getAdminPropertiesCopy('en').reasonRequired)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(getAdminPropertiesCopy('en').reasonLabel), { target: { value: 'Approved after evidence review' } });
    fireEvent.click(screen.getByRole('button', { name: getAdminPropertiesCopy('en').saveAction }));
    await waitFor(() => expect(review).toHaveBeenCalledWith(property.id, { version: property.version, action: 'approve', reason: 'Approved after evidence review' }));
    expect(visibility).not.toHaveBeenCalled();
  });

  it('renders explainable duplicate signals without private data', async () => {
    const result = renderWithLocale(<AdminProperties locale="en" session={session} view="duplicates" propertyId={property.id} initialProperties={properties} initialDuplicates={duplicates} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText(candidateId)).toBeInTheDocument());
    expect(result.container.querySelector('[data-screen-id="ADM-16"]')).not.toBeNull();
    expect(screen.getByText('The slug and transaction location match.')).toBeInTheDocument();
    expect(result.container.textContent).not.toMatch(/reviewedBy|reporterId|internalNotes|assignedTo|auditData|storageKey|privateUrl/u);
  });

  it('requires a reason and sends report versioned resolution', async () => {
    const resolve = vi.fn().mockResolvedValue(report);
    renderWithLocale(<AdminProperties locale="en" session={session} view="reports" reportId={report.id} initialReports={reports} resolveReport={resolve} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByText(report.details ?? '')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: getAdminPropertiesCopy('en').saveAction }));
    expect(resolve).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(getAdminPropertiesCopy('en').reasonLabel), { target: { value: 'Reviewed duplicate evidence' } });
    fireEvent.click(screen.getByRole('button', { name: getAdminPropertiesCopy('en').saveAction }));
    await waitFor(() => expect(resolve).toHaveBeenCalledWith(report.id, { version: report.version, action: 'resolve', reason: 'Reviewed duplicate evidence' }));
    expect(document.querySelector('[data-screen-id="ADM-17"]')?.textContent ?? '').not.toMatch(/reporterId|internalNotes|assignedTo|auditData|storageKey|privateUrl/u);
  });
});
