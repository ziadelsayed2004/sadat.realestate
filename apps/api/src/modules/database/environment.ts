import type { AppEnvironment } from '../config/environment.js';

export type DatabaseEnvironmentIssueCode = 'REQUIRED' | 'INVALID_URI';

export interface DatabaseEnvironmentIssue {
  key: 'MONGODB_URI';
  code: DatabaseEnvironmentIssueCode;
  constraint: string;
}

export interface DatabaseEnvironment {
  uri: string;
}

export class DatabaseEnvironmentValidationError extends Error {
  readonly code = 'DATABASE_ENVIRONMENT_INVALID';
  readonly issues: readonly DatabaseEnvironmentIssue[];

  constructor(issues: readonly DatabaseEnvironmentIssue[]) {
    super(`Invalid database environment: ${issues.map(({ key, code }) => `${key} (${code})`).join(', ')}`);
    this.name = 'DatabaseEnvironmentValidationError';
    this.issues = issues;
  }
}

function readRequired(source: Record<string, string | undefined>, issues: DatabaseEnvironmentIssue[]): string | undefined {
  const value = source.MONGODB_URI?.trim();
  if (!value) {
    issues.push({ key: 'MONGODB_URI', code: 'REQUIRED', constraint: 'a MongoDB URI is required' });
    return undefined;
  }
  return value;
}

function isMongoUri(uri: string): boolean {
  return /^mongodb(?:\+srv)?:\/\/[^\u0000-\u0020\u007f]+$/.test(uri);
}

export function parseDatabaseEnvironment(source: Record<string, string | undefined> = process.env): DatabaseEnvironment {
  const issues: DatabaseEnvironmentIssue[] = [];
  const uri = readRequired(source, issues);
  if (uri && !isMongoUri(uri)) {
    issues.push({ key: 'MONGODB_URI', code: 'INVALID_URI', constraint: 'must use mongodb:// or mongodb+srv:// without whitespace' });
  }
  if (issues.length > 0) throw new DatabaseEnvironmentValidationError(issues);
  return Object.freeze({ uri: uri as string });
}

export function toSafeDatabaseSummary(_environment: DatabaseEnvironment): { databaseConfigured: true } {
  return { databaseConfigured: true };
}

export function isSeedEnvironmentAllowed(environment: AppEnvironment): boolean {
  return environment === 'local' || environment === 'uat';
}
