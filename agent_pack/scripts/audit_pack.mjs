import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const pack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(pack, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(pack, p), 'utf8'));
const catalog = read('03_execution/TASK_CATALOG.json');
const state = read('03_execution/TASK_STATE.json');
const screens = read('01_product/SCREEN_REGISTRY.json');
const coverage = read('01_product/SCREEN_COVERAGE.json');
const endpoints = read('01_product/API_ENDPOINT_BLUEPRINT.json');
const finish = read('07_finish/FINISH_INDEX.json');
const manifest = read('03_execution/MANIFEST.json');
const designSources = read('09_sources/DESIGN_SOURCE_MANIFEST.json');
const errors = [];
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ids = catalog.map((task) => task.id);
if (new Set(ids).size !== ids.length) errors.push('Duplicate task IDs');
if (new Set(screens.map((screen) => screen.id)).size !== screens.length) errors.push('Duplicate screen IDs');
if (screens.length !== 131) errors.push('Expected 131 screen IDs, found ' + screens.length);
if (Object.keys(state.tasks).length !== catalog.length) errors.push('TASK_STATE count mismatch');
if (manifest.packLanguage !== 'en') errors.push('Agent Pack language must be en');
if (manifest.productLocalization?.primaryLocale !== 'ar' || manifest.productLocalization?.primaryDirection !== 'rtl') {
  errors.push('Product localization must preserve Arabic as the primary RTL locale');
}
const designScreenIds = designSources.screens.map((screen) => screen.id);
if (new Set(designScreenIds).size !== designScreenIds.length) errors.push('Duplicate design-source Screen IDs');
if (designScreenIds.length !== screens.length) errors.push('Design-source screen count mismatch');
for (const screen of screens) {
  const source = designSources.screens.find((item) => item.id === screen.id);
  if (!source) {
    errors.push('Missing design-source record for ' + screen.id);
    continue;
  }
  const declaredPaths = source.localSources.map((item) => item.localPath);
  if (JSON.stringify(screen.localSourcePaths || []) !== JSON.stringify(declaredPaths)) errors.push('Design-source path mismatch for ' + screen.id);
  for (const item of source.localSources) {
    const absolute = path.join(repositoryRoot, item.localPath);
    if (!fs.existsSync(absolute)) errors.push('Missing local screen export: ' + item.localPath);
    else if (sha256(absolute) !== item.sha256) errors.push('Local screen export checksum mismatch: ' + item.localPath);
  }
}
for (const item of [
  designSources.suppliedSources.developerHandoff,
  designSources.suppliedSources.prototypeFlowHub,
  designSources.brand.logo,
  designSources.brand.designSystem,
  ...designSources.supplementary
]) {
  const absolute = path.join(repositoryRoot, item.localPath);
  if (!fs.existsSync(absolute)) errors.push('Missing design source: ' + item.localPath);
  else if (sha256(absolute) !== item.sha256) errors.push('Design source checksum mismatch: ' + item.localPath);
}
for (const runtimeAsset of [designSources.brand.logo, designSources.brand.favicon]) {
  const relative = path.join('apps/web/public', runtimeAsset.runtimePath.replace(/^\//u, ''));
  const absolute = path.join(repositoryRoot, relative);
  if (!fs.existsSync(absolute)) errors.push('Missing runtime brand asset: ' + relative);
  else if (sha256(absolute) !== runtimeAsset.sha256) errors.push('Runtime brand asset checksum mismatch: ' + relative);
}
const endpointKeys = endpoints.map((entry) => entry.method + ' ' + entry.path);
if (new Set(endpointKeys).size !== endpointKeys.length) errors.push('Duplicate endpoint blueprint method/path');
for (const endpoint of endpoints) {
  if (endpoint.path.includes('/api/api/') || (endpoint.path.startsWith('/api/') && !endpoint.path.startsWith('/api/v1/'))) errors.push('Invalid API prefix: ' + endpoint.method + ' ' + endpoint.path);
}
for (let i = 0; i < catalog.length; i += 1) {
  const task = catalog[i];
  if (task.sequence !== i + 1) errors.push('Non-contiguous sequence at ' + task.id);
  if (!state.tasks[task.id]) errors.push('Missing state for ' + task.id);
  for (const ref of task.sourceRefs || []) {
    if (/^(PUB|AUTH|SEK|PRV|ADM)-/.test(ref) && !screens.some((screen) => screen.id === ref)) errors.push('Missing screen source ref ' + ref + ' for ' + task.id);
    if (/.(md|json)$/.test(ref) && !fs.existsSync(path.join(pack, ref))) errors.push('Missing file source ref ' + ref + ' for ' + task.id);
  }
  for (const dep of task.dependsOn) {
    const depIndex = ids.indexOf(dep);
    if (depIndex < 0) errors.push('Missing dependency ' + dep + ' for ' + task.id);
    if (depIndex >= i) errors.push('Forward/cyclic dependency ' + dep + ' -> ' + task.id);
  }
  if (!fs.existsSync(path.join(pack, task.atomicTaskFile))) errors.push('Missing atomic task file for ' + task.id);
  if (task.track === 'frontend' && catalog.slice(i + 1).some((later) => later.track === 'backend')) errors.push('Backend task appears after frontend at ' + task.id);
  if (state.tasks[task.id]?.status === 'complete') {
    const evidence = path.join(pack, '07_finish', task.id, 'completion.json');
    if (!fs.existsSync(evidence)) errors.push('Completed task missing evidence: ' + task.id);
    if (!finish.includes(task.id)) errors.push('Completed task missing FINISH_INDEX: ' + task.id);
  }
}
const inProgress = Object.entries(state.tasks).filter(([, entry]) => entry.status === 'in_progress');
if (inProgress.length > 1) errors.push('More than one in_progress task');
for (const screen of screens) {
  if ('arabicName' in screen) errors.push('Screen registry must not embed Arabic planning copy: ' + screen.id);
  if (!screen.locales?.includes('ar') || !screen.directionScope?.includes('rtl')) errors.push('Screen lost Arabic RTL product coverage: ' + screen.id);
  const owners = catalog.filter((task) => task.screens.includes(screen.id));
  if (owners.length !== 1) errors.push('Screen ' + screen.id + ' mapped to ' + owners.length + ' frontend tasks');
  const row = coverage.find((item) => item.id === screen.id);
  if (!row || !row.route || !row.frontendTaskId || !row.backendTaskIds.length) errors.push('Incomplete coverage row for ' + screen.id);
  for (const taskId of row?.backendTaskIds || []) if (!ids.includes(taskId)) errors.push('Coverage references missing backend task ' + taskId + ' for ' + screen.id);
}
for (const taskId of finish) if (state.tasks[taskId]?.status !== 'complete') errors.push('FINISH_INDEX contains non-complete or missing task: ' + taskId);
const jsonFiles = [];
const textFiles = [];
const textExtensions = new Set(['.md', '.json', '.mjs', '.js', '.ts', '.txt', '.yaml', '.yml', '.html']);
const localeSuffixPattern = /(^|_)AR(?=(_|\.|$))/i;
const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, entry.name); if (entry.isDirectory()) walk(p); else { if (entry.name.endsWith('.json')) jsonFiles.push(p); if (textExtensions.has(path.extname(entry.name).toLowerCase())) textFiles.push(p); if (localeSuffixPattern.test(entry.name)) errors.push('Locale-suffixed Agent Pack filename is forbidden: ' + path.relative(pack, p)); } } };
walk(pack);
for (const file of jsonFiles) { try { JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors.push('Invalid JSON ' + path.relative(pack, file) + ': ' + error.message); } }
for (const file of textFiles) {
  if (/[\u0600-\u06ff]/u.test(fs.readFileSync(file, 'utf8'))) errors.push('Arabic-script text found in English-only Agent Pack file: ' + path.relative(pack, file));
}
const report = { tasks: catalog.length, backend: catalog.filter((task) => task.track === 'backend').length, frontend: catalog.filter((task) => task.track === 'frontend').length, screens: screens.length, endpointBlueprint: endpoints.length, localVisualSourceScreenIds: designSources.screens.filter((screen) => screen.localSources.length).length, jsonFiles: jsonFiles.length, textFilesCheckedForEnglishPolicy: textFiles.length, packLanguage: manifest.packLanguage, primaryProductLocale: manifest.productLocalization?.primaryLocale, inProgress: inProgress.map(([id]) => id), errors };
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
