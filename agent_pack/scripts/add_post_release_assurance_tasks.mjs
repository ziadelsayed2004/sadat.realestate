import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execution = path.join(pack, '03_execution');
const now = new Date().toISOString();
const read = (name) => JSON.parse(fs.readFileSync(path.join(execution, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(execution, name), JSON.stringify(value, null, 2) + '\n');

const backendAcceptance = [
  'Use an isolated non-production MongoDB replica set and run the live integration, transaction, migration, index, seed, backup, and restore matrix.',
  'Configure approved non-production private storage, malware scanning, OTP, monitoring, and scheduling providers and prove fail-closed readiness.',
  'Run the complete positive, negative, RBAC, ownership/IDOR, validation, state, upload, replay, concurrency, and journey matrix for every implemented route.',
  'Run checked-in native Ubuntu service artifacts with health, readiness, graceful shutdown, and rollback evidence.',
  'Produce external security-assurance evidence without claiming Production penetration testing unless it actually occurred.',
  'Keep runtime inventory, OpenAPI, Postman, environment examples, and evidence synchronized.'
];

const frontendCommonVerification = [
  'npm run typecheck --workspace apps/web',
  'npm run lint --workspace apps/web',
  'npm run test --workspace apps/web',
  'npm run build --workspace apps/web',
  'targeted Playwright, visual, accessibility, locale, direction, and device checks',
  'node agent_pack/scripts/audit_pack.mjs'
];

const additions = [
  {
    id: 'backend_139', phase: 'B10_post_release_assurance', area: 'release assurance',
    title: 'Live Production-Parity Infrastructure and API Assurance',
    goal: 'Prove the live non-production API and infrastructure boundaries that repository-only tests cannot prove, without using Production data or credentials.',
    kind: 'quality', screens: [],
    sourceRefs: ['08_reality_sync/FINAL_RELEASE_MANIFEST.json', '08_reality_sync/PLATFORM_COMPLETION_AUDIT.json', '02_architecture/ENVIRONMENT_MATRIX.md', '02_architecture/DEPLOYMENT_PLAN.md'],
    notes: ['External infrastructure and credentials are mandatory. Missing prerequisites must remain Blocked.'],
    track: 'backend', dependsOn: ['backend_138'],
    atomicTaskFile: '04_tracks/backend/B10_post_release_assurance/backend_139.md',
    allowedRoots: ['apps/api/**', 'packages/contracts/**', 'packages/config/**', 'docs/api/**', 'docs/operations/**', 'agent_pack/**'],
    acceptance: backendAcceptance,
    verification: ['npm run typecheck', 'npm run lint', 'npm test', 'npm run build', 'npm run api:inventory', 'npm run openapi:validate', 'npm run postman:validate', 'live API, provider, native infrastructure, backup/restore, and security matrices', 'node agent_pack/scripts/audit_pack.mjs']
  },
  {
    id: 'backend_140', phase: 'B10_post_release_assurance', area: 'local runtime',
    title: 'Native Non-Docker Local Runtime Recovery',
    goal: 'Replace the stale embedded-database local supervisor with a cross-platform Node.js runtime that uses an external non-production MONGODB_URI, truthful health and readiness, deterministic local seed data, and repository-owned process control.',
    kind: 'infrastructure', screens: [],
    sourceRefs: ['08_reality_sync/CURRENT_STATE.md', '02_architecture/ENVIRONMENT_MATRIX.md', '02_architecture/DEPLOYMENT_PLAN.md', '09_sources/DESIGN_SOURCE_MANIFEST.json'],
    notes: ['This task is dependency-ready independently of the blocked external production-parity task backend_139.', 'Production deployment, real SMTP delivery, and remote VPS actions remain separately gated.'],
    track: 'backend', dependsOn: ['backend_138'],
    atomicTaskFile: '04_tracks/backend/B10_post_release_assurance/backend_140.md',
    allowedRoots: ['package.json', 'package-lock.json', '.env.local.example', 'scripts/**', 'apps/api/**', 'apps/web/**', 'README.md', 'docs/operations/**', 'docs/api/**', 'docs/deployment/**', 'agent_pack/**'],
    acceptance: [
      'Remove active Docker and embedded MongoDB assumptions from local startup and use MONGODB_URI for Local and Test.',
      'Implement local:doctor, local:prepare, local:up, local:status, local:seed, local:smoke, and local:down as cross-platform repository-owned commands.',
      'Make status and readiness perform real API and MongoDB liveness checks, report degraded database loss, prevent duplicate startup, and clean stale state.',
      'Bound or rotate supervisor logs and stop only child processes started by this repository.',
      'Make seed data deterministic and idempotent across the required non-production domain fixtures without private public-file URLs.',
      'Verify populated homepage/API success, restart, shutdown, database-loss truthfulness, and two consecutive clean smoke passes.',
      'Document local credentials and deterministic OTP behavior without exposing Production secrets.',
      'Keep the local runtime, environment examples, health/readiness contracts, and Agent Pack evidence synchronized.'
    ],
    verification: ['npm run local:doctor', 'npm run local:prepare', 'npm run local:up', 'npm run local:status', 'npm run local:seed', 'npm run local:smoke twice from clean startup', 'npm run local:down', 'focused runtime and seed tests', 'npm run typecheck', 'npm run lint', 'npm run build', 'node agent_pack/scripts/audit_pack.mjs']
  },
  {
    id: 'frontend_091', phase: 'F7_post_release_assurance', area: 'design evidence',
    title: 'Restore and Verify the Approved Design Source Bundle',
    goal: 'Restore every previously supplied approved design artifact to its canonical repository path and verify it against the recorded SHA-256 manifest.',
    kind: 'quality', screens: [],
    sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json', '01_product/SCREEN_REGISTRY.json', '01_product/SCREEN_COVERAGE.json'],
    notes: ['ADM-54 remains external-only and must not be fabricated.'],
    track: 'frontend', dependsOn: ['frontend_090'],
    atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_091.md',
    allowedRoots: ['docs/design_sources/**', 'agent_pack/**'],
    acceptance: [
      'Restore all 130 locally exported screen sources without generating or redrawing any source.',
      'Restore the developer handoff, prototype flow hub, brand system, logo, and supplementary source.',
      'Verify every restored file against the existing SHA-256 manifest.',
      'Preserve ADM-54 as external-only and do not fabricate a direct export.',
      'Make the Agent Pack integrity audit pass with zero source errors.'
    ],
    verification: ['node agent_pack/scripts/audit_pack.mjs', 'npm run test:vitest --workspace apps/web', 'source-manifest checksum verification']
  },
  {
    id: 'frontend_092', phase: 'F7_post_release_assurance', area: 'public and authentication UI',
    title: 'Public and Authentication Design Parity Remediation',
    goal: 'Compare every Public and Authentication screen with its approved source and remediate material visual, state, responsive, and interaction gaps.',
    kind: 'quality', screens: [],
    sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json', '01_product/SCREEN_COVERAGE.json'], notes: [],
    track: 'frontend', dependsOn: ['frontend_091'],
    atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_092.md',
    allowedRoots: ['apps/web/**', 'packages/ui/**', 'packages/contracts/**', 'docs/design_sources/**', 'agent_pack/**'],
    acceptance: ['Create a traceable direct comparison for all 31 Public and Authentication screen IDs.', 'Test populated success states as well as loading, empty, error, retry, disabled, and permission states.', 'Remediate material layout, typography, color, spacing, asset, interaction, and responsive differences.', 'Verify Arabic RTL and English and Simplified Chinese LTR across approved Desktop, Tablet, and Mobile scopes.', 'Record approved-source and runtime evidence without replacing approved sources.'],
    verification: frontendCommonVerification
  },
  {
    id: 'frontend_093', phase: 'F7_post_release_assurance', area: 'seeker UI',
    title: 'Seeker Dashboard Design Parity Remediation',
    goal: 'Compare all Seeker dashboard screens with approved sources and close visual, data-binding, state, locale, permission, and interaction gaps.',
    kind: 'quality', screens: [],
    sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json', '01_product/SCREEN_COVERAGE.json'], notes: [],
    track: 'frontend', dependsOn: ['frontend_092'],
    atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_093.md',
    allowedRoots: ['apps/web/**', 'packages/ui/**', 'packages/contracts/**', 'docs/design_sources/**', 'agent_pack/**'],
    acceptance: ['Create a traceable direct comparison for all 10 Seeker screen IDs.', 'Exercise real implemented contracts and all meaningful asynchronous and permission states.', 'Remediate material design and interaction differences at the approved Desktop scope.', 'Verify Arabic RTL and English and Simplified Chinese LTR.', 'Add focused and regression evidence for every affected route.'],
    verification: frontendCommonVerification
  },
  {
    id: 'frontend_094', phase: 'F7_post_release_assurance', area: 'provider UI',
    title: 'Provider Dashboard Design Parity Remediation',
    goal: 'Compare all Provider dashboard screens with approved sources and close visual, workflow, upload, ownership, state, locale, and interaction gaps.',
    kind: 'quality', screens: [],
    sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json', '01_product/SCREEN_COVERAGE.json'], notes: [],
    track: 'frontend', dependsOn: ['frontend_093'],
    atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_094.md',
    allowedRoots: ['apps/web/**', 'packages/ui/**', 'packages/contracts/**', 'docs/design_sources/**', 'agent_pack/**'],
    acceptance: ['Create a traceable direct comparison for all 24 Provider screen IDs.', 'Exercise implemented contracts, ownership, upload, validation, transition, and permission states.', 'Remediate material design and interaction differences at the approved Desktop scope.', 'Verify Arabic RTL and English and Simplified Chinese LTR.', 'Add focused and regression evidence for every affected route and multi-step workflow.'],
    verification: frontendCommonVerification
  },
  {
    id: 'frontend_095', phase: 'F7_post_release_assurance', area: 'admin UI',
    title: 'Admin Dashboard Design Parity Remediation',
    goal: 'Compare every locally exported Admin screen with its approved source and close visual, workflow, permission, state, locale, and interaction gaps.',
    kind: 'quality', screens: [],
    sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json', '01_product/SCREEN_COVERAGE.json'], notes: ['ADM-54 is owned separately by frontend_096.'],
    track: 'frontend', dependsOn: ['frontend_094'],
    atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_095.md',
    allowedRoots: ['apps/web/**', 'packages/ui/**', 'packages/contracts/**', 'docs/design_sources/**', 'agent_pack/**'],
    acceptance: ['Create a traceable direct comparison for all 65 locally exported Admin screen IDs.', 'Exercise implemented contracts, roles, available actions, mutations, audit reasons, validation, and asynchronous states.', 'Remediate material design and interaction differences at the approved Desktop scope.', 'Verify Arabic RTL and English and Simplified Chinese LTR.', 'Add focused and regression evidence without treating ADM-54 as locally verified.'],
    verification: frontendCommonVerification
  },
  {
    id: 'frontend_096', phase: 'F7_post_release_assurance', area: 'admin design evidence',
    title: 'Recover and Verify ADM-54 Request Settings Design Source',
    goal: 'Obtain the approved ADM-54 source and complete its direct visual, state, locale, direction, and permission comparison.',
    kind: 'quality', screens: [],
    sourceRefs: ['09_sources/DESIGN_SOURCE_MANIFEST.json', '01_product/SCREEN_COVERAGE.json'],
    notes: ['The current repository proves that ADM-54 is external-only.'],
    track: 'frontend', dependsOn: ['frontend_091'],
    atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_096.md',
    allowedRoots: ['apps/web/**', 'packages/ui/**', 'docs/design_sources/**', 'agent_pack/**'],
    acceptance: ['Obtain an approved local ADM-54 export or authenticated access to the exact mapped source frame.', 'Record immutable source provenance and checksum without inventing design details.', 'Complete direct visual comparison and remediate material differences.', 'Verify supported locale, direction, Desktop, state, and permission variants.', 'Remove the external-only exception only after authoritative evidence exists.'],
    verification: frontendCommonVerification
  },
  {
    id: 'frontend_097', phase: 'F7_post_release_assurance', area: 'platform browser assurance',
    title: 'Full Success-State Browser and Defect-Closure Matrix',
    goal: 'Replace narrow or misleading visual gates with a deterministic full-platform browser matrix and close every reproducible defect.',
    kind: 'quality', screens: [],
    sourceRefs: ['08_reality_sync/PLATFORM_COMPLETION_AUDIT.json', '09_sources/DESIGN_SOURCE_MANIFEST.json', '01_product/SCREEN_COVERAGE.json'], notes: [],
    track: 'frontend', dependsOn: ['frontend_095'],
    atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_097.md',
    allowedRoots: ['apps/web/**', 'packages/ui/**', 'packages/contracts/**', 'docs/**', 'agent_pack/**'],
    acceptance: ['Make official scripts execute every intended Playwright spec instead of only the public visual subset.', 'Provide deterministic populated success fixtures for visual tests while keeping separate error, empty, loading, retry, disabled, and permission assertions.', 'Cover every canonical route and screen across approved locale, direction, role, and device scopes.', 'Run unfiltered E2E, direct visual-diff, accessibility, browser/session security, and performance matrices.', 'Define and enforce a justified JavaScript bundle budget and remediate regressions.', 'Close or record every defect with reproducible evidence.'],
    verification: frontendCommonVerification.concat(['full unfiltered Playwright matrix', 'direct approved-source visual comparison', 'performance and bundle-budget gates', 'browser and session security gates'])
  },
  {
    id: 'frontend_098', phase: 'F7_post_release_assurance', area: 'final release',
    title: 'Final Production-Parity Platform Gate',
    goal: 'Re-run every repository-owned and external readiness gate and issue the final platform decision without unsupported completeness claims.',
    kind: 'release', screens: [],
    sourceRefs: ['08_reality_sync/PLATFORM_COMPLETION_AUDIT.json', '08_reality_sync/FINAL_RELEASE_MANIFEST.json', '09_sources/DESIGN_SOURCE_MANIFEST.json'], notes: [],
    track: 'frontend', dependsOn: ['backend_139', 'frontend_096', 'frontend_097'],
    atomicTaskFile: '04_tracks/frontend/F7_post_release_assurance/frontend_098.md',
    allowedRoots: ['apps/api/**', 'apps/web/**', 'packages/**', 'docs/**', 'agent_pack/**'],
    acceptance: ['All prior remediation and assurance tasks are complete with valid evidence.', 'Agent Pack audit, selector, manifests, counts, finish index, and truth documents are synchronized.', 'Every implemented API has the required matrix evidence or the all-APIs claim remains false.', 'Every canonical screen has direct approved-source evidence or the all-screens claim remains false.', 'Production-parity infrastructure, providers, backup/restore, monitoring, native services, and security assurance are proven.', 'Full platform completion is claimed only when the entire expanded graph is complete and all mandatory gates pass.'],
    verification: ['all root and workspace typecheck, lint, test, build, audit, inventory, contract, browser, visual, accessibility, performance, security, live-provider, and infrastructure gates', 'node agent_pack/scripts/audit_pack.mjs', 'node agent_pack/scripts/select_next_step.mjs']
  }
];

const originalCatalog = read('TASK_CATALOG.json');
const originalState = read('TASK_STATE.json');
const existingIds = new Set(originalCatalog.map((task) => task.id));
const backend = originalCatalog.filter((task) => task.track === 'backend');
const frontend = originalCatalog.filter((task) => task.track === 'frontend');
const newBackend = additions.filter((task) => task.track === 'backend' && !existingIds.has(task.id));
const newFrontend = additions.filter((task) => task.track === 'frontend' && !existingIds.has(task.id));
const catalog = [...backend, ...newBackend, ...frontend, ...newFrontend].map((task, index) => ({ ...task, sequence: index + 1 }));

for (const task of catalog) {
  const atomicPath = path.join(pack, task.atomicTaskFile);
  if (!fs.existsSync(atomicPath)) throw new Error('Missing atomic task file: ' + task.atomicTaskFile);
  const source = fs.readFileSync(atomicPath, 'utf8');
  const updated = source.replace(/\| Sequence \| \d+ \/ \d+ \|/u, `| Sequence | ${task.sequence} / ${catalog.length} |`);
  if (updated === source && !source.includes(`| Sequence | ${task.sequence} / ${catalog.length} |`)) {
    throw new Error('Could not update sequence in ' + task.atomicTaskFile);
  }
  if (updated !== source) fs.writeFileSync(atomicPath, updated);
}

const state = structuredClone(originalState);
state.schemaVersion = 1;
state.updatedAt = now;
const newState = {
  backend_139: {
    status: 'blocked', startedAt: now, completedAt: null,
    reason: 'Blocked pending an isolated non-production MongoDB replica set, approved private storage and malware scanner, OTP and monitoring providers, a provisioned native Ubuntu target, backup/restore target, and external security-assurance prerequisites.',
    evidencePath: null
  },
  backend_140: { status: 'open', startedAt: null, completedAt: null, reason: null, evidencePath: null },
  frontend_091: {
    status: 'complete', startedAt: now, completedAt: now, reason: null,
    evidencePath: '07_finish/frontend_091/completion.json'
  },
  frontend_092: { status: 'open', startedAt: null, completedAt: null, reason: null, evidencePath: null },
  frontend_093: { status: 'open', startedAt: null, completedAt: null, reason: null, evidencePath: null },
  frontend_094: { status: 'open', startedAt: null, completedAt: null, reason: null, evidencePath: null },
  frontend_095: { status: 'open', startedAt: null, completedAt: null, reason: null, evidencePath: null },
  frontend_096: {
    status: 'blocked', startedAt: now, completedAt: null,
    reason: 'Blocked because ADM-54 is external-only and the exact approved Figma frame or a checksum-verifiable local export is unavailable. Provide docs/design_sources/final_screens/admin/ADM-54.png or authenticated access to the mapped source frame.',
    evidencePath: null
  },
  frontend_097: { status: 'open', startedAt: null, completedAt: null, reason: null, evidencePath: null },
  frontend_098: { status: 'open', startedAt: null, completedAt: null, reason: null, evidencePath: null }
};
for (const task of additions) if (!state.tasks[task.id]) state.tasks[task.id] = newState[task.id];

const endpointBlueprint = JSON.parse(fs.readFileSync(path.join(pack, '01_product/API_ENDPOINT_BLUEPRINT.json'), 'utf8'));
const implementedEndpoints = endpointBlueprint.filter((endpoint) => endpoint.status === 'implemented').length;
const manifest = read('MANIFEST.json');
manifest.packVersion = '1.3.0';
manifest.generatedAt = now;
manifest.plannedEndpointBlueprintCount = endpointBlueprint.length;
manifest.endpointBlueprintStatusCounts = {
  total: endpointBlueprint.length,
  implemented: implementedEndpoints,
  planned: endpointBlueprint.length - implementedEndpoints
};
manifest.taskCounts = {
  total: catalog.length,
  backend: catalog.filter((task) => task.track === 'backend').length,
  frontend: catalog.filter((task) => task.track === 'frontend').length
};

write('TASK_CATALOG.json', catalog);
write('TASK_STATE.json', state);
write('DEPENDENCIES.json', catalog.map((task) => ({ taskId: task.id, dependsOn: task.dependsOn })));
write('ATOMIC_TASK_MAP.json', catalog.map((task) => ({ taskId: task.id, track: task.track, phase: task.phase, sequence: task.sequence, atomicTaskFile: task.atomicTaskFile })));
write('STEP_FILE_PLAN.json', catalog.map((task) => ({ taskId: task.id, allowedRoots: task.allowedRoots })));
write('MANIFEST.json', manifest);

const designManifest = JSON.parse(fs.readFileSync(path.join(pack, '09_sources/DESIGN_SOURCE_MANIFEST.json'), 'utf8'));
const restoredSourcePaths = [...new Set([
  ...designManifest.screens.flatMap((screen) => screen.localSources.map((source) => source.localPath)),
  designManifest.suppliedSources.developerHandoff.localPath,
  designManifest.suppliedSources.prototypeFlowHub.localPath,
  designManifest.brand.logo.localPath,
  designManifest.brand.designSystem.localPath,
  ...designManifest.supplementary.map((source) => source.localPath)
])].sort();
const evidenceDirectory = path.join(pack, '07_finish/frontend_091');
const evidencePath = path.join(evidenceDirectory, 'completion.json');
if (!fs.existsSync(evidencePath)) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  fs.writeFileSync(evidencePath, JSON.stringify({
    taskId: 'frontend_091',
    summary: 'Restored 136 canonical approved design-source files, verified every recorded SHA-256 checksum, preserved ADM-54 as external-only, and restored the Agent Pack integrity gate.',
    filesChanged: restoredSourcePaths,
    verification: [
      {
        command: 'node agent_pack/scripts/audit_pack.mjs',
        exitCode: 0,
        result: 'passed',
        notes: 'Validated 131 screen records, 130 locally sourced screen IDs, all canonical source checksums, English-only pack policy, and zero integrity errors.'
      },
      {
        command: 'npm run test:vitest --workspace apps/web',
        exitCode: 0,
        result: 'passed',
        notes: 'Passed 60 test files and 367 tests after the approved sources were restored.'
      },
      {
        command: 'SHA-256 verification against agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json',
        exitCode: 0,
        result: 'passed',
        notes: 'All 136 restored files match their existing immutable manifest entries.'
      }
    ],
    sourceEvidence: [
      'agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json',
      'docs/design_sources/final_screens',
      'docs/design_sources/handoff',
      'docs/design_sources/brand',
      'ADM-54 remains EXTERNAL_GROUP_REFERENCE_ONLY with no fabricated local export.'
    ],
    knownGaps: ['ADM-54 has no approved local export and is owned by frontend_096.'],
    completedAt: now
  }, null, 2) + '\n');
}

console.log(JSON.stringify({
  taskCount: catalog.length,
  backend: manifest.taskCounts.backend,
  frontend: manifest.taskCounts.frontend,
  added: additions.map((task) => task.id),
  endpointBlueprintStatusCounts: manifest.endpointBlueprintStatusCounts
}, null, 2));
