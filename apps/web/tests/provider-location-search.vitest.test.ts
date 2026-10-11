import { describe, expect, it } from 'vitest';
import { filterProviderLocations } from '../src/features/provider_property/location-search.ts';
import type { ProviderPropertyLocationOption } from '../src/features/provider_property/data.ts';

const locations: readonly ProviderPropertyLocationOption[] = [
  { id: 'a'.repeat(24), kind: 'neighborhood', name: { ar: 'الحي الأول', en: 'First District' }, slug: 'first-district', order: 1 },
  { id: 'b'.repeat(24), kind: 'neighborhood', name: { ar: 'الحي الرابع', en: 'Fourth District' }, slug: 'fourth-district', order: 2 },
  { id: 'c'.repeat(24), kind: 'neighborhood', name: { ar: 'الحي السابع', en: 'Seventh District' }, slug: 'seventh-district', order: 3 }
];

describe('Provider location search', () => {
  it.each(['السباعه', 'السابعه', 'السّابع', 'sevneth', 'SEVENTH district'])('finds the registered seventh district for %s', query => {
    expect(filterProviderLocations(locations, query).map(item => item.id)).toContain('c'.repeat(24));
  });
  it('normalizes Arabic letters and prefers exact names over similar districts', () => {
    expect(filterProviderLocations(locations, 'اول')).toEqual([locations[0]]);
    expect(filterProviderLocations(locations, 'الرابع')).toEqual([locations[1]]);
    expect(filterProviderLocations(locations, 'السابع')).toEqual([locations[2]]);
  });
  it('returns only existing catalog entries, with empty results for unrelated or excessively long queries', () => {
    expect(filterProviderLocations(locations, 'منطقة غير مسجلة')).toEqual([]);
    expect(filterProviderLocations(locations, 'x'.repeat(1000))).toEqual([]);
    expect(filterProviderLocations(locations, '  ')).toEqual(locations);
    expect(filterProviderLocations([], 'السابع')).toEqual([]);
  });
});
