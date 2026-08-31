import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const generatedAt = new Date().toISOString();
const reportPath = 'agent_pack/08_reality_sync/FRONTEND_112_VISUAL_ARTIFACT_INVENTORY_2026-08-30.json';
const existingManifestPath = 'agent_pack/08_reality_sync/VISUAL_EVIDENCE_MANIFEST_2026-08-31.json';
const ownershipManifestPath = 'agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_OWNERSHIP_MANIFEST_2026-08-30.json';
const expectedCounts = {
  'docs/design_sources/final_screens': 135,
  'docs/quality': 1182,
};
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp', '.tif', '.tiff']);
const fontExtensions = new Set(['.woff', '.woff2', '.ttf', '.otf', '.eot']);
const ignoredDirectoryNames = new Set([
  '.git',
  '.local',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'test-results',
  'playwright-report',
  '.next',
  'out',
]);
const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.jsx', '.mjs', '.md', '.scss',
  '.sql', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml',
]);

const absolute = (relativePath) => path.join(root, relativePath);
const relative = (absolutePath) => path.relative(root, absolutePath).replaceAll('\\', '/');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
const sha256Buffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const sha256File = (relativePath) => sha256Buffer(fs.readFileSync(absolute(relativePath)));
const isImage = (filePath) => imageExtensions.has(path.extname(filePath).toLowerCase());
const isTargetPath = (filePath) => Object.keys(expectedCounts).some((targetRoot) => filePath === targetRoot || filePath.startsWith(`${targetRoot}/`));

const walkFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(absolutePath));
    else output.push(absolutePath);
  }
  return output;
};

const parsePngDimensions = (buffer) => {
  if (buffer.length < 24 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), method: 'PNG_IHDR' };
};

const parseGifDimensions = (buffer) => {
  if (buffer.length < 10 || !['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), method: 'GIF_HEADER' };
};

const parseJpegDimensions = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame && offset + 7 < buffer.length) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3), method: 'JPEG_SOF' };
    }
    offset += segmentLength;
  }
  return null;
};

const parseWebpDimensions = (buffer) => {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    const width = 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16);
    const height = 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16);
    return { width, height, method: 'WEBP_VP8X' };
  }
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer[21] | (buffer[22] << 8) | (buffer[23] << 16) | (buffer[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, method: 'WEBP_VP8L' };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    const startCodeOffset = 23;
    if (buffer[startCodeOffset] === 0x9d && buffer[startCodeOffset + 1] === 0x01 && buffer[startCodeOffset + 2] === 0x2a) {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, method: 'WEBP_VP8' };
    }
  }
  return null;
};

const dimensionsFor = (buffer, extension) => {
  const normalized = extension.toLowerCase();
  if (normalized === '.png') return parsePngDimensions(buffer);
  if (normalized === '.gif') return parseGifDimensions(buffer);
  if (normalized === '.jpg' || normalized === '.jpeg') return parseJpegDimensions(buffer);
  if (normalized === '.webp') return parseWebpDimensions(buffer);
  return null;
};

const runGit = (args, input) => {
  try {
    return { exitCode: 0, stdout: execFileSync('git', args, { cwd: root, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }) };
  } catch (error) {
    return { exitCode: typeof error.status === 'number' ? error.status : 1, stdout: String(error.stdout || '') };
  }
};

const sourceFiles = [absolute('apps'), absolute('packages'), absolute('scripts')]
  .flatMap(walkFiles)
  .filter((filePath) => textExtensions.has(path.extname(filePath).toLowerCase()) && !/^\.env(?:\.|$)/u.test(path.basename(filePath)));

const allRepositoryFiles = walkFiles(root).map(relative);
const allRepositoryImagePaths = allRepositoryFiles.filter((filePath) => isImage(filePath));
const targetFilesByRoot = {};
for (const targetRoot of Object.keys(expectedCounts)) {
  targetFilesByRoot[targetRoot] = walkFiles(absolute(targetRoot))
    .map(relative)
    .filter(isImage)
    .sort((left, right) => left.localeCompare(right));
}
const targetPaths = Object.values(targetFilesByRoot).flat();
const targetPathSet = new Set(targetPaths);
const sourceTextByFile = new Map();
for (const sourceFile of sourceFiles) {
  try {
    sourceTextByFile.set(relative(sourceFile), fs.readFileSync(sourceFile, 'utf8'));
  } catch {
    sourceTextByFile.set(relative(sourceFile), '');
  }
}

