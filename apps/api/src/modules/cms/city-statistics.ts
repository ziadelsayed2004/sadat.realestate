import type { HomepageMetricSource } from '../public/homepage.js';

export const CITY_STATISTICS = [
  { key: 'buildings', title: { ar: 'المباني', en: 'Buildings' }, order: 1 },
  { key: 'residential_districts', title: { ar: 'المناطق السكنية', en: 'Residential districts' }, order: 2 },
  { key: 'housing_units', title: { ar: 'الوحدات السكنية', en: 'Housing units' }, order: 3 },
  { key: 'annual_growth', title: { ar: 'النمو السنوي', en: 'Annual growth' }, order: 4 }
] as const;

export function manualCityMetrics(rows: Array<{ key?: string; value?: unknown; status?: string }>): HomepageMetricSource[] {
  return CITY_STATISTICS.flatMap(statistic => {
    const row = rows.find(item => item.key === `city_metric_${statistic.key}` && item.status === 'published');
    const value = row?.value;
    if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== 'number' || !('value' in value)
      || typeof value.value !== 'number' || !Number.isSafeInteger(value.value) || value.value < 0 || value.value > 100_000_000) return [];
    return [{ ...statistic, value: value.value, status: 'published', visible: true }];
  });
}
