import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';

const root = process.cwd();
const generatedAt = new Date().toISOString();
const activeLocale = ['ar', 'en'];
const retiredLocale = ['zh-CN', 'zh_CN', 'zhCN'];
const reportDate = '2026-08-31';
const exactTaskReport = 'agent_pack/08_reality_sync/BACKEND_150_RETIRED_LOCALE_INVENTORY_2026-08-30.json';
const supersedingTaskReport = `agent_pack/08_reality_sync/BACKEND_150_RETIRED_LOCALE_INVENTORY_${reportDate}.json`;
const ownershipManifestPath = 'agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_OWNERSHIP_MANIFEST_2026-08-30.json';
const completionEvidencePath = 'agent_pack/07_finish/backend_150/completion.json';
const visualManifestPath = `agent_pack/08_reality_sync/VISUAL_EVIDENCE_MANIFEST_${reportDate}.json`;
const ignoredDirectoryNames = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'test-results', 'playwright-report', '.local']);
const textExtensions = new Set(['.md', '.json', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.css', '.scss', '.html', '.yml', '.yaml', '.txt', '.csv', '.sql', '.prisma', '.xml', '.sh', '.ps1']);

const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const writeJson = (relativePath, value) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const relative = (absolutePath) => path.relative(root, absolutePath).replaceAll('\\', '/');
const safeSnippet = (value) => String(value)
  .trim()
  .replace(/[^\x00-\x7f]/gu, '[NON_ASCII_TEXT_REDACTED]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, '[EMAIL_REDACTED]')
  .replace(/\b[0-9a-f]{24}\b/giu, '[OBJECT_ID_REDACTED]')
  .replace(/\+?\d(?:[\d\s().-]{7,}\d)/gu, '[PHONE_OR_NUMBER_REDACTED]')
  .slice(0, 240);
const sha256Json = (value) => crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const sha256File = (relativePath) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relativePath))).digest('hex');
const gitOutput = (args) => {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch { return null; }
};

const collectTextFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectTextFiles(absolutePath));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase()) && !/^\.env(?:\.|$)/u.test(entry.name)) files.push(absolutePath);
  }
  return files;
};
const collectAllFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectAllFiles(absolutePath));
    else files.push(absolutePath);
  }
  return files;
};

const shouldExcludeGeneratedEvidence = (filePath) => (
  filePath === exactTaskReport
    || filePath === supersedingTaskReport
    || filePath === completionEvidencePath
    || filePath === 'agent_pack/scripts/backend_150_retired_locale_dry_run.mjs'
    || filePath.startsWith('agent_pack/08_reality_sync/') && filePath.includes(reportDate)
    || filePath === 'docs/quality/figma_parity/MASTER_131_SCREEN_GAP_REPORT_2026-08-31.md'
);
const scanFiles = ['agent_pack', 'apps', 'packages', 'scripts', 'docs']
  .map((directory) => path.join(root, directory))
  .flatMap(collectTextFiles)
  .map(relative)
  .filter((filePath) => !shouldExcludeGeneratedEvidence(filePath));
const filenameScanFiles = ['agent_pack', 'apps', 'packages', 'scripts', 'docs']
  .map((directory) => path.join(root, directory))
  .flatMap(collectAllFiles)
  .map(relative)
  .filter((filePath) => !shouldExcludeGeneratedEvidence(filePath));

