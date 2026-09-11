import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:4173/api/v1/public/properties';
const checks = [];
for (const query of ['page=0', 'limit=101', 'minPrice=20&maxPrice=10', 'locationId=invalid', 'sort=invalid', `search=${'x'.repeat(81)}`, 'unexpected=true']) {
  const response = await fetch(`${base}?${query}`);
  assert.equal(response.status, 400, query);
  checks.push({ query, status: response.status });
}
const valid = await fetch(`${base}?limit=1`);
assert.equal(valid.status, 200);
const body = await valid.json();
assert.ok(body.data);
const report = { status: 'PASS_LOCAL_API_SUBCASES', environment: 'local', mockedRoutes: false,
  journeys: ['GUIDE-01', 'GUIDE-02'], commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  checks, validQueryAfterRejections: 200, finishedAt: new Date().toISOString(),
  scope: 'Public property API query validation only; browser validation and complete journey closure are not claimed' };
await writeFile('docs/quality/guide-runs/discovery-validation-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`DISCOVERY_VALIDATION_PASS rejected=${checks.length} recovered=200`);