const existingManifest = fs.existsSync(absolute(existingManifestPath)) ? readJson(existingManifestPath) : null;
const existingEntries = new Map((existingManifest?.files || []).map((entry) => [entry.path, entry]));
const trackedPaths = new Set(runGit(['ls-files', '--cached']).stdout.split(/\r?\n/u).filter(Boolean));
const statusLines = runGit(['status', '--porcelain=v1', '--untracked-files=all']).stdout.split(/\r?\n/u).filter(Boolean);
const statusByPath = new Map(statusLines.map((line) => [line.slice(3), line.slice(0, 2)]));
const ignoredResult = runGit(['check-ignore', '--no-index', '--stdin'], `${targetPaths.join('\n')}\n`);
const ignoredPaths = new Set(ignoredResult.stdout.split(/\r?\n/u).filter(Boolean));

const referenceByPath = new Map(targetPaths.map((targetPath) => [targetPath, { exact: [], basename: [] }]));
const targetPathsByBasename = new Map();
for (const targetPath of targetPaths) {
  const basename = path.basename(targetPath);
  if (!targetPathsByBasename.has(basename)) targetPathsByBasename.set(basename, []);
  targetPathsByBasename.get(basename).push(targetPath);
}
const classifyReference = (sourcePath) => {
  if (sourcePath.startsWith('apps/') && sourcePath.includes('/tests/')) return 'REGRESSION_OR_CI_EVIDENCE_REFERENCE';
  if (sourcePath.startsWith('scripts/') && /(?:analy[sz]e|compare|crop|generate|measure|visual)/iu.test(path.basename(sourcePath))) return 'CANONICAL_PARITY_EVIDENCE_TOOL_REFERENCE';
  if (sourcePath.startsWith('apps/') && sourcePath.includes('/src/')) return 'UNEXPECTED_PRODUCT_RUNTIME_REFERENCE';
  if (sourcePath.startsWith('packages/')) return 'UNEXPECTED_PRODUCT_RUNTIME_REFERENCE';
  return 'UNCLASSIFIED_REFERENCE_REQUIRES_REVIEW';
};
for (const [sourcePath, content] of sourceTextByFile) {
  for (const targetPath of targetPaths) {
    if (content.includes(targetPath) || content.includes(targetPath.replaceAll('/', '\\'))) referenceByPath.get(targetPath).exact.push(sourcePath);
  }
  for (const [basename, pathsForBasename] of targetPathsByBasename) {
    if (!content.includes(basename)) continue;
    for (const targetPath of pathsForBasename) referenceByPath.get(targetPath).basename.push(sourcePath);
  }
}

