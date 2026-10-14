import type { AdBanner, AdBannerOrder } from '@sadat-real-estate/contracts';

export function featuredOrder(items: readonly AdBanner[], index: number, offset: number, page: number): AdBannerOrder | undefined {
  const next = [...items], other = index + offset;
  if (!next[index] || !next[other]) return;
  [next[index], next[other]] = [next[other]!, next[index]!];
  // Imported records can share a sort order. Number every visible row uniquely
  // instead of exchanging duplicate values, which the API correctly rejects.
  const distinct = new Set(items.map(item => item.sortOrder)).size === items.length;
  return { placementKey: 'homepage.featured', items: next.map((item, position) => ({ bannerId: item.id, sortOrder: distinct ? items[position]!.sortOrder : (page - 1) * 100 + position, expectedVersion: item.version })), reason: 'Reorder featured cards' };
}
