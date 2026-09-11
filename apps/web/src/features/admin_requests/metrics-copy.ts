import type { SupportedLocale } from '@sadat-real-estate/contracts';
import ar from '../localization/messages/ar.json' with { type: 'json' };
import en from '../localization/messages/en.json' with { type: 'json' };

const messages = { ar, en };
type MetricLabel = keyof typeof en['admin_requests/metrics-copy#getRequestMetricsCopy'];

export function getRequestMetricsCopy(locale: SupportedLocale) {
  return messages[locale]['admin_requests/metrics-copy#getRequestMetricsCopy'];
}

export function requestMetricLabel(locale: SupportedLocale, label: MetricLabel): string {
  return getRequestMetricsCopy(locale)[label];
}