const targetRecords = targetPaths.map((targetPath) => {
  const buffer = fs.readFileSync(absolute(targetPath));
  const extension = path.extname(targetPath).toLowerCase();
  const dimension = dimensionsFor(buffer, extension);
  const targetRoot = Object.keys(expectedCounts).find((candidate) => targetPath === candidate || targetPath.startsWith(`${candidate}/`));
  const category = targetRoot === 'docs/design_sources/final_screens' ? 'DESIGN_SOURCE_FINAL_SCREEN' : 'QUALITY_EVIDENCE';
  const existing = existingEntries.get(targetPath) || null;
  const evidenceType = existing?.sourceType || 'UNRESOLVED';
  const typeUpper = String(evidenceType).toUpperCase();
  const provenance = existing?.provenance || null;
  const hasExistingProvenance = Boolean(existing && evidenceType !== 'UNRESOLVED' && provenance);
  const references = referenceByPath.get(targetPath);
  const exactReferences = [...new Set(references.exact)].sort();
  const basenameReferences = [...new Set(references.basename)].filter((sourcePath) => !exactReferences.includes(sourcePath)).sort();
  const allReferences = [...exactReferences, ...basenameReferences];
  const referenceClasses = [...new Set(allReferences.map(classifyReference))].sort();
  const hasUnexpectedProductRuntimeReference = referenceClasses.includes('UNEXPECTED_PRODUCT_RUNTIME_REFERENCE');
  const evidenceNeeds = hasExistingProvenance ? {
    runtime: typeUpper === 'RUNTIME_ASSET' || typeUpper === 'RUNTIME_EVIDENCE',
    ci: typeUpper.includes('CI'),
    regression: typeUpper.includes('REGRESSION') || typeUpper.includes('SNAPSHOT') || typeUpper.includes('DIFF'),
    canonicalParity: category === 'DESIGN_SOURCE_FINAL_SCREEN' || typeUpper.includes('FIGMA') || typeUpper.includes('PARITY'),
    historical: typeUpper.includes('HISTORICAL') || typeUpper.includes('OWNER_BASELINE'),
    unresolved: false,
  } : {
    runtime: 'UNRESOLVED',
    ci: 'UNRESOLVED',
    regression: 'UNRESOLVED',
    canonicalParity: 'UNRESOLVED',
    historical: 'UNRESOLVED',
    unresolved: true,
  };
  return {
    path: targetPath,
    extension,
    sha256: sha256Buffer(buffer),
    bytes: buffer.length,
    width: dimension?.width ?? null,
    height: dimension?.height ?? null,
    dimensionMethod: dimension?.method || 'UNRESOLVED_UNSUPPORTED_OR_INVALID_IMAGE',
    targetCategory: category,
    sourceEvidenceType: evidenceType,
    canonicalFigmaFileKey: existing?.figmaFileKey || null,
    canonicalFigmaNodeId: existing?.nodeId || null,
    screenId: existing?.screenId || null,
    capturedAt: existing?.capturedAt || 'UNRESOLVED_NOT_RECORDED',
    provenanceClassification: hasExistingProvenance ? 'EXISTING_MANIFEST_PROVENANCE' : 'UNRESOLVED_MISSING_EXISTING_PROVENANCE',
    provenance: provenance || 'UNRESOLVED_DO_NOT_INFER',
    tracked: trackedPaths.has(targetPath),
    ignored: ignoredPaths.has(targetPath),
    gitStatus: statusByPath.get(targetPath) || 'clean',
    plannedFutureAction: 'PRESERVE_NOW_EXTERNAL_BUNDLE_RESTORE_PROOF_THEN_SEPARATE_APPROVED_IMAGE_ONLY_UNTRACKING',
    requiredEvidence: evidenceNeeds,
    runtimeDependencySafety: {
      exactPathReferences: exactReferences,
      basenameOnlyReferences: basenameReferences,
      referenceClasses,
      status: hasUnexpectedProductRuntimeReference ? 'BLOCKED_UNEXPECTED_PRODUCT_RUNTIME_REFERENCE' : (allReferences.length ? 'EXPECTED_EVIDENCE_REFERENCE_ONLY' : 'NO_TEXT_REFERENCE_FOUND'),
    },
  };
});

const targetManifestForHash = targetRecords.map((record) => ({
  path: record.path,
  extension: record.extension,
  sha256: record.sha256,
  bytes: record.bytes,
  width: record.width,
  height: record.height,
  targetCategory: record.targetCategory,
  sourceEvidenceType: record.sourceEvidenceType,
  canonicalFigmaFileKey: record.canonicalFigmaFileKey,
  canonicalFigmaNodeId: record.canonicalFigmaNodeId,
  screenId: record.screenId,
  capturedAt: record.capturedAt,
  provenanceClassification: record.provenanceClassification,
  provenance: record.provenance,
  tracked: record.tracked,
  ignored: record.ignored,
  plannedFutureAction: record.plannedFutureAction,
  requiredEvidence: record.requiredEvidence,
}));
const wholeManifestSha256 = sha256Buffer(Buffer.from(JSON.stringify(targetManifestForHash), 'utf8'));

