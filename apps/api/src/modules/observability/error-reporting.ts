import { createRequestContext, type RequestContext } from './context.js';
import {
  observabilityErrorReportSchema,
  type ObservabilityErrorReport
} from '@sadat-real-estate/contracts';

export interface ErrorReporter {
  report(report: ObservabilityErrorReport): void;
}

export interface ErrorReportInput {
  error: unknown;
  route: string;
  statusCode: number;
  context?: RequestContext;
  now?: () => Date;
}

function safeErrorType(error: unknown): string {
  const name = error instanceof Error ? error.name : 'UnknownError';
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,119}$/u.test(name) ? name : 'UnknownError';
}

function safeRoute(route: string): string {
  const value = route.trim();
  return /^\/[A-Za-z0-9_./:{}-]*$/u.test(value) ? value : '/unknown';
}

export function createSafeErrorReport(input: ErrorReportInput): ObservabilityErrorReport {
  const context = input.context ?? createRequestContext();
  const statusCode = Number.isInteger(input.statusCode) && input.statusCode >= 500 && input.statusCode <= 599 ? input.statusCode : 500;
  return observabilityErrorReportSchema.parse({
    errorType: safeErrorType(input.error),
    requestId: context.requestId,
    traceId: context.traceId,
    route: safeRoute(input.route),
    statusCode,
    occurredAt: (input.now ?? (() => new Date()))().toISOString()
  });
}

export function reportSafeError(reporter: ErrorReporter | undefined, input: ErrorReportInput): void {
  if (!reporter) return;
  try {
    reporter.report(createSafeErrorReport(input));
  } catch {
    // Error reporting is an optional side effect and must never affect a response.
  }
}

export function createInMemoryErrorReporter(): ErrorReporter & { readonly reports: readonly ObservabilityErrorReport[] } {
  const reports: ObservabilityErrorReport[] = [];
  return {
    reports,
    report(report) { reports.push(observabilityErrorReportSchema.parse(report)); }
  };
}
