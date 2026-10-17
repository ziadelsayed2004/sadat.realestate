import { describe, expect, it } from 'vitest';
import { filterProviderLocations } from '../src/features/provider_property/location-search.ts';
import type { ProviderPropertyLocationOption } from '../src/features/provider_property/data.ts';

const locations: readonly ProviderPropertyLocationOption[] = [
  { id: 'a'.repeat(24), kind: 'neighborhood', name: { ar: 'الحي الأول', en: 'First District' }, slug: 'first-district', order: 1 },
  { id: 'b'.repeat(24), kind: 'neighborhood', name: { ar: 'الحي الرابع', en: 'Fourth District' }, slug: 'fourth-district', order: 2 },
  { id: 'c'.repeat(24), kind: 'neighborhood', name: { ar: 'الحي السابع', en: 'Seventh District' }, slug: 'seventh-district', order: 3 }
];

describe('Provider location search', () => {
  it.each(['المنطقة ال22', 'المنطقة ال٢٢', 'منطقة۲۲', '22'])('finds a numeric area across phone keyboard variants: %s', query => {
    const numeric = { id: 'd'.repeat(24), kind: 'neighborhood' as const, name: { ar: 'المنطقة 22' }, slug: 'area-22', order: 4 };
    const other = { ...numeric, id: 'e'.repeat(24), name: { ar: 'المنطقة 23' }, slug: 'area-23' };
    expect(filterProviderLocations([...locations, numeric, other], query)).toEqual([numeric]);
  });
  it.each(['السباعه', 'السابعه', 'السّابع', 'sevneth', 'SEVENTH district'])('finds the registered seventh district for %s', query => {
    expect(filterProviderLocations(locations, query).map(item => item.id)).toContain('c'.repeat(24));
  });
  it('normalizes Arabic letters and prefers exact names over similar districts', () => {
    expect(filterProviderLocations(locations, 'اول')).toEqual([locations[0]]);
    expect(filterProviderLocations(locations, 'الرابع')).toEqual([locations[1]]);
    expect(filterProviderLocations(locations, 'السابع')).toEqual([locations[2]]);
  });
  it.each(['المنطقة الأولى', 'منطقة الاول', 'حي الاول', 'First area', 'First neighborhood'])('matches district names across area terminology for %s', query => {
    expect(filterProviderLocations(locations, query)).toEqual([locations[0]]);
  });
  it('still filters partial searches and never invents a missing district', () => {
    expect(filterProviderLocations(locations, 'الح')).toEqual(locations);
    expect(filterProviderLocations(locations, 'المنطقة الثانية')).toEqual([]);
  });
  it('returns only existing catalog entries, with empty results for unrelated or excessively long queries', () => {
    expect(filterProviderLocations(locations, 'منطقة غير مسجلة')).toEqual([]);
    expect(filterProviderLocations(locations, 'x'.repeat(1000))).toEqual([]);
    expect(filterProviderLocations(locations, '  ')).toEqual(locations);
    expect(filterProviderLocations([], 'السابع')).toEqual([]);
  });
});
