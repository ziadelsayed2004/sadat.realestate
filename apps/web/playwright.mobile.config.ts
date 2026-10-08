import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// Opt-in Safari coverage keeps the usual Chromium matrix independent of a
// WebKit installation. Run this config for touch navigation regressions.
export default defineConfig({
  ...baseConfig,
  testMatch: 'team-mobile-navigation.spec.ts',
  projects: (['webkit', 'chromium'] as const).flatMap(browserName => ['ar', 'en'].map(locale => ({
    name: `mobile-${browserName}-${locale}`,
    use: { browserName }
  })))
});