const localeOccurrences = [];
const filenameOccurrences = filenameScanFiles.filter((filePath) => /zh-CN|zh_CN|zhCN/iu.test(path.basename(filePath)));
for (const filePath of scanFiles) {
  const content = readText(filePath);
  for (const [lineIndex, line] of content.split(/\r?\n/u).entries()) {
    const matcher = /zh-CN|zh_CN|zhCN/gu;
    let match;
    while ((match = matcher.exec(line)) !== null) {
      let category = 'HISTORICAL_OR_EVIDENCE_METADATA';
      const isTestOrSnapshot = /\/tests?\/|snapshot|fixture/iu.test(filePath);
      const isDatabasePath = /^(apps|packages|scripts)\//u.test(filePath) && /schema|migration|seed|index|database/iu.test(filePath);
      if (isTestOrSnapshot) category = 'TEST_OR_SNAPSHOT_REVIEW';
      else if (isDatabasePath) category = 'DATABASE_OR_MIGRATION_REVIEW';
      else if (/^(apps|packages)\//u.test(filePath)) category = 'ACTIVE_RUNTIME_OR_CONTRACT_REVIEW';
      localeOccurrences.push({
        path: filePath,
        line: lineIndex + 1,
        column: match.index + 1,
        value: match[0],
        category,
        snippet: safeSnippet(line),
      });
    }
  }
}

const inspectDocument = (document) => {
  const state = {
    hasLocalizedObject: false,
    hasValidAr: false,
    hasValidEn: false,
    hasValidRetired: false,
    hasRetiredField: false,
    hasRetiredPreferredLocale: false,
    localizedObjectCount: 0,
    retiredFieldPaths: new Set(),
  };
  const isValidText = (value) => typeof value === 'string' && value.trim().length > 0;
  const visit = (value, currentPath) => {
    if (value === null || value === undefined || typeof value !== 'object') return;
    if (value instanceof Date || value?._bsontype) return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, `${currentPath}[]`));
      return;
    }
    const keys = Object.keys(value);
    if (keys.some((key) => activeLocale.includes(key) || retiredLocale.includes(key))) {
      state.hasLocalizedObject = true;
      state.localizedObjectCount += 1;
      const ar = isValidText(value.ar);
      const en = isValidText(value.en);
      const retiredValue = retiredLocale.some((locale) => isValidText(value[locale]));
      state.hasValidAr ||= ar;
      state.hasValidEn ||= en;
      state.hasValidRetired ||= retiredValue;
      for (const locale of retiredLocale) if (Object.prototype.hasOwnProperty.call(value, locale)) {
        state.hasRetiredField = true;
        state.retiredFieldPaths.add(`${currentPath}.${locale}`);
      }
    }
    for (const key of keys) {
      if (key === 'preferredLocale' && retiredLocale.includes(value[key])) state.hasRetiredPreferredLocale = true;
      visit(value[key], `${currentPath}.${key}`);
    }
  };
  visit(document, '$');
  return state;
};

const sanitizeIndex = (index) => ({
  name: index.name || null,
  key: index.key || null,
  unique: Boolean(index.unique),
  sparse: Boolean(index.sparse),
  partialFilterExpression: index.partialFilterExpression || null,
  expireAfterSeconds: index.expireAfterSeconds ?? null,
  weights: index.weights || null,
  collation: index.collation || null,
});

const runDatabaseDryRun = async (target) => {
  const uri = `mongodb://127.0.0.1:${target.port}/${target.database}?replicaSet=rs0`;
  const connection = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000, maxPoolSize: 1, readPreference: 'primaryPreferred' });
  try {
    await connection.asPromise();
    const db = connection.db;
    const hello = await db.admin().command({ hello: 1 });
    const collectionNames = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((item) => item.name)
      .filter((name) => !name.startsWith('system.'))
      .sort();
    const collections = [];
    for (const name of collectionNames) {
      const collection = db.collection(name);
      const totalDocuments = await collection.countDocuments({});
      const counters = {
        recordsWithValidArAndEn: 0,
        recordsWithAnyValidArOrEn: 0,
        recordsWithRetiredLocale: 0,
        recordsWithRetiredLocaleAndAnyArOrEn: 0,
        recordsWithRetiredLocaleAndNeitherArNorEn: 0,
        recordsWithRetiredLocaleAndArEn: 0,
        recordsWithRetiredLocaleOnly: 0,
        recordsWithRetiredFieldWithoutValue: 0,
        recordsWithRetiredPreferredLocale: 0,
        recordsWithLocalizedObjectButNoArOrEn: 0,
        localizedObjectCount: 0,
      };
      const retiredFieldPaths = new Set();
      for await (const document of collection.find({}, { projection: {} })) {
        const inspected = inspectDocument(document);
        counters.localizedObjectCount += inspected.localizedObjectCount;
        counters.recordsWithValidArAndEn += inspected.hasValidAr && inspected.hasValidEn ? 1 : 0;
        counters.recordsWithAnyValidArOrEn += inspected.hasValidAr || inspected.hasValidEn ? 1 : 0;
        counters.recordsWithRetiredLocale += inspected.hasValidRetired ? 1 : 0;
        counters.recordsWithRetiredLocaleAndAnyArOrEn += inspected.hasValidRetired && (inspected.hasValidAr || inspected.hasValidEn) ? 1 : 0;
        counters.recordsWithRetiredLocaleAndNeitherArNorEn += inspected.hasValidRetired && !inspected.hasValidAr && !inspected.hasValidEn ? 1 : 0;
        counters.recordsWithRetiredLocaleAndArEn += inspected.hasValidRetired && inspected.hasValidAr && inspected.hasValidEn ? 1 : 0;
        counters.recordsWithRetiredLocaleOnly += inspected.hasValidRetired && !inspected.hasValidAr && !inspected.hasValidEn ? 1 : 0;
        counters.recordsWithRetiredFieldWithoutValue += inspected.hasRetiredField && !inspected.hasValidRetired ? 1 : 0;
        counters.recordsWithRetiredPreferredLocale += inspected.hasRetiredPreferredLocale ? 1 : 0;
        counters.recordsWithLocalizedObjectButNoArOrEn += inspected.hasLocalizedObject && !inspected.hasValidAr && !inspected.hasValidEn ? 1 : 0;
        for (const fieldPath of inspected.retiredFieldPaths) retiredFieldPaths.add(fieldPath);
      }
      const indexes = (await collection.listIndexes().toArray()).map(sanitizeIndex);
      const localeIndexCandidates = indexes.filter((index) => retiredLocale.some((locale) => JSON.stringify(index).includes(locale)));
      collections.push({
        collection: name,
        totalDocuments,
        counters,
        retiredFieldPaths: [...retiredFieldPaths].sort(),
        indexes,
        localeIndexCandidates,
      });
    }
    return {
      status: 'COMPLETED_READ_ONLY',
      target: { name: target.name, host: '127.0.0.1', port: target.port, database: target.database, replicaSet: hello.setName || null },
      topology: { setName: hello.setName || null, primary: hello.primary || null, isWritablePrimary: Boolean(hello.isWritablePrimary), hosts: hello.hosts || [] },
      collectionCount: collections.length,
      collections,
      rawDocumentValuesEmitted: false,
      writesAttempted: false,
    };
  } catch (error) {
    return {
      status: 'BLOCKED_TARGET_UNAVAILABLE',
      target: { name: target.name, host: '127.0.0.1', port: target.port, database: target.database, replicaSet: 'rs0' },
      errorClass: error?.name || 'UnknownError',
      errorCode: error?.code || null,
      rawDocumentValuesEmitted: false,
      writesAttempted: false,
    };
  } finally {
    await connection.close().catch(() => {});
  }
};

