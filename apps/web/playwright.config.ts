import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { TEST_MATRIX } from './src/features/testing/model.ts';

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4173';

function deviceDescriptor(name: string) {
  const descriptor = devices[name];
  if (descriptor === undefined) throw new Error(`Playwright device preset is unavailable: ${name}`);
  return descriptor;
}

const webServer = process.env.WEB_BASE_URL === undefined ? {
  command: 'npm run start',
  cwd: appRoot,
  url: baseURL,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000
} : undefined;

export default defineConfig({
  testDir: path.resolve(appRoot, 'tests/e2e'),
  outputDir: path.resolve(appRoot, 'test-results'),
  snapshotDir: path.resolve(appRoot, 'tests/e2e/__snapshots__'),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: path.resolve(appRoot, 'playwright-report'), open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  ...(webServer === undefined ? {} : { webServer }),
  projects: TEST_MATRIX.map((entry) => ({
    name: entry.name,
    use: {
      ...deviceDescriptor(entry.preset),
      baseURL
    }
  }))
});
