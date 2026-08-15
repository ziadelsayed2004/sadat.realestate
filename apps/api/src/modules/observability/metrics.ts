import {
  observabilityMetricSampleSchema,
  type ObservabilityMetricSample,
  type ObservabilityMetricType
} from '@sadat-real-estate/contracts';

export type MetricLabels = Readonly<Record<string, string>>;

export interface MetricsRegistry {
  increment(name: string, labels?: MetricLabels, amount?: number): void;
  setGauge(name: string, value: number, labels?: MetricLabels): void;
  observe(name: string, value: number, labels?: MetricLabels): void;
  snapshot(): readonly ObservabilityMetricSample[];
  reset(): void;
}

export class ObservabilityMetricsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ObservabilityMetricsError';
    this.code = code;
  }
}

interface MetricSeries {
  name: string;
  type: ObservabilityMetricType;
  labels?: Record<string, string>;
  value: number;
}

const sensitiveKey = /(?:authorization|cookie|email|phone|mobile|ip|address|name|token|secret|password|credential|session|user.?id|account.?id)/iu;
const sensitiveValue = /(?:bearer\s|eyJ[A-Za-z0-9_-]+\.|@|(?:\+?20|0)?1[0125]\d{8}\b)/iu;
const metricName = /^[a-zA-Z][a-zA-Z0-9_.:-]{0,119}$/u;

function normalizedLabels(labels: MetricLabels | undefined): Record<string, string> | undefined {
  if (!labels) return undefined;
  const entries = Object.entries(labels);
  if (entries.length > 8) throw new ObservabilityMetricsError('METRIC_LABEL_LIMIT', 'Metric label cardinality is bounded');
  const output: Record<string, string> = {};
  for (const [key, rawValue] of entries.sort(([left], [right]) => left.localeCompare(right))) {
    const value = rawValue.trim();
    if (!metricName.test(key) || sensitiveKey.test(key) || sensitiveValue.test(value) || value.length < 1 || value.length > 160) {
      throw new ObservabilityMetricsError('METRIC_LABEL_UNSAFE', 'Metric labels must be bounded and PII-free');
    }
    output[key] = value;
  }
  return Object.keys(output).length > 0 ? output : undefined;
}

function seriesKey(name: string, labels: Record<string, string> | undefined): string {
  return `${name}|${JSON.stringify(labels ?? {})}`;
}

function assertName(name: string): void {
  if (!metricName.test(name)) throw new ObservabilityMetricsError('METRIC_NAME_INVALID', 'Metric name is invalid');
}

function assertNumber(value: number): void {
  if (!Number.isFinite(value)) throw new ObservabilityMetricsError('METRIC_VALUE_INVALID', 'Metric value must be finite');
}

export function createMetricsRegistry(now: () => Date = () => new Date()): MetricsRegistry {
  const series = new Map<string, MetricSeries>();
  const update = (name: string, type: ObservabilityMetricType, value: number, labels: MetricLabels | undefined, additive: boolean): void => {
    assertName(name);
    assertNumber(value);
    const safeLabels = normalizedLabels(labels);
    const key = seriesKey(name, safeLabels);
    const current = series.get(key);
    if (current && current.type !== type) throw new ObservabilityMetricsError('METRIC_TYPE_CONFLICT', `Metric ${name} has already been registered with another type`);
    if (!current && series.size >= 1_000) throw new ObservabilityMetricsError('METRIC_SERIES_LIMIT', 'Metric series cardinality is bounded');
    series.set(key, {
      name,
      type,
      ...(safeLabels ? { labels: safeLabels } : {}),
      value: current ? (additive ? current.value + value : value) : value
    });
  };
  return {
    increment(name, labels, amount = 1) {
      if (!Number.isFinite(amount) || amount <= 0) throw new ObservabilityMetricsError('METRIC_INCREMENT_INVALID', 'Counter increments must be positive and finite');
      update(name, 'counter', amount, labels, true);
    },
    setGauge(name, value, labels) { update(name, 'gauge', value, labels, false); },
    observe(name, value, labels) {
      if (value < 0) throw new ObservabilityMetricsError('METRIC_OBSERVATION_INVALID', 'Histogram observations cannot be negative');
      update(name, 'histogram', value, labels, false);
    },
    snapshot() {
      const observedAt = now().toISOString();
      return Object.freeze([...series.values()].sort((left, right) => seriesKey(left.name, left.labels).localeCompare(seriesKey(right.name, right.labels))).map((item) => observabilityMetricSampleSchema.parse({
        name: item.name,
        type: item.type,
        value: item.value,
        ...(item.labels ? { labels: item.labels } : {}),
        observedAt
      })));
    },
    reset() { series.clear(); }
  };
}
