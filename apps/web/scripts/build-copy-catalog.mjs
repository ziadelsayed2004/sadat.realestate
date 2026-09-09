import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const featuresRoot = path.join(appRoot, 'src', 'features');
const messagesRoot = path.join(featuresRoot, 'localization', 'messages');

function collectCopyFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectCopyFiles(absolutePath, files);
    else if (entry.name.endsWith('copy.ts')) files.push(absolutePath);
  }
  return files;
}

function serializableCopy(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(serializableCopy).filter(item => item !== undefined);
  if (value === null || typeof value !== 'object') return undefined;
  const entries = Object.entries(value)
    .map(([key, child]) => [key, serializableCopy(child)])
    .filter(([, child]) => child !== undefined);
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

function flattenLeafPaths(value, prefix = '', paths = []) {
  if (typeof value === 'string') {
    paths.push(prefix);
    return paths;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => flattenLeafPaths(child, `${prefix}[${index}]`, paths));
    return paths;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flattenLeafPaths(child, prefix === '' ? key : `${prefix}.${key}`, paths);
    }
  }
  return paths;
}

function emptyLeafPaths(value, prefix = '', paths = []) {
  if (typeof value === 'string') {
    if (value.trim() === '') paths.push(prefix);
    return paths;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => emptyLeafPaths(child, `${prefix}[${index}]`, paths));
    return paths;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      emptyLeafPaths(child, prefix === '' ? key : `${prefix}.${key}`, paths);
    }
  }
  return paths;
}

const catalogs = { ar: {}, en: {} };
const modules = [];

const sourceFiles = [
  ...collectCopyFiles(featuresRoot),
  path.join(featuresRoot, 'frontend_foundation', 'locale.ts')
];

for (const file of sourceFiles) {
  const relative = path.relative(featuresRoot, file).replaceAll(path.sep, '/');
  const namespace = relative.replace(/\.ts$/u, '');
  const exports = await import(pathToFileURL(file).href);
  const getters = Object.entries(exports).filter(([name, value]) => /^get.*Copy$/u.test(name) && typeof value === 'function');
  if (getters.length === 0) continue;
  modules.push({ file, relative, namespace, getters: getters.map(([name]) => name) });
  for (const [name, getter] of getters) {
    const catalogKey = `${namespace}#${name}`;
    catalogs.ar[catalogKey] = serializableCopy(getter('ar')) ?? {};
    catalogs.en[catalogKey] = serializableCopy(getter('en')) ?? {};
  }
}

const arPaths = flattenLeafPaths(catalogs.ar).sort();
const enPaths = flattenLeafPaths(catalogs.en).sort();
if (JSON.stringify(arPaths) !== JSON.stringify(enPaths)) {
  const arOnly = arPaths.filter(key => !enPaths.includes(key));
  const enOnly = enPaths.filter(key => !arPaths.includes(key));
  throw new Error(`Translation key mismatch. ar-only=${arOnly.join(',')} en-only=${enOnly.join(',')}`);
}

const shouldWrite = process.argv.includes('--write') || process.argv.includes('--wire');
if (shouldWrite) {
  mkdirSync(messagesRoot, { recursive: true });
  for (const locale of ['ar', 'en']) {
    writeFileSync(path.join(messagesRoot, `${locale}.json`), `${JSON.stringify(catalogs[locale], null, 2)}\n`, 'utf8');
  }
} else {
  const committed = {
    ar: JSON.parse(readFileSync(path.join(messagesRoot, 'ar.json'), 'utf8')),
    en: JSON.parse(readFileSync(path.join(messagesRoot, 'en.json'), 'utf8'))
  };
  const committedArPaths = flattenLeafPaths(committed.ar).sort();
  const committedEnPaths = flattenLeafPaths(committed.en).sort();
  if (JSON.stringify(committedArPaths) !== JSON.stringify(committedEnPaths)) {
    throw new Error('Committed ar.json and en.json translation keys do not match.');
  }
  if (JSON.stringify(committedArPaths) !== JSON.stringify(arPaths)) {
    throw new Error('Copy structure changed. Run npm run translations:sync --workspace @sadat-real-estate/web and review both JSON files.');
  }
  for (const locale of ['ar', 'en']) {
    const emptyPaths = emptyLeafPaths(committed[locale]);
    if (emptyPaths.length > 0) throw new Error(`${locale}.json contains empty translations: ${emptyPaths.join(',')}`);
  }
}

if (process.argv.includes('--wire')) {
  for (const moduleInfo of modules) {
    let source = readFileSync(moduleInfo.file, 'utf8');
    if (!source.includes("from '../localization/copy-catalog.ts'")) {
      source = `import { localizeCopy } from '../localization/copy-catalog.ts';\n${source}`;
    }
    for (const getterName of moduleInfo.getters) {
      const marker = `export function ${getterName}(`;
      const start = source.indexOf(marker);
      if (start < 0) throw new Error(`Cannot find ${getterName} in ${moduleInfo.relative}`);
      const returnStart = source.indexOf('  return ', start);
      const returnEnd = source.indexOf(';', returnStart);
      if (returnStart < 0 || returnEnd < 0) throw new Error(`Cannot find return for ${getterName} in ${moduleInfo.relative}`);
      const expression = source.slice(returnStart + '  return '.length, returnEnd);
      if (expression.startsWith('localizeCopy(')) continue;
      const replacement = `  return localizeCopy('${moduleInfo.namespace}#${getterName}', locale, ${expression});`;
      source = source.slice(0, returnStart) + replacement + source.slice(returnEnd + 1);
    }
    writeFileSync(moduleInfo.file, source, 'utf8');
  }
}

console.log(JSON.stringify({ namespaces: Object.keys(catalogs.ar).length, keysPerLocale: arPaths.length, mode: shouldWrite ? 'sync' : 'check', wired: process.argv.includes('--wire') }));
