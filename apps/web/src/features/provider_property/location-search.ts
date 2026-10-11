import type { ProviderPropertyLocationOption } from './data.ts';

function words(value: string): string[] {
  return value.normalize('NFKD').replace(/\p{M}|ـ/gu, '').replace(/[أإآٱ]/gu, 'ا').replace(/ى/gu, 'ي').replace(/ة/gu, 'ه')
    .toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => word.startsWith('ال') ? word.slice(2) : word);
}

// Bound spelling suggestions, including swapped adjacent letters. Exact results
// always win, and short searches never use fuzzy matches.
function nearWord(query: string, candidate: string): boolean {
  const limit = query.length >= 5 ? 2 : 1;
  if (query.length < 4 || query.length > 32 || candidate.length > 32 || Math.abs(query.length - candidate.length) > limit) return false;
  const rows: number[][] = Array.from({ length: query.length + 1 }, (_, index) => [index]);
  rows[0] = Array.from({ length: candidate.length + 1 }, (_, index) => index);
  for (let i = 1; i <= query.length; i += 1) {
    for (let j = 1; j <= candidate.length; j += 1) {
      let value = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + (query[i - 1] === candidate[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && query[i - 1] === candidate[j - 2] && query[i - 2] === candidate[j - 1]) value = Math.min(value, rows[i - 2]![j - 2]! + 1);
      rows[i]![j] = value;
    }
  }
  return rows[query.length]![candidate.length]! <= limit;
}

export function filterProviderLocations(locations: readonly ProviderPropertyLocationOption[], search: string): readonly ProviderPropertyLocationOption[] {
  const query = words(search.trim());
  if (query.length === 0) return locations;
  const indexed = locations.map(location => ({ location, tokens: words(`${location.name.ar ?? ''} ${location.name.en ?? ''} ${location.slug}`) }));
  const exact = indexed.filter(({ tokens }) => query.every(word => tokens.some(token => token.includes(word))));
  return (exact.length > 0 ? exact : indexed.filter(({ tokens }) => query.every(word => tokens.some(token => token.includes(word) || nearWord(word, token))))).map(({ location }) => location);
}
