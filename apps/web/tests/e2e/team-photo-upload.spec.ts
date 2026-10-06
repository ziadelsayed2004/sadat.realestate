import { expect, test } from '@playwright/test';
import { cmsAdminTeamMemberSchema } from '@sadat-real-estate/contracts';
import { getAdminCmsCopy } from '../../src/features/admin_content/copy.ts';
import { adminCmsContentFor, adminCmsEnvelope } from './admin-cms-content.fixtures.ts';

const assetId = 'dddddddddddddddddddddddd';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV0sAAAAASUVORK5CYII=', 'base64');
test('uploads, saves, previews and removes a team portrait without entering an asset ID', async ({ page }, testInfo) => {
  const locale = testInfo.project.name.endsWith('-en') ? 'en' : 'ar';
  const copy = getAdminCmsCopy(locale);
  const fixture = adminCmsContentFor('team');
  if (fixture.namespace !== 'team') throw new Error('Team fixture required');
  let member = cmsAdminTeamMemberSchema.parse(fixture.items[0]);
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ accessToken: 'admin.photo.qa', tokenType: 'Bearer', expiresInSeconds: 900, user: { id: 'cccccccccccccccccccccccc', roleType: 'admin', status: 'verified' } }, 'team-photo-auth')) }));
  await page.route('**/api/v1/admin/content/team', async route => {
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON() as Record<string, unknown>; bodies.push(input);
      member = { ...member, version: member.version + 1 };
      if (input.photoAssetId === null) { delete member.photoAssetId; delete member.imageUrl; }
      else { member.photoAssetId = String(input.photoAssetId); member.imageUrl = `/api/v1/public/team-photos/${assetId}`; }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ namespace: 'team', items: [member] }, 'team-photo-save')) });
  });
  await page.route('**/api/v1/admin/content/team/photos', async route => {
    expect(route.request().headers()['content-type']).toBe('image/png');
    expect(route.request().headers().authorization).toBe('Bearer admin.photo.qa');
    expect(route.request().postDataBuffer()).toEqual(png);
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ id: assetId, imageUrl: `/api/v1/public/team-photos/${assetId}` }, 'team-photo-upload')) });
  });
  await page.route(`**/api/v1/admin/content/team/photos/${assetId}`, async route => {
    expect(route.request().headers().authorization).toBe('Bearer admin.photo.qa');
    await route.fulfill({ status: 200, contentType: 'image/png', body: png });
  });
  await page.route('**/api/v1/public/team', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminCmsEnvelope({ items: [{ key: member.key, title: member.title, role: member.title, name: member.name, order: member.order, ...(member.imageUrl ? { imageUrl: member.imageUrl } : {}) }] }, 'public-team')) }));
  await page.route(`**/api/v1/public/team-photos/${assetId}`, route => route.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await page.goto(`/admin/content/team?lang=${locale}`);
  await page.getByRole('button', { name: copy.edit, exact: true }).click();
  const editor = page.getByTestId('admin-cms-team-editor');
  await expect(editor.getByLabel('Photo asset ID')).toHaveCount(0);
  await editor.locator('input[type="file"]').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: png });
  await expect(editor.getByRole('status')).toHaveText(copy.photo.uploaded);
  await expect(editor.getByAltText(copy.photo.preview)).toBeVisible();
  await editor.getByLabel(copy.reason, { exact: true }).fill('Update approved team photo');
  await editor.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(editor).toHaveCount(0); expect(bodies[0]?.photoAssetId).toBe(assetId);
  await page.goto(`/team?lang=${locale}`);
  await expect(page.locator(`.public-team__photo[src="/api/v1/public/team-photos/${assetId}"]`)).toBeVisible();
  await page.goto(`/admin/content/team?lang=${locale}`);
  await page.getByRole('button', { name: copy.edit, exact: true }).click();
  await expect(editor.getByAltText(copy.photo.preview)).toHaveAttribute('src', /^blob:/);
  await editor.getByRole('button', { name: copy.photo.remove }).click();
  await editor.getByLabel(copy.reason, { exact: true }).fill('Remove approved team photo');
  await editor.getByRole('button', { name: copy.save, exact: true }).click();
  await expect(editor).toHaveCount(0); expect(bodies[1]?.photoAssetId).toBeNull();
  await page.goto(`/team?lang=${locale}`);
  await expect(page.locator('.public-team__photo')).toHaveCount(0);
});
