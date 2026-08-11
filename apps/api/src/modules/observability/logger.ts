import { getRequestContext, type RequestContext } from './context.js';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogFields = Readonly<Record<string, unknown>>;

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  event: string;
  requestId?: string;
  traceId?: string;
  data: unknown;
}

export interface StructuredLogger {
  log(level: LogLevel, event: string, fields?: LogFields, context?: RequestContext): void;
  info(event: string, fields?: LogFields, context?: RequestContext): void;
  warn(event: string, fields?: LogFields, context?: RequestContext): void;
  error(event: string, fields?: LogFields, context?: RequestContext): void;
}

export interface LoggerOptions {
  write?: (line: string) => void;
  now?: () => Date;
}

const REDACTED = '[REDACTED]';
const sensitiveKeys = new Set([
  'authorization', 'proxyauthorization', 'cookie', 'setcookie', 'password', 'passwd',
  'secret', 'clientsecret', 'apikey', 'accesstoken', 'refreshtoken', 'idtoken',
  'sessionid', 'email', 'phone', 'mobile', 'nationalid', 'governmentid',
  'ip', 'ipaddress', 'clientip', 'remoteaddress', 'physicaladdress', 'postaladdress',
  'fullname', 'firstname', 'lastname', 'username', 'birthdate', 'dateofbirth',
  'bankaccount', 'creditcard', 'cardnumber', 'mongodburi', 'databaseurl', 'connectionstring'
]);

function normalizedKey(key: string): string {
  return key.replace(/[-_.]/g, '').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizedKey(key);
  return sensitiveKeys.has(normalized)
    || normalized.endsWith('password')
    || normalized.endsWith('secret')
    || normalized.endsWith('token');
}

function redactString(value: string): string {
  return value
    .slice(0, 2048)
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s\/@:]+:[^\s\/@]+@/gi, '$1[REDACTED]@')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?20|0)?1[0125]\d{8}\b/g, '[REDACTED_PHONE]');
}

function sanitize(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (depth > 8) return '[TRUNCATED]';
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'undefined') return null;
  if (typeof value === 'function' || typeof value === 'symbol') return '[UNSUPPORTED]';
  if (value instanceof Error) return { name: redactString(value.name) };
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '[INVALID_DATE]' : value.toISOString();
  if (typeof value !== 'object') return '[UNSUPPORTED]';
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, seen, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value).slice(0, 100)) {
    output[key] = isSensitiveKey(key) ? REDACTED : sanitize(nested, seen, depth + 1);
  }
  return output;
}

export function redactLogValue(value: unknown): unknown {
  return sanitize(value, new WeakSet<object>(), 0);
}

function defaultWrite(line: string): void {
  process.stdout.write(line);
}

export function createStructuredLogger(options: LoggerOptions = {}): StructuredLogger {
  const write = options.write ?? defaultWrite;
  const now = options.now ?? (() => new Date());

  const log = (level: LogLevel, event: string, fields: LogFields = {}, suppliedContext?: RequestContext): void => {
    const context = suppliedContext ?? getRequestContext();
    const record: LogRecord = {
      timestamp: now().toISOString(),
      level,
      event: redactString(event),
      ...(context ? { requestId: context.requestId, traceId: context.traceId } : {}),
      data: redactLogValue(fields)
    };
    try {
      write(`${JSON.stringify(record)}\n`);
    } catch {
      // Observability output must never crash or alter an API response.
    }
  };

  return {
    log,
    info: (event, fields, context) => log('info', event, fields, context),
    warn: (event, fields, context) => log('warn', event, fields, context),
    error: (event, fields, context) => log('error', event, fields, context)
  };
}
