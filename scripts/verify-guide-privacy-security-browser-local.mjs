import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { chromium, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const evidence = {
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  worktreeChanges: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
  journeys: ['GUIDE-25', 'GUIDE-26'],
  environment: 'local-real-browser-api-mongodb',
  mockedRoutes: false,
  startedAt: new Date().toISOString(),
  status: 'RUNNING',
  transitions: [],
  authorization: [],
  http: []
};

function environment(source) {
  return Object.fromEntries(source.split(/\r?\n/u).flatMap(raw => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) return [];
    const index = line.indexOf('=');
    let value = line.slice(index + 1).trim();
    if (/^(['"]).*\1$/u.test(value)) value = value.slice(1, -1);
    return [[line.slice(0, index).trim(), value]];
  }));
}

function record(method, path, status) {
  evidence.http.push({ method, path, status });
}

async function login(request, email) {
  const response = await request.post(`${base}/api/v1/auth/login`, { data: { email, password: 'LocalPreview-Admin-Only-2026!' } });
  record('POST', '/api/v1/auth/login', response.status());
  assert.equal(response.status(), 200);
  const session = (await response.json()).data;
  assert.equal(session.user.roleType, 'admin');
  return session;
}

async function putSettings(request, token, input, expectedStatus) {
  const response = await request.put(`${base}/api/v1/admin/settings/privacy-security`, {
    headers: { authorization: `Bearer ${token}` },
    data: input
  });
  record('PUT', '/api/v1/admin/settings/privacy-security', response.status());
  assert.equal(response.status(), expectedStatus);
  return response;
}

const browser = await chromium.launch({ headless: true });
let mongo;
try {
  const env = environment(await readFile('.env.local', 'utf8'));
  mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
  let before = await mongo.collection('admin_settings').findOne({ namespace: 'privacy-security' });
  if (!before) {
    const admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin', status: 'verified' });
    assert.ok(admin?._id instanceof mongoose.Types.ObjectId);
    await mongo.collection('admin_settings').insertOne({
      namespace: 'privacy-security',
      schemaVersion: 1,
      values: {
        hide_customer_contact: true,
        hide_internal_notes: true,
        hide_private_documents: true,
        admin_session_timeout_minutes: 30,
        two_factor_authentication: false
      },
      version: 0,
      updatedBy: admin._id,
      updatedAt: new Date()
    });
    before = await mongo.collection('admin_settings').findOne({ namespace: 'privacy-security' });
    evidence.transitions.push('secure_local_baseline_fixture_inserted');
  }
  assert.ok(before);
  assert.equal(typeof before.version, 'number');
  const originalValues = structuredClone(before.values);
  const originalTimeout = Number(originalValues.admin_session_timeout_minutes ?? 30);
  const changedTimeout = originalTimeout >= 1_440 ? originalTimeout - 1 : originalTimeout + 1;

  const context = await browser.newContext({ viewport: { width: 402, height: 874 }, isMobile: true });
  await login(context.request, 'admin.demo@example.invalid');
  const page = await context.newPage();
  page.on('response', response => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/api/v1/')) record(response.request().method(), path, response.status());
  });
  await page.goto(`${base}/admin/settings/privacy-security?lang=en`, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-screen-id="ADM-57"]')).toBeVisible();
  await expect(page.locator('[data-admin-settings-state="success"]')).toBeVisible();
  assert.equal(await page.evaluate(() => innerWidth), 402);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  await page.locator('#admin-settings-admin_session_timeout_minutes').fill(String(changedTimeout));
  await page.locator('#admin-settings-privacy-security-reason').fill('Verify the live privacy policy consumer binding');
  const savedPending = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/v1/admin/settings/privacy-security');
  await page.getByTestId('admin-settings-privacy-security-form').locator('button[type="submit"]').click();
  const savedResponse = await savedPending;
  assert.equal(savedResponse.status(), 200);
  const saved = (await savedResponse.json()).data;
  assert.equal(saved.values.admin_session_timeout_minutes, changedTimeout);
  assert.equal(saved.version, before.version + 1);
  evidence.transitions.push('admin_browser_saved_privacy_security', 'browser_received_incremented_version');

  const storedChanged = await mongo.collection('admin_settings').findOne({ namespace: 'privacy-security' });
  assert.equal(storedChanged.version, saved.version);
  assert.equal(storedChanged.values.admin_session_timeout_minutes, changedTimeout);
  for (const key of ['hide_customer_contact', 'hide_internal_notes', 'hide_private_documents', 'two_factor_authentication']) {
    assert.equal(storedChanged.values[key], originalValues[key]);
  }
  evidence.transitions.push('same_mongo_record_contains_browser_change', 'privacy_booleans_preserved');

  const staleContext = await browser.newContext();
  const staleSession = await login(staleContext.request, 'admin.demo@example.invalid');
  await putSettings(staleContext.request, staleSession.accessToken, {
    schemaVersion: saved.schemaVersion,
    values: saved.values,
    expectedVersion: before.version,
    reason: 'A stale privacy update must be rejected'
  }, 409);
  await staleContext.close();
  evidence.authorization.push('stale_settings_version_rejected_409');

  const limitedContext = await browser.newContext();
  const limited = await login(limitedContext.request, 'admin.operations@example.invalid');
  await putSettings(limitedContext.request, limited.accessToken, {
    schemaVersion: saved.schemaVersion,
    values: saved.values,
    expectedVersion: saved.version,
    reason: 'A limited administrator must not change privacy settings'
  }, 403);
  await limitedContext.close();
  evidence.authorization.push('limited_admin_settings_mutation_denied_403');

  await page.locator('#admin-settings-admin_session_timeout_minutes').fill(String(originalTimeout));
  await page.locator('#admin-settings-privacy-security-reason').fill('Restore the approved privacy policy after verification');
  const restoredPending = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/v1/admin/settings/privacy-security');
  await page.getByTestId('admin-settings-privacy-security-form').locator('button[type="submit"]').click();
  const restoredResponse = await restoredPending;
  assert.equal(restoredResponse.status(), 200);
  const restored = (await restoredResponse.json()).data;
  assert.equal(restored.values.admin_session_timeout_minutes, originalTimeout);
  assert.equal(restored.version, before.version + 2);

  const finalRecord = await mongo.collection('admin_settings').findOne({ namespace: 'privacy-security' });
  assert.deepEqual(finalRecord.values, originalValues);
  const audits = await mongo.collection('audit_logs').find({ targetType: 'admin_settings', targetId: 'privacy-security', action: 'settings.update' }).sort({ occurredAt: -1 }).limit(2).toArray();
  assert.equal(audits.length, 2);
  assert.deepEqual(audits.map(item => item.reason), ['Restore the approved privacy policy after verification', 'Verify the live privacy policy consumer binding']);
  evidence.transitions.push('admin_browser_restored_approved_values', 'two_ordered_audit_records_persisted');
  evidence.mongo = {
    collection: 'admin_settings',
    namespace: 'privacy-security',
    versionBefore: before.version,
    versionAfter: finalRecord.version,
    restoredValues: true,
    auditActions: audits.map(item => item.action),
    auditReasons: audits.map(item => item.reason)
  };
  evidence.status = 'PASS_LOCAL';
  evidence.remaining = ['Run the same browser, API and MongoDB verification on Production after deployment.'];
  await context.close();
} catch (error) {
  evidence.status = 'FAIL_LOCAL';
  evidence.failure = error instanceof Error ? error.message.slice(0, 900) : String(error);
  process.exitCode = 1;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await mongo?.close().catch(() => undefined);
  await browser.close();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/privacy-security-local-latest.json', `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`PRIVACY_SECURITY_BROWSER_LOCAL_${evidence.status}`);
}