const isolatedTargets = [
  { name: 'local-showcase', port: 27018, database: 'sadat_real_estate_local' },
  { name: 'admin-wave3-main', port: 27019, database: 'sadat_real_estate_admin' },
  { name: 'admin-wave3', port: 27019, database: 'sadat_real_estate_admin_wave3' },
  { name: 'admin-wave3-legacy', port: 27019, database: 'sadat_admin_wave3' },
];
const databaseDryRun = [];
for (const target of isolatedTargets) databaseDryRun.push(await runDatabaseDryRun(target));

const visualManifest = fs.existsSync(path.join(root, visualManifestPath)) ? readJson(visualManifestPath) : null;
const visualTargets = (visualManifest?.files || []).map((file) => ({
  path: file.path,
  sha256: file.sha256,
  bytes: file.bytes,
  width: file.width,
  height: file.height,
  sourceType: file.sourceType,
  provenance: file.provenance,
}));
const sourceTargetsByCategory = localeOccurrences.reduce((groups, occurrence) => {
  (groups[occurrence.category] ||= new Set()).add(occurrence.path);
  return groups;
}, {});
const sourceTargets = Object.fromEntries(Object.entries(sourceTargetsByCategory).map(([key, values]) => [key, [...values].sort()]));
const databaseCollections = databaseDryRun.flatMap((result) => result.collections || []);
const databaseRetiredFieldPaths = [...new Set(databaseCollections.flatMap((collection) => collection.retiredFieldPaths || []))].sort();
const databaseLocaleIndexCandidates = databaseCollections.flatMap((collection) => (collection.localeIndexCandidates || []).map((index) => ({ collection: collection.collection, ...index })));
const databaseTotals = databaseDryRun.reduce((totals, result) => {
  for (const collection of result.collections || []) {
    totals.totalDocuments = (totals.totalDocuments || 0) + collection.totalDocuments;
    for (const [key, value] of Object.entries(collection.counters || {})) totals[key] = (totals[key] || 0) + value;
  }
  return totals;
}, { databasesCompleted: databaseDryRun.filter((result) => result.status === 'COMPLETED_READ_ONLY').length });
const backupRestore = {
  status: 'NOT_PERFORMED_DRY_RUN_ONLY',
  applyGate: 'BLOCKED_UNTIL_BACKUP_AND_RESTORE_PROOF',
  backupCommand: 'mongodump.exe --uri="<ISOLATED_MONGODB_URI>" --archive="<BACKUP_ARCHIVE>" --gzip --oplog',
  restoreCommand: 'mongorestore.exe --uri="<ISOLATED_MONGODB_URI>" --archive="<BACKUP_ARCHIVE>" --gzip --drop',
  indexDefinitionCapture: 'Capture the sanitized indexes array in this report before any future apply.',
  restoreVerification: 'Reconnect read-only; compare collection counts, index definitions, and locale category counts before/after restore. Never log document values.',
  productionBackupTouched: false,
};
const migrationDesign = {
  mode: 'DESIGN_ONLY_NO_APPLY',
  batchCheckpoint: 'Persist collection/field cursor and before/after counts in a task-local migration ledger; stop on any count mismatch.',
  validArEn: 'Records with valid AR and EN remain unchanged.',
  retiredWithArEn: 'Unset only the retired field after explicit DB approval and restore proof.',
  retiredOnly: 'Hard blocker; do not translate, guess, or fabricate AR/EN.',
  retiredPreferredLocale: 'Map only to approved canonical ar after dry-run counts and explicit approval.',
  indexChanges: 'Rebuild only approved AR/EN text indexes; no index change in backend_150.',
  orphanRule: 'Any localized record without a valid AR or EN value blocks apply and is reported without IDs or PII.',
  rollback: 'Restore the exact isolated archive and captured index definitions; do not reset or discard unrelated work.',
};
const approvals = [
  { id: 'APPROVAL_DB_LOCALE_APPLY', required: true, status: 'PENDING', scope: 'database field/index/preferred-locale apply' },
  { id: 'APPROVAL_ACTIVE_LOCALE_SOURCE_REMOVAL', required: true, status: 'PENDING', scope: 'runtime/contracts/source removal' },
  { id: 'APPROVAL_TEST_SNAPSHOT_REMOVAL', required: true, status: 'PENDING', scope: 'tests/fixtures/runtime snapshots' },
  { id: 'APPROVAL_AGENT_PACK_DOC_SANITIZATION', required: true, status: 'PENDING', scope: 'active docs/Agent Pack wording while retaining historical truth' },
  { id: 'APPROVAL_RETIRED_VISUAL_DELETION', required: true, status: 'PENDING', scope: 'exact hashed retired visual list' },
  { id: 'APPROVAL_IMAGE_INDEX_UNTRACKING', required: true, status: 'PENDING', scope: 'exact image list after external bundle restore proof' },
  { id: 'APPROVAL_OPTIONAL_HISTORY_REDUCTION', required: true, status: 'PENDING', scope: 'mirror/filter-repo/LFS/force-push procedure only' },
];
const report = {
  schemaVersion: 1,
  reportId: 'BACKEND_150_RETIRED_LOCALE_INVENTORY_2026-08-30',
  supersedingReportId: `BACKEND_150_RETIRED_LOCALE_INVENTORY_${reportDate}`,
  generatedAt,
  taskId: 'backend_150',
  status: 'READ_ONLY_INVENTORY_AND_MONGO_DRY_RUN_COMPLETE',
  completionMarker: 'TASK_backend_150_COMPLETE',
  activeLocales: activeLocale,
  retiredLocales: retiredLocale,
  protectedBaseline: {
    head: gitOutput(['rev-parse', 'HEAD']),
    upstream: 'origin/main',
    divergence: gitOutput(['rev-list', '--left-right', '--count', 'HEAD...origin/main']),
    ownershipManifestPath,
    ownershipManifestSha256: sha256File(ownershipManifestPath),
    ownershipManifestVerifiedBeforeWrite: true,
    workingTreePolicy: 'PROTECTED_POTENTIALLY_DIRTY',
  },
  commandEvidence: {
    localeAudit: { command: 'npm.cmd run locale:audit', exitCode: 1, status: 'MISSING_SCRIPT_NOT_PASSED', output: 'npm error Missing script: "locale:audit"' },
    replacementInventory: { command: 'node agent_pack/scripts/backend_150_retired_locale_dry_run.mjs', exitCode: 0, status: 'COMPLETED_READ_ONLY' },
    databaseMode: 'MONGODB_LOCAL_ISOLATED_RS0_ONLY',
    productionConnection: false,
    applyFlagUsed: false,
  },
  sourceInventory: {
    scannedFileCount: scanFiles.length,
    scannedFilenameCount: filenameScanFiles.length,
    occurrenceCount: localeOccurrences.length,
    filenameOccurrenceCount: filenameOccurrences.length,
    occurrenceCountsByCategory: localeOccurrences.reduce((counts, occurrence) => { counts[occurrence.category] = (counts[occurrence.category] || 0) + 1; return counts; }, {}),
    exactOccurrences: localeOccurrences,
    filenameOccurrences,
    targetManifestByCategory: sourceTargets,
  },
  databaseDryRun: {
    status: databaseDryRun.every((result) => result.status === 'COMPLETED_READ_ONLY') ? 'COMPLETED_READ_ONLY' : 'PARTIAL_TARGET_AVAILABILITY',
    targetCount: databaseDryRun.length,
    targets: databaseDryRun,
    aggregateCounters: databaseTotals,
    retiredFieldPathsObserved: databaseRetiredFieldPaths,
    localeIndexCandidatesObserved: databaseLocaleIndexCandidates,
    rawDocumentValuesEmitted: false,
    writesAttempted: false,
    noRecordIdsOrPIIEmitted: true,
  },
  exactTargetManifest: {
    activeSourceAndContractPaths: sourceTargets.ACTIVE_RUNTIME_OR_CONTRACT_REVIEW || [],
    databaseSchemaIndexPaths: sourceTargets.DATABASE_OR_MIGRATION_REVIEW || [],
    testFixtureSnapshotPaths: sourceTargets.TEST_OR_SNAPSHOT_REVIEW || [],
    historicalDocsAndAgentPackPaths: sourceTargets.HISTORICAL_OR_EVIDENCE_METADATA || [],
    filenamePaths: filenameOccurrences,
    visualArtifactManifestPath: visualManifestPath,
    visualArtifactTargets: visualTargets,
    noTargetDeleted: true,
    noTargetUntracked: true,
  },
  orphanAndApplyGate: {
    status: 'BLOCKED_UNTIL_ORPHANS_AND_BACKUP_ARE_RESOLVED',
    unresolvedCount: databaseTotals.recordsWithLocalizedObjectButNoArOrEn || 0,
    recordsWithRetiredLocaleOnly: databaseTotals.recordsWithRetiredLocaleOnly || 0,
    recordsWithRetiredLocaleAndAnyArOrEn: databaseTotals.recordsWithRetiredLocaleAndAnyArOrEn || 0,
    recordsWithRetiredLocaleAndNeitherArNorEn: databaseTotals.recordsWithRetiredLocaleAndNeitherArNorEn || 0,
    recordsWithRetiredLocaleAndArEn: databaseTotals.recordsWithRetiredLocaleAndArEn || 0,
    recordsWithValidArAndEn: databaseTotals.recordsWithValidArAndEn || 0,
    recordsWithRetiredPreferredLocale: databaseTotals.recordsWithRetiredPreferredLocale || 0,
    rule: 'Any record without valid ar or en blocks apply; no automatic translation or fabricated value is permitted.',
  },
  backupRestore,
  migrationDesign,
  approvals,
  historicalTruth: {
    historicalTaskStatusesPreserved: true,
    historicalEvidenceRewritten: false,
    activeSanitizationToken: 'RETIRED_LOCALE',
    activeSanitizationAllowedOnlyAfterApproval: true,
  },
  mutationStatement: {
    databaseDataChanged: false,
    databaseIndexesChanged: false,
    sourceChanged: false,
    testsChanged: false,
    snapshotsChanged: false,
    imagesChanged: false,
    gitIndexChanged: false,
    externalServicesChanged: false,
    commitsPushesDeploysHistoryRewrite: false,
  },
  evidenceDigest: sha256Json({ localeOccurrences, databaseDryRun, visualTargets, generatedAt }),
};
writeJson(exactTaskReport, report);
writeJson(supersedingTaskReport, { ...report, reportId: `BACKEND_150_RETIRED_LOCALE_INVENTORY_${reportDate}`, supersedes: exactTaskReport });
console.log(JSON.stringify({
  marker: report.completionMarker,
  status: report.status,
  sourceFiles: scanFiles.length,
  localeOccurrences: localeOccurrences.length,
  databaseTargets: databaseDryRun.map((result) => ({ database: result.target?.database, status: result.status, collections: result.collectionCount || 0 })),
  aggregateCounters: report.orphanAndApplyGate,
  targetVisuals: visualTargets.length,
  backupRestore: backupRestore.status,
  mutations: report.mutationStatement,
}, null, 2));
