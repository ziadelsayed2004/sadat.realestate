import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const e2eRoot = path.resolve(appRoot, 'tests/e2e');
const accessibilitySpecs = readdirSync(e2eRoot, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.spec.ts'))
  .filter(entry => entry.name === 'accessibility.spec.ts' || entry.name.endsWith('-accessibility.spec.ts'))
  .map(entry => `tests/e2e/${entry.name}`)
  .sort((left, right) => left.localeCompare(right));

if (accessibilitySpecs.length === 0) {
  console.error('ACCESSIBILITY_MATRIX_EMPTY: no accessibility Playwright specs were found');
  process.exitCode = 1;
} else {
  console.log(`ACCESSIBILITY_MATRIX_SPECS ${accessibilitySpecs.length}`);
  for (const spec of accessibilitySpecs) console.log(`ACCESSIBILITY_MATRIX_SPEC ${spec}`);
  const playwrightCli = path.resolve(appRoot, '../../node_modules/playwright/cli.js');
  const result = spawnSync(process.execPath, [playwrightCli, 'test', '--config', 'playwright.config.ts', ...accessibilitySpecs], {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit'
  });
  if (result.error !== undefined) console.error(`ACCESSIBILITY_MATRIX_LAUNCH_FAILURE ${result.error.message}`);
  process.exitCode = result.status ?? 1;
}
