import { coordinatesFromPropertyMapUrl, propertyMapUrlSchema } from '@sadat-real-estate/contracts';

/** Follow only map-provider short links, validating every redirect before any further request. */
export async function resolvePropertyMapCoordinates(value: string, fetcher: typeof fetch = fetch) {
  let current = propertyMapUrlSchema.parse(value);
  const seen = new Set<string>();
  const signal = AbortSignal.timeout(6_000);
  try {
    for (let hop = 0; hop < 5; hop++) {
      const point = coordinatesFromPropertyMapUrl(current);
      if (point) return point;
      const url = new URL(current);
      if (!['maps.app.goo.gl', 'goo.gl', 'maps.apple'].includes(url.hostname) || seen.has(current)) return null;
      seen.add(current);
      const response = await fetcher(url, { redirect: 'manual', signal, headers: { 'user-agent': 'Mozilla/5.0 SadatRealEstate/1.0', accept: 'text/html' } });
      const next = response.headers.get('location');
      await response.body?.cancel();
      if (![301, 302, 303, 307, 308].includes(response.status) || !next) return null;
      const target = new URL(next, url).href;
      if (!propertyMapUrlSchema.safeParse(target).success) return null;
      current = target;
    }
    return coordinatesFromPropertyMapUrl(current);
  } catch {
    return null;
  }
}
