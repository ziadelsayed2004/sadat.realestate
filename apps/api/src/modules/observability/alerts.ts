import {
  observabilityAlertDefinitionSchema,
  observabilityAlertSchema,
  type ObservabilityAlert,
  type ObservabilityAlertDefinition,
  type ObservabilityAlertSignal
} from '@sadat-real-estate/contracts';
import type { RequestContext } from './context.js';

export const OBSERVABILITY_ALERT_DEFINITIONS: readonly ObservabilityAlertDefinition[] = Object.freeze([
  { id: 'readiness-not-ready', severity: 'critical', signal: 'readiness_not_ready', runbook: 'readiness-failure' },
  { id: 'http-server-error', severity: 'critical', signal: 'http_server_error', runbook: 'api-server-error' },
  { id: 'dependency-degraded', severity: 'warning', signal: 'dependency_degraded', runbook: 'dependency-degraded' }
].map((definition) => observabilityAlertDefinitionSchema.parse(definition)));

export interface AlertEvaluationOptions {
  now?: () => Date;
  context?: Pick<RequestContext, 'requestId' | 'traceId'>;
}

export class ObservabilityAlertError extends Error {
  readonly code = 'OBSERVABILITY_ALERT_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'ObservabilityAlertError';
  }
}

export function evaluateObservabilityAlert(
  signal: ObservabilityAlertSignal,
  options: AlertEvaluationOptions = {}
): ObservabilityAlert {
  const definition = OBSERVABILITY_ALERT_DEFINITIONS.find((candidate) => candidate.signal === signal);
  if (!definition) throw new ObservabilityAlertError('Alert signal is not registered');
  return observabilityAlertSchema.parse({
    ...definition,
    occurredAt: (options.now ?? (() => new Date()))().toISOString(),
    ...(options.context?.requestId ? { requestId: options.context.requestId } : {}),
    ...(options.context?.traceId ? { traceId: options.context.traceId } : {})
  });
}
