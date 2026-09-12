export const adminRequestId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const adminIssueId = 'eeeeeeeeeeeeeeeeeeeeeeee';
export const adminViewingId = 'dddddddddddddddddddddddd';

export function adminRequestFixture() {
  return {
    id: adminRequestId,
    type: 'contact',
    source: 'seeker',
    seekerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    propertyId: 'cccccccccccccccccccccccc',
    status: 'new',
    payload: { message: 'Please contact me', firstName: 'Ahmed', lastName: 'Hassan', phone: '0100 123 4567', propertyName: 'Central district office', assigneeName: 'Mona Ali', propertyId: 'cccccccccccccccccccccccc', locale: 'en' },
    dueAt: '2026-08-20T10:00:00.000Z',
    version: 2,
    availableActions: ['start_review', 'contact'],
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

export function adminRequestFixtures() {
  const base = adminRequestFixture();
  return [
    base,
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa1', status: 'under_review', source: 'public', payload: { ...base.payload, firstName: 'Sara', lastName: 'Mahmoud', phone: '0101 234 5678', propertyName: 'Palm district villa', assigneeName: 'Omar Adel' }, version: 3, createdAt: '2026-08-17T09:30:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa2', status: 'contacted', source: 'seeker', payload: { ...base.payload, firstName: 'Youssef', lastName: 'Ibrahim', phone: '0102 345 6789', propertyName: 'Industrial zone office', assigneeName: 'Mona Ali' }, version: 4, createdAt: '2026-08-16T12:15:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa3', status: 'scheduled', source: 'provider', payload: { ...base.payload, firstName: 'Nour', lastName: 'Khaled', phone: '0103 456 7890', propertyName: 'First district apartment', assigneeName: 'Omar Adel' }, version: 3, createdAt: '2026-08-15T14:45:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa4', status: 'resolved', source: 'admin', payload: { ...base.payload, firstName: 'Mariam', lastName: 'Samir', phone: '0104 567 8901', propertyName: 'Fifth district duplex', assigneeName: 'Mona Ali' }, version: 5, createdAt: '2026-08-14T08:20:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa5', status: 'in_progress', source: 'seeker', payload: { ...base.payload, firstName: 'Karim', lastName: 'Tarek', phone: '0105 678 9012', propertyName: 'University district land', assigneeName: 'Omar Adel' }, version: 4, createdAt: '2026-08-13T16:10:00.000Z' }
  ];
}

function adminRequestSourceFixtures() {
  const base = adminRequestFixture();
  return [
    { ...base, payload: { ...base.payload, customerNameAr: 'محمود إبراهيم', customerNameEn: 'Mahmoud Ibrahim', phone: '01012345678', propertyNameAr: 'شقة فاخرة في الحي الأول', propertyNameEn: 'First district luxury apartment', sourceLabelAr: 'الموقع', sourceLabelEn: 'Website', assigneeNameAr: 'سارة أحمد', assigneeNameEn: 'Sara Ahmed' }, createdAt: '2024-01-15T10:00:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa1', status: 'under_review', source: 'public', payload: { ...base.payload, customerNameAr: 'نهال عبد الرحمن', customerNameEn: 'Nehal Abdelrahman', phone: '01198765432', propertyNameAr: 'فيلا مستقلة بالمنطقة الراقية', propertyNameEn: 'Detached villa in the premium district', sourceLabelAr: 'واتساب', sourceLabelEn: 'WhatsApp', assigneeNameAr: 'كريم عبد الله', assigneeNameEn: 'Karim Abdallah' }, version: 3, createdAt: '2024-01-14T09:30:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa2', status: 'contacted', source: 'seeker', payload: { ...base.payload, customerNameAr: 'طارق حسين', customerNameEn: 'Tarek Hussein', phone: '01234567890', propertyNameAr: 'دوبلكس فاخر في الحي الخامس', propertyNameEn: 'Luxury duplex in the fifth district', sourceLabelAr: 'الموقع', sourceLabelEn: 'Website', assigneeNameAr: 'سارة أحمد', assigneeNameEn: 'Sara Ahmed' }, version: 4, createdAt: '2024-01-13T12:15:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa3', status: 'closed', source: 'provider', payload: { ...base.payload, customerNameAr: 'رانيا مصطفى', customerNameEn: 'Rania Mostafa', phone: '01567890123', propertyNameAr: 'شقة للإيجار في الحي الثالث', propertyNameEn: 'Apartment for rent in the third district', sourceLabelAr: 'إعلان', sourceLabelEn: 'Advertisement', assigneeNameAr: 'كريم عبد الله', assigneeNameEn: 'Karim Abdallah' }, version: 3, createdAt: '2024-01-10T14:45:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa4', status: 'new', source: 'admin', payload: { ...base.payload, customerNameAr: 'أسامة فريد', customerNameEn: 'Osama Farid', phone: '01011122334', propertyNameAr: 'أرض سكنية في الحي السابع', propertyNameEn: 'Residential land in the seventh district', sourceLabelAr: 'الموقع', sourceLabelEn: 'Website', assigneeName: undefined, assigneeNameAr: undefined, assigneeNameEn: undefined }, version: 5, createdAt: '2024-01-15T08:20:00.000Z' },
    { ...base, id: 'aaaaaaaaaaaaaaaaaaaaaaa5', status: 'under_review', source: 'seeker', payload: { ...base.payload, customerNameAr: 'مايا جمال', customerNameEn: 'Maya Gamal', phone: '01099887766', propertyNameAr: 'مكتب تجاري في المنطقة الصناعية', propertyNameEn: 'Commercial office in the industrial zone', sourceLabelAr: 'إحالة', sourceLabelEn: 'Referral', assigneeNameAr: 'سارة أحمد', assigneeNameEn: 'Sara Ahmed' }, version: 4, createdAt: '2024-01-12T16:10:00.000Z' }
  ];
}

export function adminIssueFixture() {
  return {
    id: adminIssueId,
    requestId: adminRequestId,
    category: 'incorrect_data',
    details: 'The request contains incorrect contact data.',
    status: 'open',
    version: 1,
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

export function adminViewingFixture() {
  return {
    id: adminViewingId,
    propertyId: 'cccccccccccccccccccccccc',
    seekerId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    status: 'confirmed',
    requestedAt: '2026-08-21T10:00:00.000Z',
    timezone: 'Africa/Cairo',
    version: 1,
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z'
  };
}

export function localeForAdminRequests(projectName: string): 'ar' | 'en' {
  return projectName.endsWith('-en') ? 'en' : 'ar';
}

export async function routeAdminRequestApis(page: import('@playwright/test').Page, allow = true): Promise<void> {
  await page.route('**/api/v1/auth/refresh', async route => {
    await route.fulfill({
      status: allow ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(allow ? { data: { accessToken: 'admin.requests.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'ffffffffffffffffffffffff', roleType: 'admin', status: 'verified' } }, meta: { requestId: 'admin-requests-refresh' } } : { error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-requests-refresh-denied' } })
    });
  });
  await page.route('**/api/v1/admin/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.headers().authorization !== 'Bearer admin.requests.qa') {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired', details: [], requestId: 'admin-requests-missing-auth' } }) });
      return;
    }
    if (url.pathname === '/api/v1/admin/viewings') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [adminViewingFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-viewings-list' } }) });
      return;
    }
    if (url.pathname === '/api/v1/admin/request-issues') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [adminIssueFixture()], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-issues-list' } }) });
      return;
    }
    if (url.pathname.includes('/request-issues/') && request.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...adminIssueFixture(), status: 'resolved', resolutionReason: 'Reviewed and corrected' }, meta: { requestId: 'admin-issue-resolve' } }) });
      return;
    }
    if (url.pathname === '/api/v1/admin/requests/overdue') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ request: adminRequestFixture(), overdueBySeconds: 120 }], page: 1, limit: 20, total: 1 }, meta: { requestId: 'admin-overdue-list' } }) });
      return;
    }
    if (request.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...adminRequestFixture(), status: 'contacted', version: 3, availableActions: [] }, meta: { requestId: 'admin-request-mutation' } }) });
      return;
    }
    const sourceItems = url.searchParams.get('type') === null ? adminRequestSourceFixtures() : adminRequestFixtures();
    const items = url.searchParams.get('status') === 'closed' ? [] : sourceItems;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items, page: 1, limit: 20, total: items.length }, meta: { requestId: 'admin-request-list' } }) });
  });
}
