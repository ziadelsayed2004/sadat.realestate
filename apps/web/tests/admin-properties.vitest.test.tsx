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
import { FeaturedPropertyControl } from '../src/features/admin_properties/featured.tsx';

const session = { status: 'authenticated' as const, role: 'admin' as const };
const property = propertyDataSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  kind: 'property',
  name: { ar: 'فيلا النيل', en: 'Nile Villa',},
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

it.each(['ar', 'en'] as const)('names an unpublished compound and provider with authorized links in review (%s)', async locale => {
  const data = propertyDataSchema.parse({ ...property, kind: 'unit', projectId: 'd'.repeat(24), reviewContext: { project: { name: { ar: 'كمبوند الشركة', en: 'Owner compound' }, status: 'draft', adminPath: `/admin/projects/review?projectId=${'d'.repeat(24)}` }, organization: { name: { ar: 'شركة المطور', en: 'Owner developer' }, kind: 'developer_company', adminPath: `/admin/providers/${'b'.repeat(24)}`, publicPath: '/developers/owner-company', projectsPath: '/developers/owner-company#developer-projects' } } });
  renderWithLocale(<AdminProperties locale={locale} session={session} view="review" propertyId={data.id} initialProperties={{ ...properties, items: [data] }} />, { locale });
  expect(await screen.findByRole('heading', { name: locale === 'ar' ? 'كمبوند الشركة' : 'Owner compound' })).toBeVisible();
  expect(screen.getByRole('heading', { name: locale === 'ar' ? 'شركة المطور' : 'Owner developer' })).toBeVisible();
  expect(screen.getByRole('link', { name: locale === 'ar' ? 'مراجعة المشروع بالإدارة' : 'Review project in administration' })).toHaveAttribute('href', `/admin/projects/review?projectId=${'d'.repeat(24)}&lang=${locale}`);
  expect(screen.getByRole('link', { name: locale === 'ar' ? 'المشروعات المنشورة' : 'Published projects' })).toHaveAttribute('href', `/developers/owner-company?lang=${locale}#developer-projects`);
  expect(screen.queryByRole('link', { name: locale === 'ar' ? 'فتح المشروع في الموقع' : 'Open public project' })).not.toBeInTheDocument();
  expect(screen.queryByText('developer_company')).not.toBeInTheDocument();
  expect(screen.queryByText('unit', { exact: true })).not.toBeInTheDocument();
});

it.each(['published', 'pending_review', 'expired'] as const)('saves automatic homepage selection and explains the actual %s visibility', async state => {
  const current = propertyDataSchema.parse({ ...property, status: state === 'pending_review' ? state : 'published', ...(state === 'expired' ? { expiresAt: '2020-01-01T00:00:00.000Z' } : {}) });
  const saved = { ...current, featured: true, version: current.version + 1 };
  const request = vi.spyOn(ApiClient.prototype, 'request').mockResolvedValue({ data: { data: saved } } as never);
  const onSaved = vi.fn();
  renderWithLocale(<FeaturedPropertyControl property={current} locale="en" onSaved={onSaved} />, { locale: 'en' });
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Feature on homepage' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save featured selection' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  expect(request).toHaveBeenCalledWith(`/admin/properties/${current.id}/featured`, expect.objectContaining({ json: { version: current.version, featured: true, reason: 'Manage homepage featured property' } }));
  expect(screen.getByRole('status')).toHaveTextContent(state === 'published' ? 'Property added first' : 'must be published, active and unexpired');
});

