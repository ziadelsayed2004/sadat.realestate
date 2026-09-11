import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium, devices, expect } from '@playwright/test';

function parseCsv(source) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let index = source.charCodeAt(0) === 0xFEFF ? 1 : 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && char === ',') { row.push(value); value = ''; }
    else if (!quoted && char === '\r' && source[index + 1] === '\n') {
      row.push(value); rows.push(row); row = []; value = ''; index += 1;
    } else value += char;
  }
  assert.equal(quoted, false);
  assert.deepEqual(row, []);
  return rows;
}

const base = 'http://127.0.0.1:4174';
const report = { status: 'RUNNING', environment: 'local-built-web-real-API', mockedRoutes: false,
  journeys: ['GUIDE-21'], commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), worktreeChanges: true, runs: [] };
const browser = await chromium.launch();
try {
  for (const [device, options] of [['Desktop', { viewport: { width: 1577, height: 944 } }], ['Tablet', { viewport: { width: 768, height: 1024 } }], ['Pixel5', devices['Pixel 5']]]) {
    for (const locale of ['ar', 'en']) {
      const context = await browser.newContext(options);
      try {
        const login = await context.request.post(`${base}/api/v1/auth/login`, { data: { email: 'admin.operations@example.invalid', password: 'LocalPreview-Admin-Only-2026!' } });
        assert.equal(login.status(), 200);
        const accessToken = (await login.json()).data.accessToken;
        const catalog = JSON.parse(await readFile(`apps/web/src/features/localization/messages/${locale}.json`, 'utf8'));
        const labels = catalog['admin_requests/metrics-copy#getRequestMetricsCopy'];
        const copy = catalog['admin_requests/copy#getAdminRequestsCopy'];
        const expected = await context.request.get(`${base}/api/v1/admin/requests?page=1&limit=100`, { headers: { authorization: `Bearer ${accessToken}` } });
        assert.equal(expected.status(), 200);
        const data = (await expected.json()).data;
        const page = await context.newPage();
        await page.goto(`${base}/admin/requests?lang=${locale}`, { waitUntil: 'networkidle' });
        const button = page.getByRole('button', { name: labels.exportCsv, exact: true });
        await expect(button).toBeVisible();
        const downloadRows = async () => {
          const pending = page.waitForEvent('download');
          await button.click();
          const download = await pending;
          const rows = parseCsv(await readFile(await download.path(), 'utf8'));
          await download.delete();
          assert.ok(rows.every(row => row.length === 7));
          assert.deepEqual(rows[0], [copy.customer, copy.phoneNumber, copy.property, copy.source, copy.status, copy.responsible, copy.created]);
          await expect(button).toBeEnabled();
          return rows;
        };
        const allRows = await downloadRows();
        assert.equal(allRows.length, data.total + 1);
        let pending = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/admin/requests');
        await page.locator('.admin-requests__quick-status').getByRole('button', { name: copy.statusLabel.closed, exact: true }).click();
        const filtered = (await (await pending).json()).data;
        const filteredRows = await downloadRows();
        assert.equal(filteredRows.length, filtered.total + 1);
        assert.ok(filteredRows.slice(1).every(row => row[4] === copy.statusLabel.closed));
        let downloads = 0;
        page.on('download', () => { downloads += 1; });
        await context.setOffline(true);
        await button.click();
        await expect(page.getByRole('alert').filter({ hasText: labels.exportFailed })).toBeVisible();
        assert.equal(downloads, 0);
        await context.setOffline(false);
        await downloadRows();
        await expect(page.locator('.admin-requests__export [role="alert"]')).toHaveCount(0);
        pending = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/admin/requests');
        await page.locator('#admin-requests-search').fill('export-no-matching-local-request');
        await page.locator('#admin-requests-search').press('Enter');
        assert.equal((await pending).status(), 200);
        assert.equal((await downloadRows()).length, 1);
        const width = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
        assert.deepEqual(width, { innerWidth: options.viewport.width, scrollWidth: options.viewport.width });
        report.runs.push({ device, locale, status: 'PASS', width, exportedRows: data.total, filteredRows: filtered.total,
          checks: ['all_matching_rows_downloaded', 'status_filter_preserved', 'offline_failure_no_partial_download_then_retry', 'empty_export_headers_only'] });
      } finally {
        await context.setOffline(false);
        await context.request.post(`${base}/api/v1/auth/logout`);
        await context.close();
      }
    }
  }
  report.status = 'PASS_LOCAL_SUBCASES';
} finally {
  await browser.close();
  if (report.status === 'RUNNING') report.status = 'FAIL_LOCAL';
  report.finishedAt = new Date().toISOString();
  await writeFile('docs/quality/guide-runs/request-export-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`REQUEST_EXPORT_PASS runs=${report.runs.length}`);
