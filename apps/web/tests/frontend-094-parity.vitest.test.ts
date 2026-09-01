import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repositoryRoot, relativePath), 'utf8')) as T;
}

type SourceManifest = {
  readonly screens: readonly {
    readonly id: string;
    readonly localSources: readonly { readonly localPath: string; readonly sha256: string; readonly width: number; readonly height: number }[];
  }[];
};

type LedgerEntry = {
  readonly screenId: string;
  readonly approvedSourcePath: string;
  readonly approvedSourceSha256: string;
  readonly sourceDimensions: { readonly width: number; readonly height: number };
  readonly approvedDevices: readonly string[];
  readonly locales: readonly string[];
  readonly implementationStatus: string;
  readonly comparisonStatus: string;
  readonly runtimeEvidence: readonly string[];
  readonly materialDifferences: readonly unknown[];
  readonly contractBoundaries: readonly string[];
  readonly remainingGaps: readonly unknown[];
};

const providerScreenIds = [
  ...Array.from({ length: 14 }, (_, index) => `PRV-${String(index + 1).padStart(2, '0')}`),
  'PRV-15',
  'PRV-16',
  'PRV-17',
  'PRV-18',
  'PRV-19',
  'PRV-20',
  'PRV-21',
  'PRV-22-1',
  'PRV-22-2',
  'PRV-22-3'
];

describe('frontend_094 Provider design parity evidence', () => {
  const ledger = readJson<{ readonly screens: readonly LedgerEntry[] }>('agent_pack/07_finish/frontend_094/design-comparison.json');
  const manifest = readJson<SourceManifest>('agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json');

  it('covers all 24 canonical Provider screens exactly once', () => {
    const actualIds = ledger.screens.map((screen) => screen.screenId);
    expect(actualIds).toEqual(providerScreenIds);
    expect(new Set(actualIds).size).toBe(24);
  });

  it('pins every approved source to the canonical manifest and current file digest', () => {
    const manifestById = new Map(manifest.screens.map((screen) => [screen.id, screen]));
    for (const screen of ledger.screens) {
      const source = manifestById.get(screen.screenId)?.localSources[0];
      expect(source, `${screen.screenId} source missing from manifest`).toBeDefined();
      expect(screen.approvedSourcePath).toBe(source?.localPath);
      expect(screen.approvedSourceSha256).toBe(source?.sha256);
      expect(screen.sourceDimensions).toEqual({ width: source?.width, height: source?.height });
      expect(screen.approvedDevices).toEqual(['desktop']);
      expect(screen.locales).toEqual(['ar', 'en',]);
      const sourcePath = path.join(repositoryRoot, screen.approvedSourcePath);
      expect(existsSync(sourcePath), `${screen.screenId} source file is missing`).toBe(true);
      expect(createHash('sha256').update(readFileSync(sourcePath)).digest('hex')).toBe(screen.approvedSourceSha256);
    }
  });

  it('records verified runtime evidence with no unresolved material difference', () => {
    for (const screen of ledger.screens) {
      expect(screen.implementationStatus).toBe('verified');
      expect(screen.comparisonStatus).toBe('verified');
      expect(screen.runtimeEvidence).toHaveLength(3);
      for (const evidence of screen.runtimeEvidence) {
        expect(existsSync(path.join(repositoryRoot, evidence)), `${screen.screenId} runtime evidence is missing`).toBe(true);
      }
      expect(screen.materialDifferences).toEqual([]);
      expect(screen.contractBoundaries).toBeDefined();
      expect(screen.remainingGaps).toEqual([]);
    }
  });
});
