/** Recognize location links without fetching untrusted URLs or following redirects. */
export function isPropertyMapUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    if (['url', 'link', 'redirect', 'redirect_uri', 'continue'].some(key => url.searchParams.has(key))) return false;
    const nonempty = (key: string) => (url.searchParams.get(key)?.trim().length ?? 0) > 0;
    const coordinates = (key: string) => {
      const parts = url.searchParams.get(key)?.split(',');
      if (!parts || parts.length !== 2 || parts.some(part => !part.trim())) return false;
      const [latitude, longitude] = parts.map(Number);
      return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude!) <= 90 && Math.abs(longitude!) <= 180;
    };
    if (url.hostname === 'maps.app.goo.gl') return /^\/[A-Za-z0-9_-]{6,}\/?$/.test(url.pathname);
    if (url.hostname === 'goo.gl') return /^\/maps\/[A-Za-z0-9_-]{6,}\/?$/.test(url.pathname);
    if (url.hostname === 'maps.apple') return /^\/p\/[A-Za-z0-9_~-]{6,}\/?$/.test(url.pathname);
    if (url.hostname === 'maps.apple.com') {
      if (url.pathname === '/') return nonempty('q') || nonempty('address') || nonempty('daddr') || coordinates('ll');
      if (url.pathname === '/place') return nonempty('place-id') || coordinates('coordinate') || nonempty('address');
      if (url.pathname === '/frame') return coordinates('center') || coordinates('coordinate');
      if (url.pathname === '/search') return nonempty('query');
      if (url.pathname === '/directions') return nonempty('destination');
      return false;
    }
    const googleHosts = ['google.com', 'www.google.com', 'maps.google.com', 'google.com.eg', 'www.google.com.eg', 'maps.google.com.eg'];
    if (!googleHosts.includes(url.hostname)) return false;
    const mapsPath = /^\/maps(?:\/|$)/.test(url.pathname);
    if (!mapsPath && !(url.hostname.startsWith('maps.') && url.pathname === '/')) return false;
    if (nonempty('q') || nonempty('daddr') || coordinates('ll') || /^\d+$/.test(url.searchParams.get('cid') ?? '')) return true;
    if (url.searchParams.get('api') === '1' && (nonempty('query') || nonempty('destination') || coordinates('center'))) return true;
    if (/^\/maps\/(?:place|search)\/[^/]+/.test(url.pathname)) return true;
    const point = url.pathname.match(/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\/|$)/);
    return !!point && Math.abs(Number(point[1])) <= 90 && Math.abs(Number(point[2])) <= 180;
  } catch {
    return false;
  }
}