const outsideTargetImagePaths = allRepositoryImagePaths.filter((filePath) => !targetPathSet.has(filePath)).sort();
const knownDesignExclusions = [
  { path: 'docs/design_sources/brand/brand-design-system.png', classification: 'BRAND_ASSET' },
  { path: 'docs/design_sources/brand/sadat-real-estate-logo.png', classification: 'BRAND_ASSET' },
  { path: 'docs/design_sources/recovery_candidates/public/PUB-01.recovered-incomplete.sha256-1a742ce1.png', classification: 'RECOVERY_CANDIDATE_NOT_FINAL_SOURCE' },
].map((entry) => ({
  ...entry,
  exists: fs.existsSync(absolute(entry.path)),
  bytes: fs.existsSync(absolute(entry.path)) ? fs.statSync(absolute(entry.path)).size : null,
  plannedAction: 'EXCLUDE_FROM_FRONTEND_112_TARGET_AND_ANY_FUTURE_IMAGE_ONLY_UNTRACKING_LIST',
}));
const excludedImageRecords = outsideTargetImagePaths.map((filePath) => {
  const lower = filePath.toLowerCase();
  let reason = 'OUTSIDE_APPROVED_DOCUMENTATION_SCOPES';
  if (filePath.includes('/__snapshots__/') || filePath.includes('/test-artifacts/')) reason = 'RUNTIME_SNAPSHOT_OR_TEST_ARTIFACT_OUTSIDE_APPROVED_DOCUMENTATION_SCOPE';
  else if (filePath.startsWith('apps/') || filePath.startsWith('packages/')) reason = 'PRODUCT_RUNTIME_OR_CANONICAL_APPLICATION_ASSET';
  else if (lower.includes('/upload') || lower.includes('/storage/') || lower.includes('/media/')) reason = 'UPLOADED_OR_STORAGE_ASSET';
  else if (lower.includes('logo') || lower.includes('favicon') || lower.includes('icon')) reason = 'BRAND_LOGO_OR_FAVICON_ASSET';
  return { path: filePath, extension: path.extname(filePath).toLowerCase(), bytes: fs.statSync(absolute(filePath)).size, reason };
});
const allRepositoryFontPaths = allRepositoryFiles.filter((filePath) => fontExtensions.has(path.extname(filePath).toLowerCase()));
const excludedByDirectoryPolicy = [...ignoredDirectoryNames].map((directoryName) => ({
  directoryName,
  present: allRepositoryFiles.some((filePath) => filePath.split('/').includes(directoryName)),
  contentScanned: false,
  reason: 'EXCLUDED_BY_BOUNDED_INVENTORY_TRAVERSAL_POLICY',
}));

const countBy = (records, key) => records.reduce((counts, record) => {
  const value = record[key];
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});
const rootSummaries = Object.fromEntries(Object.entries(targetFilesByRoot).map(([targetRoot, paths]) => {
  const records = targetRecords.filter((record) => record.path === targetRoot || record.path.startsWith(`${targetRoot}/`));
  return [targetRoot, {
    expectedCount: expectedCounts[targetRoot],
    actualCount: paths.length,
    bytes: records.reduce((total, record) => total + record.bytes, 0),
    extensions: countBy(records, 'extension'),
  }];
}));
const duplicatePaths = targetPaths.length - new Set(targetPaths).size;
const missingHashes = targetRecords.filter((record) => !/^[0-9a-f]{64}$/u.test(record.sha256)).length;
const missingDimensions = targetRecords.filter((record) => !Number.isInteger(record.width) || record.width < 1 || !Number.isInteger(record.height) || record.height < 1).length;
const missingProvenance = targetRecords.filter((record) => record.provenanceClassification.startsWith('UNRESOLVED')).length;
const forbiddenFigmaReferences = targetRecords.filter((record) => record.canonicalFigmaFileKey === '0HBdTNGROmmpC6S7OYa3iJ').length;
const exactRuntimeReferences = targetRecords.filter((record) => record.runtimeDependencySafety.referenceClasses.includes('UNEXPECTED_PRODUCT_RUNTIME_REFERENCE')).length;
const evidenceReferences = targetRecords.filter((record) => record.runtimeDependencySafety.referenceClasses.some((referenceClass) => referenceClass.endsWith('EVIDENCE_REFERENCE') || referenceClass === 'CANONICAL_PARITY_EVIDENCE_TOOL_REFERENCE')).length;
const targetCountBlockers = Object.entries(rootSummaries)
  .filter(([, summary]) => summary.actualCount !== summary.expectedCount)
  .map(([targetRoot, summary]) => `${targetRoot}: expected ${summary.expectedCount}, found ${summary.actualCount}`);
