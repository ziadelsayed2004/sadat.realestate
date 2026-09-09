import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

export async function verifyContactJourney(page, browser, base, seekerAuthorization) {
  assert.equal(new URL(base).hostname, '127.0.0.1');
  await page.getByLabel('Full name', { exact: true }).fill('Local Guide Contact');
  await page.getByLabel('Phone number', { exact: true }).fill('01000000000');
  await page.locator('select[name="contactTime"]').selectOption('morning');
  await page.getByLabel('Your message', { exact: true }).fill('Synthetic local contact journey');
  const createdResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/seeker/contact-requests');
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  const response = await createdResponse;
  assert.equal(response.status(), 201);
  let current = (await response.json()).data;
  assert.equal(current.status, 'new');
  const evidence = { journeys: ['GUIDE-06', 'GUIDE-21'], status: 'PASS_LOCAL_CONTACT_PARTIAL_GUIDES', transitions: ['browser_contact_created'], checks: [], remaining: ['Other request types', 'Production verification'] };
  const adminContext = await browser.newContext();
  try {
    const login = await adminContext.request.post(`${base}/api/v1/auth/login`, { data: { email: 'admin.operations@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } });
    assert.equal(login.status(), 200);
    const session = (await login.json()).data;
    assert.equal(session.user.roleType, 'admin');
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`${base}/admin/requests?lang=en&requestId=${current.id}`, { waitUntil: 'networkidle' });
    await expect(adminPage.getByTestId('admin-request-detail')).toBeVisible();
    evidence.checks.push('admin_browser_loads_real_request_details');
    const path = `/api/v1/admin/requests/${current.id}/transitions`;
    const denied = await page.request.post(`${base}${path}`, { headers: { authorization: seekerAuthorization }, data: { transition: 'start_review', expectedVersion: 0 } });
    assert.equal(denied.status(), 403);
    evidence.checks.push('seeker_denied_admin_transition_403');
    for (const [transition, status] of [['start_review', 'under_review'], ['contact', 'contacted'], ['resolve', 'resolved'], ['close', 'closed']]) {
      const previousVersion = current.version;
      await adminPage.getByLabel('Status transition', { exact: true }).selectOption(transition);
      await adminPage.getByLabel('Transition reason', { exact: true }).fill('Synthetic local journey verification');
      const pendingChange = adminPage.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === 'POST');
      await adminPage.getByRole('button', { name: 'Save transition', exact: true }).click();
      const changed = await pendingChange;
      assert.equal(changed.status(), 200);
      current = (await changed.json()).data;
      assert.equal(current.status, status);
      assert.ok(current.version > previousVersion);
      evidence.transitions.push(`admin_browser_${status}`);
      if (transition === 'start_review') {
        const stale = await adminContext.request.post(`${base}${path}`, { headers: { authorization: changed.request().headers().authorization }, data: { transition: 'contact', reason: 'Verify stale version rejection', expectedVersion: previousVersion } });
        assert.equal(stale.status(), 409);
        evidence.checks.push('stale_version_rejected_409');
      }
    }
    const seekerResult = await page.request.get(`${base}/api/v1/seeker/requests/${current.id}`, { headers: { authorization: seekerAuthorization } });
    assert.equal(seekerResult.status(), 200);
    assert.equal((await seekerResult.json()).data.status, 'closed');
    evidence.checks.push('seeker_reads_final_closed_state');
    await page.goto(`${base}/seeker/requests/${current.id}?lang=en`, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText('Closed');
    evidence.checks.push('seeker_browser_shows_closed');
    return evidence;
  } finally {
    await adminContext.close();
  }
}
