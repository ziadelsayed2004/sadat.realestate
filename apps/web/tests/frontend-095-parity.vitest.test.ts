import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const ledgerPath = resolve(repositoryRoot, 'agent_pack/07_finish/frontend_095/design-comparison.json');
const manifestPath = resolve(repositoryRoot, 'agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json');
const coveragePath = resolve(repositoryRoot, 'agent_pack/01_product/SCREEN_COVERAGE.json');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('frontend_095 Admin parity ledger', () => {
  it('covers every local Admin source except ADM-54 with traceable runtime evidence', () => {
    const ledger = readJson<{
      screenCount: number;
      excludedScreenIds: string[];
      entries: Array<{
        screenId: string;
        route: string;
        approvedSources: Array<{ path: string; sha256: string; dimensions: { width: number; height: number } }>;
        approvedDevices: string[];
        locales: string[];
        directions: string[];
        implementationStatus: string;
        comparisonStatus: string;
        runtimeEvidence: string[];
        materialDifferences: string[];
        remainingGaps: string[];
      }>;
    }>(ledgerPath);
    const manifest = readJson<{ screens: Array<{ id: string; localSources?: Array<{ localPath: string; sha256: string; width: number; height: number }> }> }>(manifestPath);
    const coverage = readJson<Array<{ id: string; surface: string; route: string }>>(coveragePath);
    const expected = coverage.filter(screen => screen.id.startsWith('ADM-') && screen.id !== 'ADM-54');
    const entries = new Map(ledger.entries.map(entry => [entry.screenId, entry]));

    expect(ledger.screenCount).toBe(expected.length);
    expect(ledger.excludedScreenIds).toEqual(['ADM-54']);
    expect(entries.size).toBe(expected.length);

    for (const screen of expected) {
      const entry = entries.get(screen.id);
      const source = manifest.screens.find(item => item.id === screen.id)?.localSources ?? [];
      expect(entry, screen.id).toBeDefined();
      expect(entry?.route, screen.id).toBe(screen.route);
      expect(entry?.approvedSources, screen.id).toHaveLength(source.length);
      expect(entry?.approvedDevices, screen.id).toEqual(['desktop']);
      expect(entry?.locales, screen.id).toEqual(['ar', 'en',]);
      expect(entry?.directions, screen.id).toEqual(['rtl', 'ltr']);
      expect(entry?.implementationStatus, screen.id).toBe('verified');
      expect(entry?.comparisonStatus, screen.id).toBe('verified');
      expect(entry?.materialDifferences, screen.id).toEqual([]);
      expect(entry?.remainingGaps, screen.id).toEqual([]);
      for (const approved of source) {
        const recorded = entry?.approvedSources.find(item => item.path === approved.localPath);
        expect(recorded, `${screen.id} ${approved.localPath}`).toBeDefined();
        const bytes = readFileSync(resolve(repositoryRoot, approved.localPath));
        expect(createHash('sha256').update(bytes).digest('hex'), approved.localPath).toBe(approved.sha256);
        expect(recorded?.sha256, approved.localPath).toBe(approved.sha256);
        expect(recorded?.dimensions, approved.localPath).toEqual({ width: approved.width, height: approved.height });
      }
      for (const runtimeEvidence of entry?.runtimeEvidence.slice(1) ?? []) {
        expect(existsSync(resolve(repositoryRoot, runtimeEvidence)), `${screen.id} ${runtimeEvidence}`).toBe(true);
      }
    }
  });

  it('keeps the overview and role-specific super-admin detail evidence separate', () => {
    const ledger = readJson<{ entries: Array<{ screenId: string; runtimeEvidence: string[]; repairs: string[] }> }>(ledgerPath);
    const overview = ledger.entries.find(entry => entry.screenId === 'ADM-01');
    const superAdmin = ledger.entries.find(entry => entry.screenId === 'ADM-61');
    expect(overview?.runtimeEvidence.some(path => path.includes('admin-overview-'))).toBe(true);
    expect(overview?.repairs).toContain('Expanded the overview into the approved dashboard hierarchy while retaining contract-backed KPI values and explicit unavailable states for unimplemented overview projections.');
    expect(superAdmin?.runtimeEvidence.some(path => path.includes('user-detail-super-admin'))).toBe(true);
    expect(superAdmin?.repairs).toContain('Added a dedicated super-admin detail visual fixture and evidence path so the role-specific source is not represented by the standard-role baseline.');
  });
});
