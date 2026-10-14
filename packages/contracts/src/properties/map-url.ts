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

/** Extract an explicit map pin, never geocode an address or use a place's camera position. */
export function coordinatesFromPropertyMapUrl(value: string): { latitude: number; longitude: number } | null {
  if (!isPropertyMapUrl(value)) return null;
  const url = new URL(value);
  const pair = (text: string | null) => {
    const match = text?.trim().match(/^([+-]?\d+(?:\.\d+)?),\s*([+-]?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const latitude = Number(match[1]), longitude = Number(match[2]);
    return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
  };
  if (url.hostname === 'maps.apple.com') {
    for (const key of ['coordinate', 'll', 'destination', 'daddr']) {
      const point = pair(url.searchParams.get(key));
      if (point) return point;
    }
    return null;
  }
  if (['maps.app.goo.gl', 'goo.gl', 'maps.apple'].includes(url.hostname)) return null;
  // A place URL may contain a camera @lat,lng distinct from its actual !3d,!4d pin.
  const pin = !/^\/maps\/dir(?:\/|$)/.test(url.pathname) && url.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)(?:!|\/|$)/);
  if (pin) return pair(`${pin[1]},${pin[2]}`);
  const pathPoint = url.pathname.match(/^\/maps\/(?:search|place)\/([^/]+)/);
  if (pathPoint) {
    try {
      const point = pair(decodeURIComponent(pathPoint[1]!).replaceAll('+', ' '));
      if (point) return point;
    } catch { return null; }
  }
  for (const key of ['destination', 'daddr', 'query', 'q']) {
    const point = pair(url.searchParams.get(key));
    if (point) return point;
  }
  if (/^\/maps\/(?:place|dir)(?:\/|$)/.test(url.pathname)) return null;
  const camera = url.pathname.match(/^\/maps\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\/|$)/);
  return camera ? pair(`${camera[1]},${camera[2]}`) : pair(url.searchParams.get('ll'));
}
