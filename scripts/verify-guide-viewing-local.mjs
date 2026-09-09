import assert from 'node:assert/strict';
import mongoose, { Types } from 'mongoose';
import { expect } from '@playwright/test';

export async function verifySeekerViewingJourney(page, base, propertyId, browser) {
  assert.equal(new URL(base).hostname, '127.0.0.1');
  const evidence = { journey: 'GUIDE-07', status: 'RUNNING', environment: 'local-real-browser-API-MongoDB', checks: [], remaining: ['Provider browser confirmation/reschedule/completion', 'Production verification'] };
  await page.goto(`${base}/seeker/viewings?lang=en`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'No upcoming appointments' })).toBeVisible();
  const origin = await page.evaluate(() => performance.timeOrigin);
  await page.getByRole('tab', { name: 'Cancelled', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No cancelled appointments' })).toBeVisible();
  await page.getByRole('tab', { name: 'Upcoming', exact: true }).click();
  await page.getByRole('button', { name: 'Request a viewing', exact: true }).click();
  const form = page.getByRole('form', { name: 'Request a new viewing', exact: true });
  await form.getByLabel('Property ID', { exact: true }).fill(propertyId);
  const requestedAt = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16);
  await form.getByLabel('Viewing time', { exact: true }).fill(requestedAt);
  await form.getByLabel('Timezone', { exact: true }).fill('Africa/Cairo');
  const createdResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/seeker/viewings');
  await form.getByRole('button', { name: 'Submit request', exact: true }).click();
  const created = await createdResponse;
  assert.equal(created.status(), 201);
  const viewing = (await created.json()).data;
  const card = page.getByTestId(`seeker-viewing-${viewing.id}`);
  await expect(card).toHaveAttribute('data-viewing-status', 'requested');
  await card.getByRole('button', { name: 'Reschedule', exact: true }).click();
  await card.getByLabel('Viewing time', { exact: true }).fill(new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 16));
  const patchedResponse = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/api/v1/seeker/viewings/${viewing.id}`);
  await card.getByRole('button', { name: 'Save appointment', exact: true }).click();
  assert.equal((await patchedResponse).status(), 200);
  await expect(card).toHaveAttribute('data-viewing-status', 'rescheduled');
  await card.getByRole('button', { name: 'Cancel appointment', exact: true }).click();
  const cancelledResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/v1/seeker/viewings/${viewing.id}/cancel`);
  await card.getByRole('group', { name: 'Cancel this appointment?' }).getByRole('button', { name: 'Cancel appointment', exact: true }).click();
  assert.equal((await cancelledResponse).status(), 200);
  await expect(page.getByText('Viewing appointment cancelled.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No upcoming appointments' })).toBeVisible();
  await expect(card).toHaveCount(0);
  await page.getByRole('tab', { name: 'Cancelled', exact: true }).click();
  await expect(card).toHaveAttribute('data-viewing-status', 'cancelled');
  assert.equal(await page.evaluate(() => performance.timeOrigin), origin);
  evidence.checks.push('empty_tabs_recover_without_refresh', 'browser_create_201', 'browser_reschedule_200', 'browser_cancel_200', 'cancelled_tab_shows_final_state');
  const connection = await mongoose.createConnection('mongodb://127.0.0.1:27018/sadat_real_estate_local', { autoIndex: false, autoCreate: false }).asPromise();
  let ownerEmail;
  try {
    const property = await connection.collection('properties').findOne({ _id: new Types.ObjectId(propertyId) });
    const profile = await connection.collection('provider_profiles').findOne({ _id: new Types.ObjectId(String(property.providerId)) });
    const owner = await connection.collection('users').findOne({ _id: new Types.ObjectId(String(profile?.userId ?? property.providerId)) });
    ownerEmail = owner.normalizedEmail;
    assert.ok(ownerEmail.endsWith('@example.invalid'));
  } finally { await connection.close(); }
  const providerContext = await browser.newContext();
  try {
    const identity = { email: ownerEmail, roleType: 'provider', purpose: 'login' };
    const since = Date.now();
    const sent = await providerContext.request.post(`${base}/api/v1/auth/otp/send`, { data: identity });
    assert.equal(sent.status(), 202);
    const challengeId = (await sent.json()).data.challengeId;
    let code;
    await expect.poll(async () => {
      const inbox = await (await fetch('http://127.0.0.1:8025/api/messages')).json();
      const message = inbox.messages.find(item => item.to.includes(ownerEmail) && new Date(item.receivedAt).getTime() >= since);
      code = message?.raw.replace(/=\r?\n/g, '').match(/\b(\d{6})\b/u)?.[1];
      return Boolean(code);
    }, { timeout: 15000 }).toBe(true);
    const verified = await providerContext.request.post(`${base}/api/v1/auth/otp/verify`, { data: { ...identity, challengeId, code } });
    assert.equal(verified.status(), 200);
    assert.equal((await verified.json()).data.user.roleType, 'provider');
    await page.getByRole('tab', { name: 'Upcoming', exact: true }).click();
    await page.getByRole('button', { name: 'Request a viewing', exact: true }).click();
    const secondForm = page.getByRole('form', { name: 'Request a new viewing', exact: true });
    const marker = `Local provider journey ${Date.now()}`;
    await secondForm.getByLabel('Property ID', { exact: true }).fill(propertyId);
    await secondForm.getByLabel('Viewing time', { exact: true }).fill(new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16));
    await secondForm.getByLabel('Timezone', { exact: true }).fill('Africa/Cairo');
    await secondForm.getByLabel('Optional note', { exact: true }).fill(marker);
    const newResponse = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/seeker/viewings');
    await secondForm.getByRole('button', { name: 'Submit request', exact: true }).click();
    const newViewing = await newResponse;
    assert.equal(newViewing.status(), 201);
    const newId = (await newViewing.json()).data.id;
    const providerPage = await providerContext.newPage();
    await providerPage.goto(`${base}/provider/viewings?lang=en`, { waitUntil: 'networkidle' });
    const providerCard = providerPage.getByTestId('provider-viewing-row').filter({ hasText: marker });
    await expect(providerCard).toBeVisible();
    for (const [action, label, expectedStatus] of [['confirm', 'Confirm:', 'confirmed'], ['reschedule', 'Reschedule:', 'rescheduled'], ['confirm', 'Confirm:', 'confirmed'], ['complete', 'Mark complete:', 'completed']]) {
      await providerCard.getByRole('button', { name: new RegExp(`^${label}`) }).click();
      const dialog = providerPage.getByRole('dialog');
      if (action === 'reschedule') {
        await dialog.getByLabel('Viewing time', { exact: true }).fill(new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 16));
      }
      const transitionResponse = providerPage.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/v1/provider/viewings/${newId}/transitions`);
      await dialog.getByRole('button', { name: 'Save change', exact: true }).click();
      assert.equal((await transitionResponse).status(), 200);
      await expect(providerCard).toHaveAttribute('data-viewing-status', expectedStatus);
      evidence.checks.push(`provider_browser_${action}_200`);
    }
    await page.goto(`${base}/seeker/viewings?lang=en`, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Past', exact: true }).click();
    await expect(page.getByTestId(`seeker-viewing-${newId}`)).toHaveAttribute('data-viewing-status', 'completed');
    evidence.checks.push('seeker_reads_provider_completed_state');
    evidence.remaining = ['Provider cancellation browser branch', 'Production verification'];
  } finally { await providerContext.close(); }
  evidence.status = 'PASS_LOCAL_VIEWING_PARTIAL_GUIDE';
  return evidence;
}
