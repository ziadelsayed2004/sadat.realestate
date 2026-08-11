import { isIP } from 'node:net';

export const APP_ENVIRONMENTS = ['local', 'test', 'preview', 'uat', 'production'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export type EnvironmentIssueCode = 'REQUIRED' | 'INVALID_CHOICE' | 'INVALID_HOST' | 'INVALID_PORT';

export interface EnvironmentIssue {
  key: 'APP_ENV' | 'API_HOST' | 'API_PORT';
  code: EnvironmentIssueCode;
  constraint: string;
}

export interface RuntimeEnvironment {
  appEnvironment: AppEnvironment;
  api: {
    host: string;
    port: number;
  };
}

export interface SafeEnvironmentSummary {
  appEnvironment: AppEnvironment;
  apiHost: string;
  apiPort: number;
}

export class EnvironmentValidationError extends Error {
  readonly code = 'ENVIRONMENT_INVALID';
  readonly issues: readonly EnvironmentIssue[];

  constructor(issues: readonly EnvironmentIssue[]) {
    super(`Invalid environment configuration: ${issues.map(({ key, code }) => `${key} (${code})`).join(', ')}`);
    this.name = 'EnvironmentValidationError';
    this.issues = issues;
  }
}

function requiredValue(
  source: Record<string, string | undefined>,
  key: 'APP_ENV' | 'API_HOST' | 'API_PORT',
  issues: EnvironmentIssue[]
): string | undefined {
  const value = source[key]?.trim();
  if (!value) {
    issues.push({ key, code: 'REQUIRED', constraint: 'a non-empty value is required' });
    return undefined;
  }
  return value;
}

function isValidHost(host: string): boolean {
  if (host.length > 253 || /[\u0000-\u0020\u007f]/.test(host) || /:\/\//.test(host) || /[/?#]/.test(host)) return false;
  if (isIP(host) !== 0 || host === 'localhost') return true;
  return /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(host);
}

function parsePort(port: string): number | undefined {
  if (!/^\d+$/.test(port)) return undefined;
  const parsed = Number(port);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : undefined;
}

export function parseRuntimeEnvironment(
  source: Record<string, string | undefined> = process.env
): RuntimeEnvironment {
  const issues: EnvironmentIssue[] = [];
  const appEnvironmentValue = requiredValue(source, 'APP_ENV', issues);
  const host = requiredValue(source, 'API_HOST', issues);
  const portValue = requiredValue(source, 'API_PORT', issues);

  if (appEnvironmentValue && !(APP_ENVIRONMENTS as readonly string[]).includes(appEnvironmentValue)) {
    issues.push({ key: 'APP_ENV', code: 'INVALID_CHOICE', constraint: 'must be local, test, preview, uat, or production' });
  }
  if (host && !isValidHost(host)) {
    issues.push({ key: 'API_HOST', code: 'INVALID_HOST', constraint: 'must be a hostname or IP without a scheme or path' });
  }
  const port = portValue ? parsePort(portValue) : undefined;
  if (portValue && port === undefined) {
    issues.push({ key: 'API_PORT', code: 'INVALID_PORT', constraint: 'must be a decimal integer from 1 through 65535' });
  }

  if (issues.length > 0) throw new EnvironmentValidationError(issues);

  return Object.freeze({
    appEnvironment: appEnvironmentValue as AppEnvironment,
    api: Object.freeze({ host: host as string, port: port as number })
  });
}

export function toSafeEnvironmentSummary(environment: RuntimeEnvironment): SafeEnvironmentSummary {
  return {
    appEnvironment: environment.appEnvironment,
    apiHost: environment.api.host,
    apiPort: environment.api.port
  };
}