it.each(['ar', 'en'] as const)('shows the provider request and saves approval using the current version in %s', async locale => {
  const pending = propertyDataSchema.parse({ ...property, status: 'published', availableActions: ['approve_deactivation', 'reject_deactivation'], deactivationRequest: { status: 'pending', reason: 'Property has been sold', requestedAt: property.updatedAt } });
  const visibility = vi.fn().mockResolvedValue({ ...pending, status: 'hidden', active: false, version: 4, availableActions: ['restore'], deactivationRequest: { ...pending.deactivationRequest, status: 'approved', decisionReason: 'Confirm property is sold' } });
  const review = vi.fn();
  const copy = getAdminPropertiesCopy(locale);
  renderWithLocale(<AdminProperties locale={locale} session={session} view="review" propertyId={pending.id} initialProperties={{ ...properties, items: [pending] }} changeVisibility={visibility} reviewProperty={review} />, { locale });
  expect(await screen.findByText('Property has been sold')).toBeInTheDocument();
  expect(screen.getByLabelText(copy.columns.actions)).toHaveValue('approve_deactivation');
  fireEvent.change(screen.getByLabelText(copy.reasonLabel), { target: { value: 'Confirm property is sold' } });
  fireEvent.click(screen.getByRole('button', { name: copy.saveAction }));
  await waitFor(() => expect(visibility).toHaveBeenCalledWith(pending.id, { version: 3, action: 'approve_deactivation', reason: 'Confirm property is sold' }));
  expect(review).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByLabelText(copy.columns.actions)).toHaveValue('restore'));
});
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
  it.each([
    { query: 'deactivationStatus=pending', expected: { deactivationStatus: 'pending' } },
    { query: 'status=published&active=true', expected: { status: 'published', active: true } },
    { query: 'status=published&active=false', expected: { status: 'published', active: false } },
    { query: 'status=invalid&active=invalid', expected: {} }
  ])('applies validated dashboard URL filters to the loader and controls: $query', async ({ query, expected }) => {
    const load = vi.fn().mockResolvedValue(properties);
    renderWithLocale(<AdminProperties locale="en" session={session} view="list" url={`/admin/properties?${query}&lang=en`} loadProperties={load} />, { locale: 'en' });
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(load.mock.calls[0]?.[0]).toEqual({ page: 1, limit: 20, sort: 'updatedAt', direction: 'desc', ...expected });
    expect(document.getElementById('admin-properties-status')).toHaveValue(expected.status ?? '');
    expect(document.getElementById('admin-properties-active')).toHaveValue(expected.active === undefined ? '' : String(expected.active));
  });
  it.each(['ar', 'en'] as const)('opens a dedicated pending deactivation list and retains its filter when searching in %s', async locale => {
    const load = vi.fn().mockResolvedValue(properties);
    renderWithLocale(<AdminProperties locale={locale} session={session} view="review" url={`/admin/properties/review?deactivationStatus=pending&lang=${locale}`} loadProperties={load} />, { locale });
    await waitFor(() => expect(load).toHaveBeenCalledWith(expect.objectContaining({ deactivationStatus: 'pending', page: 1 }), expect.anything()));
    expect(screen.getByRole('link', { name: locale === 'ar' ? 'طلبات إلغاء التفعيل المعلقة' : 'Pending deactivation requests' })).toHaveAttribute('href', `/admin/properties/review?deactivationStatus=pending&lang=${locale}`);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sold' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ deactivationStatus: 'pending', search: 'sold', page: 1 }), expect.anything()));
  });
  it.each(['ar', 'en'] as const)('opens published details, photos, editing, public view and archive for %s', async locale => {
    const published = { ...property, status: 'published' as const, imageUrl: 'https://example.com/cover.jpg', availableActions: ['hide', 'archive', 'update'] as const };
    const result = renderWithLocale(<AdminProperties locale={locale} session={session} view="review" initialProperties={{ ...properties, items: [{ ...published, availableActions: [...published.availableActions] }] }} />, { locale });
    const row = await screen.findByTestId(`admin-property-${property.id}`);
    expect(row.querySelector('img')).toHaveAttribute('src', published.imageUrl);
    expect(row).toHaveTextContent(locale === 'ar' ? 'عقار · بيع' : 'Property · Sale');
    expect(row.querySelector(`a[href="/admin/providers/${property.source.providerId}?lang=${locale}"]`)).toHaveTextContent(locale === 'ar' ? 'شركة مطوّرة' : 'Developer company');
    expect(row).not.toHaveTextContent('developer_company');
    expect(row.querySelector('a[href$="#admin-property-editor"]')).toBeInTheDocument();
    expect(row.querySelector('a[href$="#admin-property-actions"]')).toHaveAttribute('href', `/admin/properties/review?propertyId=${property.id}&action=archive&lang=${locale}#admin-property-actions`);
    expect(row.querySelector(`a[href="/properties/nile-villa?lang=${locale}"]`)).toBeInTheDocument();
    result.unmount();
    renderWithLocale(<AdminProperties locale={locale} session={session} view="review" propertyId={property.id} url={`/admin/properties/review?action=archive`} initialProperties={{ ...properties, items: [{ ...published, availableActions: ['hide', 'archive'] }] }} />, { locale });
    expect(document.querySelector('#admin-property-action')).toHaveValue('archive');
  });

  it('keeps details accessible to viewers and omits edit, archive and expired public links', async () => {
    renderWithLocale(<AdminProperties locale="en" session={session} view="list" initialProperties={{ ...properties, items: [{ ...property, status: 'published', expiresAt: '2020-01-01T00:00:00.000Z', availableActions: [] }] }} />, { locale: 'en' });
    const row = await screen.findByTestId(`admin-property-${property.id}`);
    expect(row.innerHTML).toContain(`/admin/properties/review?propertyId=${property.id}&amp;lang=en`);
    expect(row.querySelector('a[href*="#admin-property"]')).toBeNull();
    expect(row.querySelector('a[href^="/properties/"]')).toBeNull();
  });
  it('uses a table skeleton while property rows are loading', () => {
    const result = renderWithLocale(<AdminProperties locale="ar" session={session} view="list" loadProperties={() => new Promise(() => undefined)} />, { locale: 'ar' });
    expect(result.container.querySelector('.ui-skeleton[data-variant="table"]')).not.toBeNull();
  });
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

  it.each(['ar', 'en',] as const)('renders the safe property projection with locale direction for %s', async (locale: SupportedLocale) => {
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
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
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


it('uses the review response for publication, the public link and the next visibility version', async () => {
  const approved = propertyDataSchema.parse({ ...property, status: 'approved', active: false, availableActions: ['publish'] });
  const published = propertyDataSchema.parse({ ...approved, status: 'published', active: true, version: 4, availableActions: ['hide'] });
  const review = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(published);
  const visibility = vi.fn().mockResolvedValue({ ...published, status: 'hidden', active: false, version: 5, availableActions: ['restore'] });
  renderWithLocale(<AdminProperties locale="en" session={session} view="review" propertyId={property.id} initialProperties={{ ...properties, items: [approved] }} reviewProperty={review} changeVisibility={visibility} />, { locale: 'en' });
  await waitFor(() => expect(screen.getByLabelText('Action reason (optional)')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Publish property' }));
  await waitFor(() => expect(screen.getByText(getAdminPropertiesCopy('en').states.error.body)).toBeInTheDocument());
  expect(screen.queryByRole('link', { name: 'View published property' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Publish property' }));
  await waitFor(() => expect(screen.getByRole('link', { name: 'View published property' })).toHaveAttribute('href', '/properties/nile-villa?lang=en'));
  expect(screen.getByText('Property published and visible to visitors.')).toBeInTheDocument();
  expect(screen.getByLabelText('Actions')).toHaveValue('hide');
  expect(review).toHaveBeenLastCalledWith(property.id, { version: 3, action: 'publish', reason: 'Administrative property publish' });
  fireEvent.change(screen.getByLabelText('Action reason'), { target: { value: 'Publish after checking the listing' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save action' }));
  await waitFor(() => expect(visibility).toHaveBeenCalledWith(property.id, { version: 4, action: 'hide', reason: 'Publish after checking the listing' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'View published property' })).not.toBeInTheDocument());
  expect(screen.getByLabelText('Actions')).toHaveValue('restore');
});
