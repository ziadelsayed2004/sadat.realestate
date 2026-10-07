const stateKey = 'sadatPublicPage';

interface PublicPageState {
  id: string;
  scroll: { x: number; y: number };
  from?: { id: string; url: string };
  listingView?: 'list' | 'grid';
  filtersExpanded?: boolean;
}

export function publicPageState(): PublicPageState | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = window.history.state?.[stateKey] as PublicPageState | undefined;
  return value && typeof value.id === 'string' && Number.isFinite(value.scroll?.x) && Number.isFinite(value.scroll?.y) ? value : undefined;
}

function writePageState(value: PublicPageState): void {
  window.history.replaceState({ ...window.history.state, [stateKey]: value }, '');
}

export function ensurePublicPageState(): PublicPageState {
  const existing = publicPageState();
  if (existing) return existing;
  const value: PublicPageState = { id: crypto.randomUUID(), scroll: { x: window.scrollX, y: window.scrollY } };
  writePageState(value);
  return value;
}

export function savePublicScroll(position = { x: window.scrollX, y: window.scrollY }): void {
  const value = ensurePublicPageState();
  writePageState({ ...value, scroll: position });
}

export function savePublicListingView(view: 'list' | 'grid'): void {
  writePageState({ ...ensurePublicPageState(), listingView: view });
}

export function savePublicListingFilters(expanded: boolean): void {
  writePageState({ ...ensurePublicPageState(), filtersExpanded: expanded });
}

/** Each history entry owns its position, including repeated visits to one URL. */
export function pushPublicPage(url: string, preserveListingView = false): void {
  savePublicScroll();
  const previous = ensurePublicPageState();
  const value: PublicPageState = {
    id: crypto.randomUUID(),
    scroll: preserveListingView ? previous.scroll : { x: 0, y: 0 },
    from: { id: previous.id, url: window.location.pathname + window.location.search + window.location.hash },
    ...(preserveListingView && previous.listingView ? { listingView: previous.listingView } : {}),
    ...(preserveListingView && previous.filtersExpanded !== undefined ? { filtersExpanded: previous.filtersExpanded } : {})
  };
  window.history.pushState({ [stateKey]: value }, '', url);
}

export function publicReturnUrl(fallback: string): string {
  const from = publicPageState()?.from;
  if (!from || typeof from.url !== 'string' || typeof from.id !== 'string') return fallback;
  try {
    const url = new URL(from.url, window.location.origin);
    return url.origin === window.location.origin ? url.pathname + url.search + url.hash : fallback;
  } catch { return fallback; }
}
