import { expect, test } from '@playwright/test';
import { routeAdminMasterData } from './admin-master-data.fixtures';

test('adds features and services with automatic groups and order, then preserves existing groups on edit', async ({ page }, info) => {
  const ar = !info.project.name.endsWith('-en');
  await routeAdminMasterData(page);
  const existing = { id: 'a'.repeat(24), kind: 'feature', groupKey: 'finishing', name: { ar: 'تشطيب فاخر', en: 'Luxury finishing' }, slug: 'luxury-finishing', order: 10, active: true, version: 1, createdAt: '2026-10-10T08:00:00.000Z', updatedAt: '2026-10-10T08:00:00.000Z', availableActions: ['update', 'delete'] };
  const items = [existing];
  const writes: Record<string, unknown>[] = [];
  const envelope = (data: unknown) => ({ data, meta: { requestId: 'features-qa', page: 1, limit: 100, total: items.length } });
  await page.route('**/api/v1/admin/features**', async route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.master-data.e2e');
    if (route.request().method() === 'GET') return route.fulfill({ json: envelope({ items }) });
    const body = route.request().postDataJSON();
    writes.push(body);
    const patch = route.request().method() === 'PATCH';
    const item = { ...existing, id: patch ? existing.id : String(writes.length).repeat(24), kind: patch ? existing.kind : body.kind, groupKey: body.groupKey, name: body.name, order: body.order, active: body.active, slug: patch ? existing.slug : `option-${writes.length}`, version: patch ? body.version + 1 : 0 };
    if (patch) items[0] = item; else items.push(item);
    await route.fulfill({ status: patch ? 200 : 201, json: envelope(item) });
  });
  await page.goto(`/admin/features?lang=${ar ? 'ar' : 'en'}`);
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('columnheader')).toHaveCount(6);
  for (const kind of ['feature', 'service']) {
    await page.getByRole('button', { name: ar ? 'إضافة عنصر' : 'Add item', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#admin-master-data-kind').selectOption(kind === 'feature' ? 'service' : 'feature');
    await dialog.locator('#admin-master-data-kind').selectOption(kind);
    await expect(dialog.locator('#admin-master-data-group')).toHaveCount(0);
    await expect(dialog.locator('#admin-master-data-order')).not.toBeVisible();
    await dialog.locator(ar ? '#admin-master-data-name-ar' : '#admin-master-data-name-en').fill(kind === 'feature' ? 'Parking' : 'Nearby school');
    await dialog.locator('#admin-master-data-reason').fill('Add a property option');
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    if (kind === 'feature') await dialog.screenshot({ path: info.outputPath('automatic-feature-editor.png') });
    await dialog.getByRole('button', { name: ar ? 'حفظ' : 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const body = writes.at(-1)!;
    expect(body).toMatchObject({ kind, groupKey: kind === 'service' ? 'nearby' : 'property_feature', order: kind === 'feature' ? 11 : 12 });
    expect(body).not.toHaveProperty('slug');
  }
  await page.getByTestId(`admin-master-data-item-${existing.id}`).getByRole('button', { name: /Edit:|تعديل:/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator(ar ? '#admin-master-data-name-ar' : '#admin-master-data-name-en').fill(ar ? 'تشطيب كامل' : 'Full finishing');
  await dialog.locator('#admin-master-data-reason').fill('Clarify the feature name');
  await dialog.getByRole('button', { name: ar ? 'حفظ' : 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes.at(-1)).toMatchObject({ groupKey: 'finishing', order: 10, version: 1 });
  await page.reload();
  await expect(page.getByTestId(`admin-master-data-item-${existing.id}`)).toContainText(ar ? 'تشطيب كامل' : 'Full finishing');
});
