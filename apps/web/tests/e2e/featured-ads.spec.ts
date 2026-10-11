import { expect, test } from '@playwright/test';
import { routeAdminHomeApis } from './admin-home.fixtures.ts';

test('featured toolbar explains actions, retries the failed mutation and reports import counts without duplicates', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), lang = ar ? 'ar' : 'en';
  await routeAdminHomeApis(page);
  await page.route('**/api/v1/admin/banners/featured-options*', route => route.fulfill({ json: { data: { canManage: true, advertisers: [], destinations: [] }, meta: { requestId: 'toolbar-options' } } }));
  let version = 4, writes = 0, reads = 0, imports = 0;
  await page.route('**/api/v1/admin/banners/config', route => {
    if (route.request().method() === 'PUT') {
      writes++;
      expect(route.request().postDataJSON()).toMatchObject({ enabled: true, featuredActive: true, expectedVersion: version });
      if (writes === 1) return route.fulfill({ status: 409, json: { error: { code: 'VERSION_CONFLICT', messageKey: 'errors.conflict', details: [], requestId: 'conflict' } } });
      version++;
    } else reads++;
    return route.fulfill({ json: { data: { enabled: writes > 1, version, placements: [{ key: 'homepage.featured', label: { ar: 'كروت', en: 'Cards' }, active: writes > 1 }] }, meta: { requestId: 'toolbar-config' } } });
  });
  await page.route('**/api/v1/admin/banners/featured-import', route => {
    expect(route.request().method()).toBe('POST');
    imports++;
    return route.fulfill({ json: { data: { imported: true, count: imports === 1 ? 2 : 0 }, meta: { requestId: 'toolbar-import' } } });
  });
  await page.goto(`/admin/ads/featured?lang=${lang}`);
  const actions = page.locator('.admin-featured__actions');
  await expect(actions).toContainText(ar ? 'المسودات تحتاج نشرًا' : 'drafts still need publishing');
  await expect(actions).toContainText(ar ? 'يوقف عرضه' : 'hiding them');
  await actions.getByRole('button', { name: ar ? 'تشغيل عرض الكروت' : 'Enable card display', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(ar ? 'السجل تغيّر' : 'Record changed');
  await page.getByRole('button', { name: ar ? 'إعادة المحاولة' : 'Retry', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(ar ? 'تم تشغيل العرض' : 'Display enabled');
  expect(writes).toBe(2); expect(reads).toBe(2);
  const importButton = actions.getByRole('button', { name: ar ? 'استيراد الكروت القديمة' : 'Import legacy cards', exact: true });
  await importButton.click();
  await expect(page.getByRole('status')).toContainText(ar ? 'تم استيراد 2 كارت كمسودة' : '2 cards imported as drafts');
  await importButton.click();
  await expect(page.getByRole('status')).toContainText(ar ? 'لا توجد كروت قديمة جديدة' : 'No new legacy cards');
  expect(imports).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await actions.screenshot({ path: info.outputPath('featured-actions.png') });
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: info.outputPath('featured-actions-page.png'), fullPage: true });
});

