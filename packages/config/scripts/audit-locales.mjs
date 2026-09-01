import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SUPPORTED_LOCALES = Object.freeze(['ar', 'en']);
export const RETIRED_LOCALES = Object.freeze(['zh-CN']);

const TEXT_EXTENSIONS = new Set(['.json', '.mjs', '.ts', '.tsx', '.js', '.jsx', '.md']);
const IGNORED_SEGMENTS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git']);

function repositoryRootFromModule() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

function normalizeRelative(root, absolute) {
  return path.relative(root, absolute).split(path.sep).join('/');
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    if (IGNORED_SEGMENTS.has(entry.name)) continue;
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

function categoryFor(relativePath) {
  if (/locale-migration\.ts$/u.test(relativePath)) return 'MIGRATION_PROVENANCE';
  if (/(^|\/)tests?\//u.test(relativePath) || /(^|\/)__tests__\//u.test(relativePath)) return 'TEST';
  if (/(^|\/)fixtures?\//u.test(relativePath) || /fixture/iu.test(path.basename(relativePath))) return 'FIXTURE';
  return 'ACTIVE';
}

function rootsForScope(root, scope) {
  const backendRoots = [
    'apps/api/src',
    'apps/api/openapi',
    'apps/api/postman',
    'packages/contracts/src'
  ];
  const allRoots = [
    ...backendRoots,
    'apps/api/tests',
    'apps/web/src',
    'apps/web/tests',
    'packages/ui/src'
  ];
  return (scope === 'all' ? allRoots : backendRoots).map((relative) => ({ relative, absolute: path.join(root, relative) }));
}

function findOccurrences(relativePath, source) {
  const lines = source.split(/\r?\n/u);
  const occurrences = [];
  const tokenPattern = /zh-CN|zhCN/gu;
  lines.forEach((line, index) => {
    tokenPattern.lastIndex = 0;
    let match;
    while ((match = tokenPattern.exec(line)) !== null) occurrences.push({ line: index + 1, column: match.index + 1 });
  });
  return occurrences.map((occurrence) => ({ path: relativePath, ...occurrence, category: categoryFor(relativePath) }));
}

export function auditLocales(root = repositoryRootFromModule(), scope = 'backend') {
  if (!['backend', 'all'].includes(scope)) throw new Error('scope must be backend or all');
  const files = rootsForScope(root, scope)
    .flatMap(({ absolute }) => walkFiles(absolute).map((file) => ({ file, path: normalizeRelative(root, file) })))
    .sort((left, right) => left.path.localeCompare(right.path));
  const occurrences = files.flatMap(({ file, path: relativePath }) => findOccurrences(relativePath, fs.readFileSync(file, 'utf8')));
  const active = occurrences.filter(({ category }) => category === 'ACTIVE');
  const deferred = occurrences.filter(({ category }) => category !== 'ACTIVE');
  const byFile = (rows) => Object.values(rows.reduce((result, row) => {
    const item = result[row.path] ?? { path: row.path, category: row.category, occurrences: [] };
    item.occurrences.push({ line: row.line, column: row.column });
    result[row.path] = item;
    return result;
  }, {})).sort((left, right) => left.path.localeCompare(right.path));
  return {
    schemaVersion: 1,
    policy: { supportedLocales: [...SUPPORTED_LOCALES], defaultLocale: 'ar', retiredLocales: [...RETIRED_LOCALES] },
    scope,
    scannedFiles: files.length,
    activeViolationCount: active.length,
    deferredOccurrenceCount: deferred.length,
    activeViolations: byFile(active),
    deferredOccurrences: byFile(deferred),
    status: active.length === 0 ? 'PASS' : 'FAIL'
  };
}

function isEntrypoint() {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && path.resolve(entrypoint) === fileURLToPath(import.meta.url));
}

if (isEntrypoint()) {
  const scopeArgument = process.argv.find((argument) => argument.startsWith('--scope='));
  const scope = scopeArgument?.slice('--scope='.length) || 'backend';
  try {
    const report = auditLocales(undefined, scope);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.status !== 'PASS') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`LOCALE_AUDIT_FAILED ${error instanceof Error ? error.message : 'UNKNOWN'}\n`);
    process.exitCode = 1;
  }
}
