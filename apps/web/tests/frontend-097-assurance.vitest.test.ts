import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8')) as { scripts: Record<string, string> };

describe('frontend_097 official assurance boundaries', () => {
  it('runs every screenshot-bearing Playwright spec instead of only the public visual spec', () => {
    const specNames = fs.readdirSync(path.join(appRoot, 'tests/e2e'))
      .filter(name => name.endsWith('.spec.ts'))
      .filter(name => fs.readFileSync(path.join(appRoot, 'tests/e2e', name), 'utf8').includes('toHaveScreenshot'));
    expect(specNames.length).toBeGreaterThan(1);
    expect(packageJson.scripts.testVisual).toBeUndefined();
    expect(packageJson.scripts['test:visual']).toContain('run-visual-matrix.mjs');
    expect(specNames).toContain('visual.spec.ts');
    expect(specNames).toContain('admin-settings-visual.spec.ts');
    expect(specNames).toContain('provider-property-wizard.spec.ts');
  });

  it('runs every dedicated accessibility spec and enforces the production bundle budget', () => {
    const accessibilityNames = fs.readdirSync(path.join(appRoot, 'tests/e2e'))
      .filter(name => name === 'accessibility.spec.ts' || name.endsWith('-accessibility.spec.ts'));
    expect(accessibilityNames.length).toBeGreaterThan(1);
    expect(packageJson.scripts['test:a11y']).toContain('run-accessibility-matrix.mjs');
    expect(packageJson.scripts['build:client']).toContain('check-bundle-budget.mjs');
    expect(fs.existsSync(path.join(appRoot, 'scripts/check-bundle-budget.mjs'))).toBe(true);
  });
});
