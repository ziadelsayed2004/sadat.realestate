import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseEnvironmentFile(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error('MALFORMED_ENVIRONMENT_LINE');
    const key = line.slice(0, separator).trim();
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key)) throw new Error('INVALID_ENVIRONMENT_KEY');
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export async function readEnvironmentFile(file) {
  return parseEnvironmentFile(await readFile(file, 'utf8'));
}

export function resolvedEnvironment(values, overrides = {}) {
  return { ...process.env, ...values, ...overrides };
}

