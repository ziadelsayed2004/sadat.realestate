import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const coveragePath = path.join(repositoryRoot, 'agent_pack', '01_product', 'SCREEN_COVERAGE.json');
const manifestPath = path.join(repositoryRoot, 'agent_pack', '09_sources', 'DESIGN_SOURCE_MANIFEST.json');
const taskStatePath = path.join(repositoryRoot, 'agent_pack', '03_execution', 'TASK_STATE.json');
const decisionLogPath = path.join(repositoryRoot, 'agent_pack', '08_reality_sync', 'DECISION_LOG.md');

interface ScreenCoverageEntry {
  id: string;
  surface: string;
  route: string;
  frontendTaskId: string;
}

interface DesignSourceEntry {
  sourceStatus: string;
  id: string;
  visualSourceStatus: string;
  localSources: Array<{ localPath: string; sha256: string }>;
  driveUrl: string;
  figmaPrototypeUrl: string;
  deviceScope: string[];
  directionScope: string[];
  locales: string[];
}

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

describe('Admin Dashboard QA source and completion matrix', () => {
  it('keeps all ADM-01 through ADM-66 coverage entries bound to approved sources or the explicit ADM-54 waiver', () => {
    const coverage = JSON.parse(readFileSync(coveragePath, 'utf8')) as ScreenCoverageEntry[];
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { screens: DesignSourceEntry[] };
    const adminCoverage = coverage.filter(screen => screen.surface === 'admin');
    const adminManifest = new Map(manifest.screens.filter(screen => screen.id.startsWith('ADM-')).map(screen => [screen.id, screen]));

    expect(adminCoverage).toHaveLength(66);
    expect(adminCoverage.map(screen => screen.id)).toEqual(Array.from({ length: 66 }, (_, index) => `ADM-${String(index + 1).padStart(2, '0')}`));

    for (const screen of adminCoverage) {
      expect(screen.frontendTaskId).toMatch(/^frontend_(06[0-9]|07[0-6])$/u);
      const source = adminManifest.get(screen.id);
      expect(source, screen.id).toBeDefined();
      if (source === undefined) continue;
      expect(source.driveUrl, screen.id).toMatch(/^https:\/\/www\.google\.com\/|^https:\/\/drive\.google\.com\//u);
      expect(source.figmaPrototypeUrl, screen.id).toMatch(/^https:\/\/www\.figma\.com\//u);
      expect(source.deviceScope, screen.id).toEqual(['desktop']);
      expect(source.directionScope, screen.id).toEqual(['rtl', 'ltr']);
      expect(source.locales, screen.id).toEqual(['ar', 'en', 'zh-CN']);

      if (screen.id === 'ADM-54') {
        expect(source.sourceStatus).toBe('OWNER_AUTHORED_PENDING_REVIEW');
        expect(source.visualSourceStatus).toBe('OWNER_AUTHORED_LOCAL_REVIEW_PENDING');
        expect(source.localSources.map(localSource => localSource.localPath)).toEqual([
          'docs/design_sources/final_screens/admin/ADM-54.owner-authored.html',
          'docs/design_sources/final_screens/admin/ADM-54.owner-authored.png'
        ]);
        for (const localSource of source.localSources) {
          const absolutePath = path.join(repositoryRoot, localSource.localPath);
          expect(existsSync(absolutePath), localSource.localPath).toBe(true);
          expect(sha256(absolutePath), localSource.localPath).toBe(localSource.sha256);
        }
        continue;
      }

      expect(source.visualSourceStatus, screen.id).toBe('LOCAL_FINAL_EXPORT');
      expect(source.localSources.length, screen.id).toBeGreaterThan(0);
      for (const localSource of source.localSources) {
        const absolutePath = path.join(repositoryRoot, localSource.localPath);
        expect(existsSync(absolutePath), localSource.localPath).toBe(true);
        expect(sha256(absolutePath), localSource.localPath).toBe(localSource.sha256);
      }
    }
  });

  it('requires all prior Admin implementation tasks to be complete and preserves the owner waiver as a release-visible decision', () => {
    const taskState = JSON.parse(readFileSync(taskStatePath, 'utf8')) as { tasks: Record<string, { status: string }> };
    for (let taskNumber = 60; taskNumber <= 76; taskNumber += 1) {
      const taskId = `frontend_${String(taskNumber).padStart(3, '0')}`;
      expect(taskState.tasks[taskId]?.status, taskId).toBe('complete');
    }
    const decisionLog = readFileSync(decisionLogPath, 'utf8');
    expect(decisionLog).toContain('DESIGN-EXCEPTION-ADM-54');
    expect(decisionLog).toContain('Approved non-blocking release exception');
    expect(decisionLog).toContain('Direct ADM-54 pixel-perfect comparison was not performed');
  });
});
