import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const manifestPath = path.join(repositoryRoot, 'agent_pack', '09_sources', 'DESIGN_SOURCE_MANIFEST.json');
const registryPath = path.join(repositoryRoot, 'agent_pack', '01_product', 'SCREEN_REGISTRY.json');
const coveragePath = path.join(repositoryRoot, 'agent_pack', '01_product', 'SCREEN_COVERAGE.json');
const decisionLogPath = path.join(repositoryRoot, 'agent_pack', '08_reality_sync', 'DECISION_LOG.md');

interface LocalSource {
  localPath: string;
  sha256: string;
  width: number;
  height: number;
}

interface DesignSourceEntry {
  id: string;
  surface: 'public' | 'auth' | 'seeker' | 'provider' | 'admin';
  englishName: string;
  sourceStatus: string;
  visualSourceStatus: string;
  localSources: LocalSource[];
  driveUrl: string;
  figmaPrototypeUrl: string;
  deviceScope: string[];
  directionScope: string[];
  locales: string[];
}

interface DesignSourceManifest {
  screenSummary: {
    registryCount: number;
    locallyExportedScreenIds: number;
    externalOnlyScreenIds: string[];
  };
  screens: DesignSourceEntry[];
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

describe('release visual fidelity source matrix', () => {
  it('maps every registered Screen ID to a verified approved source or the recorded waiver', () => {
    const manifest = readJson<DesignSourceManifest>(manifestPath);
    const registry = readJson<Array<{ id: string }>>(registryPath);
    const coverage = readJson<Array<{ id: string }>>(coveragePath);
    const manifestIds = manifest.screens.map(screen => screen.id);

    expect(manifest.screenSummary.registryCount).toBe(131);
    expect(manifest.screenSummary.locallyExportedScreenIds).toBe(130);
    expect(manifest.screenSummary.externalOnlyScreenIds).toEqual(['ADM-54']);
    expect(manifest.screens).toHaveLength(131);
    expect(new Set(manifestIds).size).toBe(131);
    expect(manifestIds).toEqual(registry.map(screen => screen.id));
    expect(manifestIds).toEqual(coverage.map(screen => screen.id));

    for (const screen of manifest.screens) {
      expect(screen.driveUrl, screen.id).toMatch(/^https:\/\/(?:www\.)?google\.com\/|^https:\/\/drive\.google\.com\//u);
      expect(screen.figmaPrototypeUrl, screen.id).toMatch(/^https:\/\/www\.figma\.com\//u);
      expect(screen.directionScope, screen.id).toEqual(['rtl', 'ltr']);
      expect(screen.locales, screen.id).toEqual(['ar', 'en', 'zh-CN']);

      if (screen.id === 'ADM-54') {
        expect(screen.visualSourceStatus).toBe('EXTERNAL_GROUP_REFERENCE_ONLY');
        expect(screen.sourceStatus).toBe('GROUP LINK');
        expect(screen.localSources).toEqual([]);
        continue;
      }

      expect(screen.visualSourceStatus, screen.id).toBe('LOCAL_FINAL_EXPORT');
      expect(screen.localSources.length, screen.id).toBeGreaterThan(0);
      for (const localSource of screen.localSources) {
        expect(localSource.localPath, screen.id).toMatch(/^docs\/design_sources\/final_screens\//u);
        expect(localSource.localPath, screen.id).not.toMatch(/(?:snapshot|test-results|playwright|dist)/iu);
        const absolutePath = path.join(repositoryRoot, localSource.localPath);
        expect(existsSync(absolutePath), localSource.localPath).toBe(true);
        expect(localSource.sha256, localSource.localPath).toMatch(/^[a-f0-9]{64}$/u);
        expect(sha256(absolutePath), localSource.localPath).toBe(localSource.sha256);
        expect(localSource.width, localSource.localPath).toBeGreaterThan(0);
        expect(localSource.height, localSource.localPath).toBeGreaterThan(0);
      }
    }
  });

  it('preserves the approved device scope for each product surface', () => {
    const manifest = readJson<DesignSourceManifest>(manifestPath);
    const expectedDeviceScope: Record<DesignSourceEntry['surface'], string[]> = {
      public: ['desktop', 'tablet', 'mobile'],
      auth: ['desktop', 'tablet', 'mobile'],
      seeker: ['desktop'],
      provider: ['desktop'],
      admin: ['desktop']
    };

    for (const screen of manifest.screens) {
      expect(screen.deviceScope, screen.id).toEqual(expectedDeviceScope[screen.surface]);
    }
  });

  it('keeps ADM-54 explicitly owner-waived without representing direct comparison as passed', () => {
    const decisionLog = readFileSync(decisionLogPath, 'utf8');

    expect(decisionLog).toContain('DESIGN-EXCEPTION-ADM-54');
    expect(decisionLog).toContain('Approved non-blocking release exception');
    expect(decisionLog).toContain('Allowed substitute evidence');
    expect(decisionLog).toContain('Direct ADM-54 pixel-perfect comparison was not performed');
    expect(decisionLog).toContain('Replace this waiver with direct source comparison');
    expect(decisionLog).not.toContain('ADM-54 pixel-perfect comparison passed');
  });
});
