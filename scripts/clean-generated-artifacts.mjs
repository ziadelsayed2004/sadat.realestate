import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const retained = new Set();
for (const feature of readdirSync(path.join(root, 'agent_pack/07_finish'))) {
  const ledger = path.join(root, 'agent_pack/07_finish', feature, 'design-comparison.json');
  let parsed;
  try { parsed = JSON.parse(readFileSync(ledger, 'utf8')); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  for (const screen of [...(parsed.screens ?? []), ...(parsed.entries ?? [])]) {
    for (const file of screen.runtimeEvidence ?? []) if (typeof file === 'string') retained.add(file);
  }
}
const candidates = tracked.filter(file => !retained.has(file) && (
  (/^docs\/quality\//u.test(file) && /\.(png|jpe?g|webp|gif|webm|mp4|zip|trace)$/iu.test(file)) ||
  /^docs\/design_sources\/recovery_candidates\//u.test(file) ||
  (/^docs\/assets\//u.test(file) && /\.(png|jpe?g|webp)$/iu.test(file)) ||
  /(?:^|\/)(?:test-results|playwright-report|blob-report)\//u.test(file)
));
const report = { files: candidates.length, bytes: candidates.reduce((sum, file) => sum + statSync(path.join(root, file)).size, 0), retainedRequiredEvidence: [...retained].filter(file => file.startsWith('docs/quality/')), paths: candidates };
mkdirSync(path.join(root, '.tmp'), { recursive: true });
writeFileSync(path.join(root, '.tmp/generated-artifacts-cleanup.json'), JSON.stringify(report, null, 2) + '\n');
if (process.argv.includes('--apply') && candidates.length) {
  const list = path.join(root, '.tmp/generated-artifacts-cleanup.paths');
  writeFileSync(list, candidates.join('\0') + '\0');
  // Only remove from Git's index; the developer's local captures remain intact.
  execFileSync('git', ['rm', '--cached', '--quiet', '--pathspec-from-file=' + list, '--pathspec-file-nul'], { cwd: root, stdio: 'pipe' });
}
console.log(`GENERATED_ARTIFACTS_${process.argv.includes('--apply') ? 'UNTRACKED' : 'PLAN'} files=${report.files} mib=${(report.bytes / 1048576).toFixed(1)} local_copies=preserved`);
