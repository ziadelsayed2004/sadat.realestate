import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repositoryRoot, relativePath), 'utf8')) as T;
}

describe('final release manifest', () => {
  it('locks the complete graph with conditional readiness and explicit claim limits', () => {
    const manifest = readJson<{
      readonly manifestVersion: string;
      readonly releaseStatus: string;
      readonly graphStatus: string;
      readonly taskCounts: {
        readonly backendTotal?: number;
        readonly backendComplete: number;
        readonly frontendTotal?: number;
        readonly frontendComplete: number;
        readonly frontendInProgress?: string | null;
      };
      readonly screenEvidence: { readonly canonicalScreenCount: number; readonly routeLocaleUatCases: number; readonly localApprovedVisualSources: number; readonly adm54DirectComparison: boolean; readonly adm54ExceptionId: string };
      readonly claims: { readonly allApisTested: boolean; readonly all131ScreensComplete: boolean; readonly backendComplete: boolean; readonly fullPlatformComplete: boolean };
      readonly acceptedExceptions: readonly { readonly id: string; readonly status: string; readonly approvedBy: string; readonly directComparisonPerformed: boolean; readonly residualDebt: string }[];
      readonly productionDeployment: string;
    }>('agent_pack/08_reality_sync/FINAL_RELEASE_MANIFEST.json');
    const taskState = readJson<{ readonly tasks: Record<string, { readonly status: string }> }>('agent_pack/03_execution/TASK_STATE.json');
    const finishIndex = readJson<readonly string[]>('agent_pack/07_finish/FINISH_INDEX.json');
    const decisionLog = readFileSync(path.join(repositoryRoot, 'agent_pack', '08_reality_sync', 'DECISION_LOG.md'), 'utf8');

    expect(manifest.manifestVersion).toBe('sadat-release-v1');
    expect(manifest.releaseStatus).toBe('conditional');
    expect(['pending_frontend_090_close', 'complete_conditional', 'pending_post_release_assurance']).toContain(manifest.graphStatus);
    const taskEntries = Object.entries(taskState.tasks);
    const backendEntries = taskEntries.filter(([taskId]) => taskId.startsWith('backend_'));
    const frontendEntries = taskEntries.filter(([taskId]) => taskId.startsWith('frontend_'));
    const frontendInProgress = frontendEntries.filter(([, task]) => task.status === 'in_progress').map(([taskId]) => taskId);

    expect(manifest.taskCounts).toMatchObject({
      backendTotal: backendEntries.length,
      backendComplete: backendEntries.filter(([, task]) => task.status === 'complete').length,
      frontendTotal: frontendEntries.length,
      frontendComplete: frontendEntries.filter(([, task]) => task.status === 'complete').length,
      frontendInProgress: frontendInProgress[0] ?? null
    });
    if (manifest.graphStatus === 'pending_post_release_assurance') {
      if (frontendInProgress.length === 0) {
        expect(Object.values(taskState.tasks).some(task => task.status === 'blocked')).toBe(true);
      } else {
        expect(frontendInProgress).toHaveLength(1);
        expect(taskState.tasks[frontendInProgress[0] ?? '']?.status).toBe('in_progress');
      }
      expect(finishIndex).toContain('frontend_090');
    } else if (manifest.graphStatus === 'complete_conditional') {
      expect(manifest.taskCounts).toEqual({ backendComplete: 113, frontendComplete: 75 });
      expect(Object.values(taskState.tasks).every(task => task.status === 'complete')).toBe(true);
      expect(finishIndex).toContain('frontend_090');
    } else {
      expect(manifest.taskCounts).toMatchObject({
        backendTotal: 113,
        backendComplete: 113,
        frontendTotal: 75,
        frontendComplete: 74,
        frontendInProgress: 'frontend_090'
      });
      expect(taskState.tasks.frontend_090?.status).toBe('in_progress');
      expect(finishIndex).not.toContain('frontend_090');
    }
    expect(manifest.screenEvidence).toEqual({
      canonicalScreenCount: 131,
      routeLocaleUatCases: 393,
      localApprovedVisualSources: 131,
      adm54DirectComparison: false,
      adm54ExceptionId: 'DESIGN-EXCEPTION-ADM-54'
    });
    expect(manifest.claims).toEqual({
      allApisTested: false,
      all131ScreensComplete: false,
      backendComplete: backendEntries.every(([, task]) => task.status === 'complete'),
      fullPlatformComplete: false,
      reasonAllApisTested: expect.any(String),
      reasonAll131ScreensComplete: expect.any(String),
      reasonFullPlatformComplete: expect.any(String)
    });
    expect(manifest.acceptedExceptions).toContainEqual({
      id: 'DESIGN-EXCEPTION-ADM-54',
      status: 'approved_non_blocking',
      approvedBy: 'Project Owner',
      directComparisonPerformed: false,
      residualDebt: expect.any(String)
    });
    expect(manifest.productionDeployment).toBe('not_performed');
    expect(decisionLog).toContain('DESIGN-EXCEPTION-ADM-54');
    expect(JSON.stringify(manifest)).not.toMatch(/(?:password|token|secret|credential)\s*[:=]\s*['"][A-Za-z0-9_-]{16,}/iu);
  });
});
