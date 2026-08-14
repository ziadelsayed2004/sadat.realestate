import type { AuditJsonValue, AuditSnapshot } from '@sadat-real-estate/contracts';

const REDACTED = '[REDACTED]';
const REDACTED_PII = '[REDACTED_PII]';
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const forbiddenObjectKeys = new Set(['__proto__', 'prototype', 'constructor']);
const sensitiveKeys = new Set([
  'authorization', 'proxyauthorization', 'cookie', 'setcookie', 'password', 'passwordhash',
  'secret', 'clientsecret', 'credential', 'credentials', 'apikey', 'accesstoken',
  'refreshtoken', 'idtoken', 'tokenhash', 'sessionid', 'signedurl', 'downloadurl',
  'storagekey', 'privatekey', 'otp', 'otpcode', 'otphash', 'mongodburi', 'databaseurl',
  'connectionstring', 'bankaccount', 'creditcard', 'cardnumber', 'governmentid', 'nationalid'
]);

function normalizedKey(key: string): string {
  return key.replace(/[-_.]/g, '').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizedKey(key);
  return sensitiveKeys.has(normalized)
    || normalized.endsWith('password')
    || normalized.endsWith('secret')
    || normalized.endsWith('token')
    || normalized.endsWith('credential');
}

export function redactAuditText(value: string): string {
  return value
    .slice(0, 2_048)
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s\/@:]+:[^\s\/@]+@/gi, '$1[REDACTED]@')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED_PII)
    .replace(/(?:\+?20|0)?1[0125]\d{8}\b/g, REDACTED_PII);
}

function sanitize(value: unknown, seen: WeakSet<object>, depth: number): AuditJsonValue {
  if (depth > 8) return '[TRUNCATED]';
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : '[UNSUPPORTED]';
  if (typeof value === 'string') return redactAuditText(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'undefined') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '[INVALID_DATE]' : value.toISOString();
  }
  if (value instanceof Error) return { name: redactAuditText(value.name) };
  if (typeof value !== 'object') return '[UNSUPPORTED]';
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitize(item, seen, depth + 1));
  }

  const output: Record<string, AuditJsonValue> = {};
  let safeIndex = 0;
  for (const [key, nested] of Object.entries(value).slice(0, 100)) {
    const outputKey = SAFE_KEY.test(key) && !forbiddenObjectKeys.has(key)
      ? key
      : `field_${safeIndex++}`;
    output[outputKey] = isSensitiveKey(key)
      ? REDACTED
      : sanitize(nested, seen, depth + 1);
  }
  return output;
}

export function redactAuditSnapshot(value: unknown): AuditSnapshot {
  const sanitized = sanitize(value, new WeakSet<object>(), 0);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? sanitized
    : { value: sanitized };
}