const verificationBlockers = [
  ...targetCountBlockers,
  ...(targetRecords.length !== 1317 ? [`combined target count: expected 1317, found ${targetRecords.length}`] : []),
  ...(missingHashes ? [`missing/invalid hashes: ${missingHashes}`] : []),
  ...(missingDimensions ? [`missing/invalid dimensions: ${missingDimensions}`] : []),
  ...(missingProvenance ? [`unresolved provenance: ${missingProvenance}`] : []),
  ...(duplicatePaths ? [`duplicate paths: ${duplicatePaths}`] : []),
  ...(forbiddenFigmaReferences ? [`forbidden Figma references: ${forbiddenFigmaReferences}`] : []),
  ...(knownDesignExclusions.some((entry) => !entry.exists) ? ['known design exclusions are missing'] : []),
  ...(exactRuntimeReferences ? [`unexpected product runtime references require review: ${exactRuntimeReferences}`] : []),
];

const gitStatus = runGit(['status', '--short']);
const gitDivergence = runGit(['rev-list', '--left-right', '--count', 'HEAD...origin/main']);
const gitHead = runGit(['rev-parse', 'HEAD']);
const gitDiffCheck = runGit(['diff', '--check']);
const report = {
  schemaVersion: 1,
  reportId: 'FRONTEND_112_VISUAL_ARTIFACT_INVENTORY_2026-08-30',
  generatedAt,
  taskId: 'frontend_112',
  status: verificationBlockers.length ? 'BLOCKED_VERIFICATION' : 'READ_ONLY_VISUAL_ARTIFACT_INVENTORY_COMPLETE',
  completionMarker: verificationBlockers.length ? 'TASK_frontend_112_BLOCKED_VERIFICATION' : 'TASK_frontend_112_COMPLETE',
  protectedBaseline: {
    branch: 'main',
    head: gitHead.stdout.trim(),
    upstream: 'origin/main',
    divergence: gitDivergence.stdout.trim(),
    workingTreePolicy: 'PROTECTED_POTENTIALLY_DIRTY',
    ownershipManifestPath,
    ownershipManifestSha256: fs.existsSync(absolute(ownershipManifestPath)) ? sha256File(ownershipManifestPath) : null,
    ownershipManifestReadBeforeReportWrite: true,
    gitStatusObserved: gitStatus.stdout,
  },
  approvedScope: {
    targetRoots: Object.keys(expectedCounts),
    expectedCounts,
    actualCounts: Object.fromEntries(Object.entries(rootSummaries).map(([key, value]) => [key, value.actualCount])),
    combinedExpectedCount: 1317,
    combinedActualCount: targetRecords.length,
    rootSummaries,
    totalBytes: targetRecords.reduce((total, record) => total + record.bytes, 0),
    totalMiB: Number((targetRecords.reduce((total, record) => total + record.bytes, 0) / (1024 * 1024)).toFixed(3)),
    extensionCounts: countBy(targetRecords, 'extension'),
  },
  targetManifest: {
    ordering: 'repository-relative UTF-8 lexical path order',
    wholeManifestSha256,
    duplicatePathCount: duplicatePaths,
    missingHashCount: missingHashes,
    missingDimensionCount: missingDimensions,
    unresolvedProvenanceCount: missingProvenance,
    forbiddenFigmaReferenceCount: forbiddenFigmaReferences,
    files: targetRecords,
  },
  exclusionLedger: {
    knownDesignSourceExclusions: {
      expectedCount: 3,
      actualCount: knownDesignExclusions.filter((entry) => entry.exists).length,
      taxonomyNote: 'Two files are brand assets; the third is an explicitly excluded recovery candidate, not a fabricated brand classification.',
      entries: knownDesignExclusions,
    },
    allImagesOutsideApprovedScopes: {
      count: excludedImageRecords.length,
      entries: excludedImageRecords,
      targetListMembership: 'none of these paths is in the 1317 target list',
    },
    productRuntimeImages: excludedImageRecords.filter((entry) => entry.reason === 'PRODUCT_RUNTIME_OR_CANONICAL_APPLICATION_ASSET').length,
    snapshotsOutsideApprovedScope: excludedImageRecords.filter((entry) => entry.reason.includes('SNAPSHOT')).length,
    logosFaviconsAndIcons: excludedImageRecords.filter((entry) => entry.reason === 'BRAND_LOGO_OR_FAVICON_ASSET').length,
    uploadedOrStorageImages: excludedImageRecords.filter((entry) => entry.reason === 'UPLOADED_OR_STORAGE_ASSET').length,
    fontsOutsideImageScope: { count: allRepositoryFontPaths.length, paths: allRepositoryFontPaths.sort() },
    mongoData: { count: 0, scanned: false, reason: 'external database state is outside this filesystem image inventory' },
    buildOutputAndSecretDirectories: {
      entries: excludedByDirectoryPolicy,
      secretsRead: false,
      secretValuesHashed: false,
    },
  },
  runtimeDependencySafety: {
    scannedRoots: ['apps', 'packages', 'scripts'],
    scannedTextFileCount: sourceTextByFile.size,
    exactPathReferenceCount: exactRuntimeReferences,
    evidenceReferenceTargetCount: evidenceReferences,
    status: exactRuntimeReferences ? 'BLOCKED_UNEXPECTED_PRODUCT_RUNTIME_REFERENCE' : (evidenceReferences ? 'SAFE_EXPECTED_TEST_AND_PARITY_REFERENCES_ONLY' : 'SAFE_NO_TEXT_REFERENCES_FOUND'),
    rule: 'Product source references block future untracking; test/CI and parity-tool references are expected evidence dependencies and remain subject to external restore proof.',
  },
  externalArtifactBundleDesign: {
    designOnly: true,
    bundleId: 'visual-evidence-frontend-112-2026-08-31-01',
    schemaVersion: 1,
    creationTimestamp: generatedAt,
    sourceCommit: gitHead.stdout.trim(),
    sortedTargetManifestSha256: wholeManifestSha256,
    encryptedArchiveName: 'sadat-real-estate-visual-evidence-frontend-112-2026-08-31-01.tar.zst.age',
    artifactService: 'UNVERIFIED_READ_ONLY_HOSTINGER_VPS_STORAGE_BOUNDARY',
    publicationStatus: 'NOT_CREATED_NOT_UPLOADED_IN_THIS_TASK',
    storageBoundary: {
      dataRoot: 'EXTERNAL_OWNER_APPROVED_ROOT_REQUIRED',
      serviceUser: 'EXTERNAL_OWNER_APPROVED_SYSTEM_USER_REQUIRED',
      readOnlyRestoreToken: 'MUST_BE_IN_EXTERNAL_SECRET_STORE; NEVER_IN_GIT_OR_AGENT_PACK',
      hostingerAssumption: 'UNVERIFIED_UNTIL_SEPARATE_APPROVAL_AND_RESTORE_DRILL',
    },
    backupRestoreProofRequired: [
      'Create encrypted archive outside Git and record immutable bundle ID.',
      'Restore into an isolated disposable directory and verify whole-manifest SHA-256.',
      'Verify every file SHA-256, byte count, and width/height against this ledger.',
      'Repeat restore from Hostinger backup and record the same verification result.',
      'Run fresh-clone and CI hydration proof before any image-only untracking approval.',
    ],
    restoreCommand: 'npm.cmd run visual-evidence:restore -- --version <bundleVersion>',
    verifyCommand: 'npm.cmd run visual-evidence:verify -- --version <bundleVersion>',
    inventoryCommand: 'npm.cmd run visual-evidence:inventory',
    failClosedRules: [
      'Missing bundle or missing version stops the canonical parity lane.',
      'Corrupt archive, manifest hash mismatch, missing file, extra file, file hash mismatch, byte mismatch, or dimension mismatch stops the lane.',
      'No local-only image is accepted as durable evidence for a fresh clone or CI worker.',
    ],
    evidenceSeparation: {
      runtimeRegression: 'tracked runtime snapshots prove deterministic stability only',
      canonicalFigmaParity: 'hydrated canonical evidence plus direct full-canvas review and transparent metrics prove design conformance',
      snapshotPassIsParityProof: false,
    },
    currentReadiness: 'BLOCKED_EXTERNAL_ARTIFACT_SERVICE_NOT_CONFIGURED_AND_NO_UPLOAD_ATTEMPTED',
  },
  futureIgnoreAndUntrackingDesign: {
    gitignoreEdited: false,
    imageDeleted: false,
    imageUntracked: false,
    indexChanged: false,
    patterns: [...Object.keys(expectedCounts)].flatMap((targetRoot) => [...imageExtensions].sort().map((extension) => `/${targetRoot}/**/*${extension}`)),
    nonImageDocumentationRemainsTracked: ['.json', '.md', 'manifests', 'hashes', 'metrics', 'reviews', 'reports', 'ledgers'],
    exactFutureUntrackingList: 'Use only this report targetManifest.files after external bundle publication, restore proof, dry-run, and APPROVAL_AR_EN_IMAGE_UNTRACKING.',
    gitSizeSemantics: 'Ignore rules and index-only untracking affect future/current-tree tracking but do not shrink existing Git history or old clone size.',
    dormantHistoryReduction: 'Separate destructive procedure requiring mirror backup, size report, collaborator coordination, protected-branch approval, restore proof, explicit force-push authorization, and fresh-clone proof.',
  },
  approvalsPending: [
    'APPROVAL_RETIRED_LOCALE_IMAGE_DELETION',
    'APPROVAL_AR_EN_IMAGE_UNTRACKING',
    'APPROVAL_EXTERNAL_ARTIFACT_UPLOAD',
    'APPROVAL_OPTIONAL_HISTORY_REDUCTION',
  ],
  verification: {
    blockers: verificationBlockers,
    gitDiffCheck: { exitCode: gitDiffCheck.exitCode, status: gitDiffCheck.exitCode === 0 ? 'passed' : 'failed' },
    noFigmaAccess: true,
    noDatabaseAccess: true,
    noExternalUpload: true,
    noSnapshotUpdate: true,
    noBroadRepositoryHashing: true,
  },
  mutationStatement: {
    targetImagesRead: true,
    targetImagesChanged: false,
    targetImagesDeleted: false,
    gitignoreChanged: false,
    gitIndexChanged: false,
    imagesUntracked: false,
    externalBundleCreatedOrUploaded: false,
    productSourceChanged: false,
    databaseChanged: false,
    snapshotsChanged: false,
    commitsPushesDeploysHistoryRewrite: false,
  },
  evidenceDigest: sha256Buffer(Buffer.from(JSON.stringify({ wholeManifestSha256, rootSummaries, knownDesignExclusions, excludedImageRecords, verificationBlockers }), 'utf8')),
};

fs.mkdirSync(path.dirname(absolute(reportPath)), { recursive: true });
fs.writeFileSync(absolute(reportPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  marker: report.completionMarker,
  status: report.status,
  counts: report.approvedScope.actualCounts,
  combined: report.approvedScope.combinedActualCount,
  bytes: report.approvedScope.totalBytes,
  totalMiB: report.approvedScope.totalMiB,
  missingHashCount: report.targetManifest.missingHashCount,
  missingDimensionCount: report.targetManifest.missingDimensionCount,
  unresolvedProvenanceCount: report.targetManifest.unresolvedProvenanceCount,
  duplicatePathCount: report.targetManifest.duplicatePathCount,
  knownDesignExclusions: report.exclusionLedger.knownDesignSourceExclusions.actualCount,
  outsideScopeImages: report.exclusionLedger.allImagesOutsideApprovedScopes.count,
  runtimeDependencySafety: report.runtimeDependencySafety.status,
  externalArtifactReadiness: report.externalArtifactBundleDesign.currentReadiness,
  blockers: report.verification.blockers,
  reportPath,
}, null, 2));
if (verificationBlockers.length) process.exitCode = 1;