test('featured actions explain denied management permission without showing a success message', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), lang = ar ? 'ar' : 'en';
  await routeAdminHomeApis(page);
  await page.route('**/api/v1/admin/banners/featured-options*', route => route.fulfill({ json: { data: { canManage: true, advertisers: [], destinations: [] }, meta: { requestId: 'stale-permission' } } }));
  let writes = 0;
  await page.route('**/api/v1/admin/banners/config', route => {
    if (route.request().method() === 'PUT') writes++;
    return route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'denied-config' } } });
  });
  await page.route('**/api/v1/admin/banners/featured-import', route => route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN', messageKey: 'errors.forbidden', details: [], requestId: 'denied-import' } } }));
  await page.goto(`/admin/ads/featured?lang=${lang}`);
  await page.getByRole('button', { name: ar ? 'تشغيل عرض الكروت' : 'Enable card display', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(ar ? 'تحتاج صلاحية إدارة الإعلانات' : 'Ad management permission required');
  expect(writes).toBe(0);
  await page.getByRole('button', { name: ar ? 'استيراد الكروت القديمة' : 'Import legacy cards', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(ar ? 'تحتاج صلاحية إدارة الإعلانات' : 'Ad management permission required');
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('creates the complete featured card, previews both sizes and saves fields and image before publication', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), lang = ar ? 'ar' : 'en';
  const providerId = '1234567890abcdef12345678', propertyId = 'abcdef1234567890abcdef12';
  await routeAdminHomeApis(page);
  await page.route('**/api/v1/admin/banners/featured-options*', route => route.fulfill({ json: { data: { canManage: true, advertisers: [{ id: providerId, name: { ar: 'شركة الاختبار', en: 'Test developer' }, verified: true }], destinations: [{ kind: 'property', id: propertyId, name: { ar: 'عقار منشور', en: 'Published property' }, href: '/properties/published-property' }] }, meta: { requestId: 'featured-options' } } }));
  await page.goto(`/admin/ads/featured?lang=${lang}`);
  await page.getByRole('button', { name: ar ? 'إضافة إعلان مميز' : 'Add featured ad', exact: true }).click();
  const editor = page.getByRole('region', { name: ar ? 'تعديل الإعلان المميز' : 'Featured ad editor' });
  await expect(editor.locator('select').first()).toHaveValue(providerId);
  const account = editor.locator('.admin-featured__account');
  const accountSelect = await account.locator('select').boundingBox();
  const accountHint = await account.locator('p').boundingBox();
  expect(accountHint!.y).toBeGreaterThanOrEqual(accountSelect!.y + accountSelect!.height + 10);
  expect(await account.locator('select').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  await editor.locator('select').nth(0).selectOption(providerId);
  await editor.getByRole('option', { name: ar ? 'عقار منشور' : 'Published property' }).waitFor({ state: 'attached' });
  await editor.locator('select').nth(1).selectOption(`property:${propertyId}`);
  const fields = editor.locator('.admin-featured__texts');
  for (const label of await fields.locator('label').all()) {
    const caption = await label.locator('span').boundingBox();
    const control = await label.locator('input,textarea').boundingBox();
    const bounds = await label.boundingBox();
    expect(caption).not.toBeNull(); expect(control).not.toBeNull(); expect(bounds).not.toBeNull();
    expect(caption!.y + caption!.height).toBeLessThanOrEqual(control!.y - 6);
    expect(control!.x).toBeGreaterThanOrEqual(bounds!.x - 1);
    expect(control!.x + control!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
  }
  const texts = [['عنوان الإعلان', 'Featured property'], ['وصف الإعلان', 'Modern homes with gardens'], ['مساحات تبدأ من 220 م²', 'From 220 sqm'], ['مقدم 10% وتقسيط', '10% deposit and installments'], ['اكتشف العقار', 'Explore property']];
  for (let i = 0; i < texts.length; i++) {
    const inputs = fields.nth(i).locator('input,textarea');
    await inputs.nth(0).fill(texts[i]![0]!); await inputs.nth(1).fill(texts[i]![1]!);
  }
  await editor.locator('input[type="datetime-local"]').nth(0).fill('2030-01-01T10:00');
  await editor.locator('input[type="datetime-local"]').nth(1).fill('2030-02-01T10:00');
  await editor.locator('input[type="file"]').setInputFiles('apps/web/public/assets/canonical/public/listing-property-rental.png');
  await expect(editor.locator('.public-homepage__banner-card')).toContainText(ar ? 'شركة الاختبار' : 'Test developer');
  await page.screenshot({ path: info.outputPath('featured-desktop-preview.png'), fullPage: true });
  await editor.locator('.public-homepage__banner-card').screenshot({ path: info.outputPath('featured-card-desktop.png') });
  await editor.getByRole('button', { name: ar ? 'موبايل' : 'Mobile', exact: true }).click();
  await expect(editor.locator('.admin-featured__preview')).toHaveAttribute('data-size', 'mobile');
  await page.screenshot({ path: info.outputPath('featured-mobile-preview.png'), fullPage: true });
  await editor.locator('.public-homepage__banner-card').screenshot({ path: info.outputPath('featured-card-mobile.png') });
  const writes: Array<{ method: string; body: Record<string, unknown> }> = [];
  page.on('request', request => { if (request.url().includes('/api/v1/admin/banners') && ['POST', 'PATCH'].includes(request.method())) { writes.push({ method: request.method(), body: request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() ?? {} : {} }); } });
  await editor.getByRole('button', { name: ar ? 'حفظ ونشر' : 'Save and publish', exact: true }).click();
  await expect(editor.getByRole('status')).toContainText(ar ? 'نشر' : /published|scheduled/i);
  expect(writes[0]?.body).toMatchObject({ placementKey: 'homepage.featured', title: { ar: texts[0]![0], en: texts[0]![1] }, featured: { advertiserProviderId: providerId, destination: { kind: 'property', id: propertyId } } });
  expect(writes.at(-1)?.body.status).toBe('scheduled');
  expect(writes.findIndex(item => Array.isArray(item.body.mediaIds))).toBeGreaterThan(0);
  expect(writes.at(-1)?.body.expectedVersion).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('shows actionable empty advertiser guidance without an empty table or unusable save buttons', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), lang = ar ? 'ar' : 'en';
  await routeAdminHomeApis(page);
  await page.route('**/api/v1/admin/banners?*', route => route.fulfill({ json: { data: { items: [], page: 1, limit: 100, total: 0 }, meta: { requestId: 'empty-featured' } } }));
  await page.route('**/api/v1/admin/banners/featured-options*', route => route.fulfill({ json: { data: { canManage: true, advertisers: [], destinations: [] }, meta: { requestId: 'empty-advertisers' } } }));
  await page.goto(`/admin/ads/featured?lang=${lang}`);
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.locator('.admin-featured__empty')).toContainText(ar ? 'لا توجد إعلانات بعد' : 'No ads yet');
  const heading = await page.locator('.admin-featured .admin-home__heading').boundingBox();
  const panel = await page.locator('.admin-featured .admin-home__panel').boundingBox();
  const add = await page.getByRole('button', { name: ar ? 'إضافة إعلان مميز' : 'Add featured ad', exact: true }).boundingBox();
  expect(heading).not.toBeNull(); expect(panel).not.toBeNull(); expect(add).not.toBeNull();
  expect(Math.abs(heading!.x - panel!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(heading!.width - panel!.width)).toBeLessThanOrEqual(1);
  expect(add!.x).toBeGreaterThan(heading!.x);
  expect(add!.x + add!.width).toBeLessThan(heading!.x + heading!.width);
  expect(add!.y + add!.height).toBeLessThan(heading!.y + heading!.height);
  const tabs = await page.locator('.admin-featured .admin-home__tabs').boundingBox();
  const tools = await page.locator('.admin-featured__actions').boundingBox();
  expect(tools!.y).toBeGreaterThanOrEqual(tabs!.y + tabs!.height + 16);
  expect(panel!.y).toBeGreaterThanOrEqual(tools!.y + tools!.height + 16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('featured-empty-page.png'), fullPage: true });
  await page.getByRole('button', { name: ar ? 'إضافة إعلان مميز' : 'Add featured ad', exact: true }).click();
  const editor = page.getByRole('region', { name: ar ? 'تعديل الإعلان المميز' : 'Featured ad editor' });
  await expect(editor.getByRole('status')).toContainText(ar ? 'لا توجد حسابات' : 'No eligible advertisers');
  await expect(editor.getByRole('link', { name: ar ? 'إدارة مقدمي العقارات' : 'Manage providers' })).toHaveAttribute('href', `/admin/providers?lang=${lang}`);
  await expect(editor.locator('select').first()).toBeDisabled();
  await expect(editor.locator('select').first()).toContainText(ar ? 'لا توجد حسابات' : 'No eligible accounts');
  await expect(editor.getByRole('button', { name: ar ? 'حفظ ونشر' : 'Save and publish', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('featured-empty-advertisers.png'), fullPage: true });
});

test('submitting without an advertiser shows localized validation and makes no save request', async ({ page }, info) => {
  const ar = info.project.name.endsWith('-ar'), lang = ar ? 'ar' : 'en';
  await routeAdminHomeApis(page);
  await page.route('**/api/v1/admin/banners/featured-options*', route => route.fulfill({ json: { data: { canManage: true, advertisers: ['1', '2'].map(value => ({ id: value.repeat(24), name: { ar: `شركة ${value}`, en: `Company ${value}` }, verified: true })), destinations: [] }, meta: { requestId: 'unselected-account' } } }));
  await page.goto(`/admin/ads/featured?lang=${lang}`);
  await page.getByRole('button', { name: ar ? 'إضافة إعلان مميز' : 'Add featured ad', exact: true }).click();
  const editor = page.getByRole('region', { name: ar ? 'تعديل الإعلان المميز' : 'Featured ad editor' });
  const title = editor.locator('.admin-featured__texts input').first();
  await title.fill('عنوان محفوظ');
  const writes: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/v1/admin/banners') && ['POST', 'PATCH'].includes(request.method())) writes.push(request.url()); });
  await editor.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit());
  await expect(editor.getByRole('alert')).toContainText(ar ? 'راجع الحساب' : 'Check advertiser');
  await expect(title).toHaveValue('عنوان محفوظ');
  expect(writes).toEqual([]);
  await expect(editor.locator('form')).toHaveAttribute('novalidate', '');
});
