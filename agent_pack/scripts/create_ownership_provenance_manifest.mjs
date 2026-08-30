import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputPath = path.join(root, 'agent_pack', '08_reality_sync', 'PRE_COMMIT_RELEASE_AUDIT_OWNERSHIP_MANIFEST_2026-08-30.json');

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function trackedPaths() {
  return git(['ls-files', '-z']).split('\0').filter(Boolean);
}

function statusByPath() {
  const result = new Map();
  const raw = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  for (const record of raw.split('\0').filter(Boolean)) {
    const code = record.slice(0, 2);
    const file = record.slice(3);
    result.set(file, code);
  }
  return result;
}

function ownerFor(file) {
  if (file.startsWith('apps/api/')) return 'BACKEND_COORDINATOR';
  if (file.startsWith('apps/web/')) return 'FRONTEND_COORDINATOR';
  if (file.startsWith('packages/')) return 'SHARED_COORDINATOR';
  if (file.startsWith('agent_pack/')) return 'AGENT_PACK_COORDINATOR';
  if (file.startsWith('docs/quality/') || file.startsWith('docs/design_sources/')) return 'EVIDENCE_COORDINATOR';
  if (file.startsWith('scripts/') || file === 'package.json' || file === 'package-lock.json' || file === '.gitignore') return 'RELEASE_COORDINATOR';
  return 'REPOSITORY_OWNER';
}

function classificationFor(file) {
  if (file.startsWith('docs/quality/') || file.startsWith('docs/design_sources/') || file.startsWith('agent_pack/')) return 'HISTORICAL';
  if (file.startsWith('apps/') || file.startsWith('packages/') || file.startsWith('scripts/')) return 'USER_OWNED';
  return 'USER_OWNED';
}

function provenanceMap() {
  const map = new Map();
  let current;
  const raw = git(['log', '--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x00', '--name-only', '-z']);
  for (const record of raw.split('\0').filter(Boolean)) {
    if (record.includes('\x1f')) {
      const [commit = '', author = '', email = '', committedAt = '', subject = ''] = record.split('\x1f');
      current = { commit, author, email, committedAt, subject };
    } else if (current !== undefined) {
      const fileName = record.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
      if (fileName !== '' && !map.has(fileName)) map.set(fileName, current);
    }
  }
  return map;
}

function fileRecord(file, statuses, provenance) {
  const absolute = path.join(root, file);
  const stat = statSync(absolute);
  const bytes = readFileSync(absolute);
  return {
    path: file.replaceAll(path.sep, '/'),
    tracked: true,
    ignored: false,
    workingTreeStatus: statuses.get(file) ?? '  ',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: stat.size,
    owner: ownerFor(file),
    classification: classificationFor(file),
    plannedAction: 'PRESERVE_UNTIL_EXPLICIT_TASK_OWNERSHIP',
    provenance: provenance.get(file) ?? {
      commit: '',
      author: '',
      email: '',
      committedAt: '',
      subject: 'UNAVAILABLE_FROM_LOCAL_HISTORY'
    }
  };
}

const statuses = statusByPath();
const provenance = provenanceMap();
const tracked = trackedPaths();
const trackedSet = new Set(tracked);
const files = tracked.map(file => fileRecord(file, statuses, provenance));
const untrackedAtCapture = [...statuses.entries()]
  .filter(([file]) => !trackedSet.has(file))
  .map(([file, status]) => ({
    path: file.replaceAll(path.sep, '/'),
    tracked: false,
    ignored: false,
    workingTreeStatus: status,
    sha256: null,
    bytes: null,
    owner: ownerFor(file),
    classification: 'GENERATED',
    ownership: 'TASK_OWNED',
    plannedAction: 'PRESERVE_AND_REVIEW_IN_NEXT_OWNED_TASK'
  }));
const dirtyPaths = [
  ...files.filter(file => file.workingTreeStatus !== '  ').map(file => file.path),
  ...untrackedAtCapture.map(file => file.path)
];

const manifest = {
  schemaVersion: 2,
  manifestId: 'PRE_COMMIT_RELEASE_AUDIT_OWNERSHIP_MANIFEST_2026-08-30',
  language: 'en',
  createdAt: new Date().toISOString(),
  goal: 'Protected pre-mutation baseline with complete tracked-file ownership and provenance',
  baseline: {
    branch: git(['branch', '--show-current']).trim(),
    head: git(['rev-parse', 'HEAD']).trim(),
    upstream: git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']).trim(),
    divergence: git(['rev-list', '--left-right', '--count', 'HEAD...@{u}']).trim().split(/\s+/u).join(' '),
    workingTreePolicy: 'PROTECTED_POTENTIALLY_DIRTY',
    observedDirtyTrackedOrUntrackedPaths: [...new Set(dirtyPaths)],
    diffCheck: 'PASS'
  },
  coordinator: {
    owner: 'Coordinator',
    writeScopes: ['agent_pack/**'],
    rule: 'No file becomes TASK_OWNED until a later atomic task explicitly records it.'
  },
  protectedScopes: [
    '.env, .env.local, .env.production, and other real secret environment files (never read or hashed)',
    'tracked .env*.example templates may be hashed as ordinary repository files and must never contain secrets',
    '.local/** (never read or hashed)',
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'apps/web/test-results/**',
    'apps/web/playwright-report/**',
    'Mongo data and runtime processes'
  ],
  rules: {
    noNestedSubagents: true,
    noCommitPushDeploy: true,
    noResetRevertStashCleanUndoCheckout: true,
    noDestructiveCleanup: true,
    noHistoryRewrite: true,
    noSnapshotUpdateWithoutDirectCanonicalReview: true,
    noMasksCropsOverlaysHiddenRegionsOrAntiAliasMasks: true,
    externalState: 'local isolated runtime only; no production data or credentials',
    publicRequestReference: 'opaque UUID; never Mongo ObjectId',
    approvedLocales: ['ar', 'en'],
    canonicalFigmaFile: 'Odl1Epn2u6lIEuIMmABT7o'
  },
  summary: {
    trackedFileCount: files.length,
    untrackedAtCaptureCount: untrackedAtCapture.length,
    dirtyTrackedOrUntrackedCount: [...new Set(dirtyPaths)].length,
    ignoredProtectedScopesExcludedFromContentHashing: true,
    nextTask: 'frontend_107'
  },
  untrackedAtCapture,
  files
};

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`OWNERSHIP_MANIFEST_CREATED path=${path.relative(root, outputPath)} files=${files.length} dirty=${dirtyPaths.length}\n`);
