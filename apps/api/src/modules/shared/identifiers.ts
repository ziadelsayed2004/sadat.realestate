import { randomUUID } from 'node:crypto';

/** New records only. Existing identifiers must survive name/title edits. */
export function generateIdentifier(prefix: string, text?: { en?: string | undefined; ar?: string | undefined }, separator: '-' | '_' = '-'): string {
  const name = (text?.en ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, separator).replace(/^[-_]+|[-_]+$/g, '').slice(0, 72).replace(/[-_]+$/g, '');
  const token = randomUUID().replaceAll('-', '');
  // CMS keys must start with a letter and fit their 64-character schema.
  const base = separator === '_' ? prefix : name || prefix;
  return `${base}${separator}${token}`;
}
