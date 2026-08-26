import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TEST_MATRIX } from '../src/features/testing/model.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const manifestPath = path.join(repositoryRoot, 'agent_pack', '09_sources', 'DESIGN_SOURCE_MANIFEST.json');

const authCoverage = {
  'AUTH-01': 'auth.spec.ts',
  'AUTH-02': 'seeker-registration.spec.ts',
  'AUTH-03': 'seeker-registration.spec.ts',
  'AUTH-04': 'auth.spec.ts',
  'AUTH-05': 'auth.spec.ts',
  'AUTH-06': 'seeker-registration.spec.ts',
  'AUTH-07': 'provider-type.spec.ts',
  'AUTH-08': 'provider-type.spec.ts',
  'AUTH-09': 'provider-account.spec.ts',
  'AUTH-09+': 'provider-account.spec.ts',
  'AUTH-10': 'provider-organization-documents.spec.ts',
  'AUTH-10+': 'provider-organization-documents.spec.ts',
  'AUTH-11': 'provider-organization-documents.spec.ts',
  'AUTH-12': 'provider-organization-documents.spec.ts',
  'AUTH-13': 'provider-review.spec.ts',
  'AUTH-14': 'provider-review.spec.ts',
  'AUTH-15': 'provider-review.spec.ts',
  'AUTH-16': 'provider-review.spec.ts',
  'AUTH-17': 'provider-review.spec.ts'
} as const;

describe('authentication and onboarding QA matrix', () => {
  it('keeps every live AUTH design export bound to executable coverage', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      screens: Array<{
        id: string;
        surface: string;
        sourceStatus: string;
        visualSourceStatus: string;
        localSources: Array<{ localPath: string; sha256: string }>;
        driveUrl: string;
        figmaPrototypeUrl: string;
        deviceScope: string[];
        directionScope: string[];
        locales: string[];
      }>;
    };

    const authScreens = manifest.screens.filter((screen) => screen.surface === 'auth');
    expect(authScreens.map((screen) => screen.id)).toEqual(Object.keys(authCoverage));

    for (const screen of authScreens) {
      expect(screen.sourceStatus).toBe('LIVE');
      expect(screen.visualSourceStatus).toBe('LOCAL_FINAL_EXPORT');
      expect(screen.localSources.length).toBeGreaterThan(0);
      expect(screen.driveUrl).toMatch(/^https:\/\/drive\.google\.com\//u);
      expect(screen.figmaPrototypeUrl).toMatch(/^https:\/\/www\.figma\.com\//u);
      expect(screen.deviceScope).toEqual(['desktop', 'tablet', 'mobile']);
      expect(screen.directionScope).toEqual(['rtl', 'ltr']);
      // This lane verifies only the Arabic RTL and English LTR auth surfaces.
      expect(screen.locales).toEqual(expect.arrayContaining(['ar', 'en']));

      for (const source of screen.localSources) {
        expect(existsSync(path.join(repositoryRoot, source.localPath))).toBe(true);
        expect(source.sha256).toMatch(/^[a-f0-9]{64}$/u);
      }

      const e2eCoverage = path.join(repositoryRoot, 'apps', 'web', 'tests', 'e2e', authCoverage[screen.id as keyof typeof authCoverage]);
      expect(existsSync(e2eCoverage)).toBe(true);
    }
  });

  it('keeps Arabic and English auth coverage across the three approved devices', () => {
    const authMatrix = TEST_MATRIX.filter((entry) => entry.locale === 'ar' || entry.locale === 'en');
    expect(authMatrix).toHaveLength(6);
    expect(new Set(authMatrix.map((entry) => entry.device))).toEqual(new Set(['desktop', 'tablet', 'mobile']));
    expect(new Set(authMatrix.map((entry) => entry.locale))).toEqual(new Set(['ar', 'en']));
    expect(new Set(authMatrix.map((entry) => entry.direction))).toEqual(new Set(['rtl', 'ltr']));
    expect(authMatrix.filter((entry) => entry.locale === 'ar').every((entry) => entry.direction === 'rtl')).toBe(true);
    expect(authMatrix.filter((entry) => entry.locale === 'en').every((entry) => entry.direction === 'ltr')).toBe(true);
  });
});
