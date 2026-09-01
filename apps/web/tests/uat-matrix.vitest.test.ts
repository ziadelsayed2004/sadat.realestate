import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveRoute } from '../src/routes/route-table.ts';
import { render } from '../src/features/frontend_foundation/entry-server.tsx';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const coveragePath = path.join(repositoryRoot, 'agent_pack', '01_product', 'SCREEN_COVERAGE.json');
const locales = ['ar', 'en',] as const;
type Locale = (typeof locales)[number];

interface ScreenCoverageEntry {
  readonly id: string;
  readonly route: string;
}

function readCoverage(): ScreenCoverageEntry[] {
  return JSON.parse(readFileSync(coveragePath, 'utf8')) as ScreenCoverageEntry[];
}

function executableRoute(route: string): string {
  return route.replace(/:([A-Za-z][A-Za-z0-9_]*)/gu, (_match, name: string) => name.toLowerCase().includes('slug')
    ? 'uat-sample'
    : '111111111111111111111111');
}

function localizedRoute(route: string, locale: Locale): string {
  const separator = route.includes('?') ? '&' : '?';
  return executableRoute(route) + separator + 'lang=' + locale;
}

describe('all-screen UAT route and locale matrix', () => {
  it('renders every canonical screen route safely in Arabic, English, and Arabic or English', async () => {
    const coverage = readCoverage();
    expect(coverage).toHaveLength(131);
    const seen = new Set<string>();

    for (const locale of locales) {
      for (const screen of coverage) {
        const url = localizedRoute(screen.route, locale);
        const route = resolveRoute(url);
        expect(route.kind, screen.id + ' ' + url).toBe('matched');
        const result = await render(url);
        expect(result.locale, screen.id + ' ' + locale).toBe(locale);
        expect(result.direction, screen.id + ' ' + locale).toBe(locale === 'ar' ? 'rtl' : 'ltr');
        expect(result.html.length, screen.id + ' ' + locale).toBeGreaterThan(200);
        expect(result.html, screen.id + ' ' + locale).not.toMatch(/(?:storageKey|signedUrl|privateUrl|internalNotes|assignmentId)/iu);
        seen.add(screen.id + ':' + locale);
      }
    }

    expect(seen).toHaveLength(131 * locales.length);
  }, 120_000);
});
