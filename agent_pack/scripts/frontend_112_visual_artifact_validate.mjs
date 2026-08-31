import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = 'agent_pack/08_reality_sync/FRONTEND_112_VISUAL_ARTIFACT_INVENTORY_2026-08-30.json';
const ownershipManifestPath = 'agent_pack/08_reality_sync/PRE_COMMIT_RELEASE_AUDIT_OWNERSHIP_MANIFEST_2026-08-30.json';
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.bmp', '.tif', '.tiff']);
const expectedCounts = {
  'docs/design_sources/final_screens': 135,
  'docs/quality': 1182,
};

const absolute = (relativePath) => path.join(root, relativePath);
const sha256Buffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const parsePng = (buffer) => buffer.length >= 24 && buffer.toString('hex', 0, 8) === '89504e470d0a1a0a' ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } : null;
const parseGif = (buffer) => buffer.length >= 10 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)) ? { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) } : null;
const parseJpeg = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    const sof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (sof && offset + 7 < buffer.length) return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    offset += length;
  }
  return null;
};
const parseWebp = (buffer) => {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16), height: 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16) };
  if (chunk === 'VP8L' && buffer[20] === 0x2f) {
    const bits = buffer[21] | (buffer[22] << 8) | (buffer[23] << 16) | (buffer[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ' && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  return null;
};
const dimensionsFor = (buffer, extension) => {
  const lower = extension.toLowerCase();
  if (lower === '.png') return parsePng(buffer);
  if (lower === '.gif') return parseGif(buffer);
  if (lower === '.jpg' || lower === '.jpeg') return parseJpeg(buffer);
  if (lower === '.webp') return parseWebp(buffer);
  return null;
};
const canonicalRecord = (record) => ({
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
});

const report = JSON.parse(fs.readFileSync(absolute(reportPath), 'utf8'));
const ownershipManifest = JSON.parse(fs.readFileSync(absolute(ownershipManifestPath), 'utf8'));
const ownershipRecords = ownershipManifest.files || ownershipManifest.records || ownershipManifest.entries || ownershipManifest.items || [];
const ownershipByPath = new Map(ownershipRecords.map((record) => [record.path || record.relativePath, record]));
const prospectiveGeneratedViews = [
  'agent_pack/07_finish/FINISH_INDEX.json',
  'agent_pack/03_execution/TASK_BOARD.md',
  'agent_pack/03_execution/COUNT_SUMMARY.json',
  'agent_pack/step_info.json',
];
const files = report.targetManifest.files;
const errors = [];
if (report.status !== 'READ_ONLY_VISUAL_ARTIFACT_INVENTORY_COMPLETE') errors.push(`unexpected report status: ${report.status}`);
if (files.length !== 1317) errors.push(`combined count ${files.length} != 1317`);
const actualByRoot = {};
for (const targetRoot of Object.keys(expectedCounts)) actualByRoot[targetRoot] = files.filter((file) => file.path === targetRoot || file.path.startsWith(`${targetRoot}/`)).length;
for (const [targetRoot, expected] of Object.entries(expectedCounts)) if (actualByRoot[targetRoot] !== expected) errors.push(`${targetRoot} count ${actualByRoot[targetRoot]} != ${expected}`);
if (new Set(files.map((file) => file.path)).size !== files.length) errors.push('duplicate target path');
let totalBytes = 0;
let hashMismatches = 0;
let dimensionMismatches = 0;
for (const file of files) {
  if (!imageExtensions.has(file.extension)) errors.push(`unsupported extension: ${file.path}`);
  if (!fs.existsSync(absolute(file.path))) { errors.push(`missing target: ${file.path}`); continue; }
  const buffer = fs.readFileSync(absolute(file.path));
  totalBytes += buffer.length;
  if (buffer.length !== file.bytes || sha256Buffer(buffer) !== file.sha256) { hashMismatches += 1; errors.push(`hash/byte mismatch: ${file.path}`); }
  const dimensions = dimensionsFor(buffer, file.extension);
  if (!dimensions || dimensions.width !== file.width || dimensions.height !== file.height) { dimensionMismatches += 1; errors.push(`dimension mismatch: ${file.path}`); }
  if (!file.provenance || String(file.provenance).startsWith('UNRESOLVED') || String(file.provenanceClassification).startsWith('UNRESOLVED')) errors.push(`missing provenance: ${file.path}`);
}
if (totalBytes !== report.approvedScope.totalBytes) errors.push(`byte total ${totalBytes} != ${report.approvedScope.totalBytes}`);
if (report.targetManifest.wholeManifestSha256 !== sha256Buffer(Buffer.from(JSON.stringify(files.map(canonicalRecord)), 'utf8'))) errors.push('whole-manifest SHA-256 mismatch');
if (report.targetManifest.missingHashCount !== 0 || report.targetManifest.missingDimensionCount !== 0 || report.targetManifest.unresolvedProvenanceCount !== 0 || report.targetManifest.duplicatePathCount !== 0) errors.push('report completeness counters are non-zero');
if (report.exclusionLedger.knownDesignSourceExclusions.actualCount !== 3) errors.push('known design exclusion count is not 3');
if (report.runtimeDependencySafety.status !== 'SAFE_EXPECTED_TEST_AND_PARITY_REFERENCES_ONLY') errors.push('runtime dependency safety is not clear');
if (report.externalArtifactBundleDesign.publicationStatus !== 'NOT_CREATED_NOT_UPLOADED_IN_THIS_TASK') errors.push('external publication state is not fail-closed');
if (report.futureIgnoreAndUntrackingDesign.gitignoreEdited || report.futureIgnoreAndUntrackingDesign.imageDeleted || report.futureIgnoreAndUntrackingDesign.imageUntracked || report.futureIgnoreAndUntrackingDesign.indexChanged) errors.push('forbidden mutation is recorded');
console.log(JSON.stringify({
  status: errors.length ? 'BLOCKED_VERIFICATION' : 'VALIDATED_READ_ONLY',
  reportPath,
  ownership: {
    manifestPath: ownershipManifestPath,
    recordCount: ownershipRecords.length,
    prospectiveGeneratedViews,
    generatedViewOwnership: prospectiveGeneratedViews.map((filePath) => ({
      path: filePath,
      found: ownershipByPath.has(filePath),
      classification: ownershipByPath.get(filePath)?.classification || ownershipByPath.get(filePath)?.ownership || 'NOT_FOUND_IN_BASELINE_MANIFEST',
    })),
  },
  combinedCount: files.length,
  countsByRoot: actualByRoot,
  totalBytes,
  wholeManifestSha256: report.targetManifest.wholeManifestSha256,
  hashMismatches,
  dimensionMismatches,
  errors,
}, null, 2));
if (errors.length) process.exitCode = 1;
