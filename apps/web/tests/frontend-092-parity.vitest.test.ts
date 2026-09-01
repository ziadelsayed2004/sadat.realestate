import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repositoryRoot, relativePath), 'utf8')) as T;
}

type SourceRecord = {
  readonly localPath: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
};

type SourceManifest = {
  readonly screens: readonly {
    readonly id: string;
    readonly localSources: readonly SourceRecord[];
  }[];
};

type LedgerEntry = {
  readonly screenId: string;
  readonly approvedSourcePath: string;
  readonly approvedSourceSha256: string;
  readonly sourceDimensions: { readonly width: number; readonly height: number };
  readonly approvedDevices: readonly string[];
  readonly locales: readonly string[];
  readonly runtimeStatesRequired: readonly string[];
};

const publicScreenIds = Array.from({ length: 12 }, (_, index) => `PUB-${String(index + 1).padStart(2, '0')}`);
const authenticationScreenIds = [
  'AUTH-01',
  'AUTH-02',
  'AUTH-03',
  'AUTH-04',
  'AUTH-05',
  'AUTH-06',
  'AUTH-07',
  'AUTH-08',
  'AUTH-09',
  'AUTH-09+',
  'AUTH-10',
  'AUTH-10+',
  'AUTH-11',
  'AUTH-12',
  'AUTH-13',
  'AUTH-14',
  'AUTH-15',
  'AUTH-16',
  'AUTH-17'
];

const specByScreen: Record<string, string> = {
  'PUB-01': 'apps/web/tests/e2e/visual.spec.ts',
  'PUB-02': 'apps/web/tests/e2e/visual.spec.ts',
  'PUB-03': 'apps/web/tests/e2e/visual.spec.ts',
  'PUB-04': 'apps/web/tests/e2e/visual.spec.ts',
  'PUB-05': 'apps/web/tests/e2e/visual.spec.ts',
  'PUB-06': 'apps/web/tests/e2e/visual.spec.ts',
  'PUB-07': 'apps/web/tests/e2e/visual.spec.ts',
  'PUB-08': 'apps/web/tests/e2e/visual.spec.ts',
  'PUB-09': 'apps/web/tests/e2e/community.spec.ts',
  'PUB-10': 'apps/web/tests/e2e/community.spec.ts',
  'PUB-11': 'apps/web/tests/e2e/about-team.spec.ts',
  'PUB-12': 'apps/web/tests/e2e/about-team.spec.ts',
  'AUTH-01': 'apps/web/tests/e2e/auth.spec.ts',
  'AUTH-02': 'apps/web/tests/e2e/seeker-registration.spec.ts',
  'AUTH-03': 'apps/web/tests/e2e/seeker-registration.spec.ts',
  'AUTH-04': 'apps/web/tests/e2e/auth.spec.ts',
  'AUTH-05': 'apps/web/tests/e2e/auth.spec.ts',
  'AUTH-06': 'apps/web/tests/e2e/seeker-registration.spec.ts',
  'AUTH-07': 'apps/web/tests/e2e/provider-type.spec.ts',
  'AUTH-08': 'apps/web/tests/e2e/provider-type.spec.ts',
  'AUTH-09': 'apps/web/tests/e2e/provider-account.spec.ts',
  'AUTH-09+': 'apps/web/tests/e2e/provider-account.spec.ts',
  'AUTH-10': 'apps/web/tests/e2e/provider-organization-documents.spec.ts',
  'AUTH-10+': 'apps/web/tests/e2e/provider-organization-documents.spec.ts',
  'AUTH-11': 'apps/web/tests/e2e/provider-organization-documents.spec.ts',
  'AUTH-12': 'apps/web/tests/e2e/provider-organization-documents.spec.ts',
  'AUTH-13': 'apps/web/tests/e2e/provider-review.spec.ts',
  'AUTH-14': 'apps/web/tests/e2e/provider-review.spec.ts',
  'AUTH-15': 'apps/web/tests/e2e/provider-review.spec.ts',
  'AUTH-16': 'apps/web/tests/e2e/provider-review.spec.ts',
  'AUTH-17': 'apps/web/tests/e2e/provider-review.spec.ts'
};

describe('frontend_092 public and authentication parity evidence', () => {
  const ledger = readJson<{ readonly screens: readonly LedgerEntry[] }>('agent_pack/07_finish/frontend_092/design-comparison.json');
  const manifest = readJson<SourceManifest>('agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json');

  it('covers every canonical Public and Authentication Screen ID exactly once', () => {
    const expectedIds = [...publicScreenIds, ...authenticationScreenIds];
    const actualIds = ledger.screens.map((screen) => screen.screenId);

    expect(actualIds).toEqual(expectedIds);
    expect(new Set(actualIds).size).toBe(expectedIds.length);
  });

  it('records a matching approved local export and integrity metadata for every screen', () => {
    const manifestById = new Map(manifest.screens.map((screen) => [screen.id, screen]));

    for (const screen of ledger.screens) {
      const source = manifestById.get(screen.screenId)?.localSources[0];
      expect(source, `${screen.screenId} is missing from the design source manifest`).toBeDefined();
      expect(screen.approvedSourcePath).toBe(source?.localPath);
      expect(screen.approvedSourceSha256).toBe(source?.sha256);
      expect(screen.sourceDimensions).toEqual({ width: source?.width, height: source?.height });
      expect(screen.approvedDevices).toEqual(['desktop', 'tablet', 'mobile']);
      expect(screen.locales).toEqual(['ar', 'en',]);
      expect(screen.runtimeStatesRequired).toEqual(['success', 'loading', 'empty', 'error', 'retry', 'disabled', 'permission']);

      const sourcePath = path.join(repositoryRoot, screen.approvedSourcePath);
      expect(existsSync(sourcePath), `${screen.screenId} approved source is missing`).toBe(true);
      const digest = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
      expect(digest).toBe(screen.approvedSourceSha256);
    }
  });

  it('maps every screen to an executable deterministic browser spec', () => {
    for (const screen of ledger.screens) {
      const specPath = specByScreen[screen.screenId];
      expect(specPath, `${screen.screenId} has no browser spec mapping`).toBeDefined();
      if (specPath === undefined) throw new Error(`${screen.screenId} has no browser spec mapping`);
      expect(existsSync(path.join(repositoryRoot, specPath)), `${screen.screenId} browser spec is missing`).toBe(true);
    }
  });
});
