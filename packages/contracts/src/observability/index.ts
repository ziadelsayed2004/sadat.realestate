import { z } from 'zod';

const safeName = z.string().trim().min(1).max(120).regex(/^[a-zA-Z][a-zA-Z0-9_.:-]*$/u);
const safeValue = z.string().trim().min(1).max(160).regex(/^[^\u0000-\u001f\u007f]+$/u);
const requestId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u);
const traceId = z.string().regex(/^[0-9a-f]{32}$/u);
const utcDate = z.string().datetime({ offset: true });

export const OBSERVABILITY_METRIC_TYPES = ['counter', 'gauge', 'histogram'] as const;
export const OBSERVABILITY_ALERT_SEVERITIES = ['warning', 'critical'] as const;
export const OBSERVABILITY_ALERT_SIGNALS = [
  'readiness_not_ready',
  'http_server_error',
  'dependency_degraded'
] as const;

export const observabilityMetricTypeSchema = z.enum(OBSERVABILITY_METRIC_TYPES);
export const observabilityMetricSampleSchema = z.object({
  name: safeName,
  type: observabilityMetricTypeSchema,
  value: z.number().finite(),
  labels: z.record(safeName, safeValue).optional(),
  observedAt: utcDate
}).strict();

export const observabilityErrorReportSchema = z.object({
  errorType: safeName,
  requestId,
  traceId,
  route: z.string().trim().min(1).max(240).regex(/^\/[A-Za-z0-9_./:{}-]*$/u),
  statusCode: z.number().int().min(500).max(599),
  occurredAt: utcDate
}).strict();

export const observabilityAlertSignalSchema = z.enum(OBSERVABILITY_ALERT_SIGNALS);
export const observabilityAlertSeveritySchema = z.enum(OBSERVABILITY_ALERT_SEVERITIES);
export const observabilityAlertDefinitionSchema = z.object({
  id: safeName,
  severity: observabilityAlertSeveritySchema,
  signal: observabilityAlertSignalSchema,
  runbook: safeName
}).strict();
export const observabilityAlertSchema = observabilityAlertDefinitionSchema.extend({
  occurredAt: utcDate,
  requestId: requestId.optional(),
  traceId: traceId.optional()
}).strict();

export type ObservabilityMetricType = z.infer<typeof observabilityMetricTypeSchema>;
export type ObservabilityMetricSample = z.infer<typeof observabilityMetricSampleSchema>;
export type ObservabilityErrorReport = z.infer<typeof observabilityErrorReportSchema>;
export type ObservabilityAlertSignal = z.infer<typeof observabilityAlertSignalSchema>;
export type ObservabilityAlertSeverity = z.infer<typeof observabilityAlertSeveritySchema>;
export type ObservabilityAlertDefinition = z.infer<typeof observabilityAlertDefinitionSchema>;
export type ObservabilityAlert = z.infer<typeof observabilityAlertSchema>;
