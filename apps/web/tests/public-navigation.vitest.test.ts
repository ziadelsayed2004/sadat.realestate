import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installPublicNavigation } from '../src/features/frontend_foundation/public-navigation.ts';
import { publicPageState, pushPublicPage, savePublicListingView } from '../src/features/frontend_foundation/public-history.ts';

let stop: (() => void) | undefined;
// jsdom does not implement scrolling; individual restoration tests replace this
// with an assertion spy and the browser suite verifies actual positions.
beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
});

function click(href: string, options: MouseEventInit = {}): boolean {
  const link = document.createElement('a');
  link.href = href;
  document.body.append(link);
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...options });
  // Prevent jsdom's default navigation after checking whether the app handled it.
  let handled = false;
  const preventNative = () => { handled = event.defaultPrevented; event.preventDefault(); };
  document.addEventListener('click', preventNative, { once: true });
  link.dispatchEvent(event);
  link.remove();
  return handled;
}

const html = '<html><head><title>Articles</title><link rel="canonical" href="http://localhost/articles"></head><body><div id="app"></div><script>window.untrustedExecuted = true;</script></body></html>';

describe('public navigation', () => {
  it('waits for async content before positioning an initial fragment without resetting to the top', () => {
    window.history.replaceState({}, '', '/developers/builder?lang=ar#developer-contact');
    document.body.innerHTML = '<div id="app"><div aria-busy="true"></div></div>';
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 3000 });
    const scroll = vi.fn(); const anchorScroll = vi.fn();
    const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
    const tick = () => { const frame = frames.entries().next().value; if (frame) { frames.delete(frame[0]); frame[1](0); } };
    vi.stubGlobal('scrollTo', scroll);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    stop = installPublicNavigation(vi.fn());
    for (let index = 0; index < 5; index++) tick();
    expect(scroll).not.toHaveBeenCalled(); expect(anchorScroll).not.toHaveBeenCalled();
    document.querySelector('[aria-busy]')?.remove();
    const contact = document.createElement('section'); contact.id = 'developer-contact'; contact.scrollIntoView = anchorScroll;
    document.getElementById('app')?.append(contact);
    for (let index = 0; index < 4; index++) tick();
    expect(anchorScroll).toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled();
  });

  it('does not override the native fragment scroll when popstate arrives before the browser jumps', () => {
    window.history.replaceState({}, '', '/developers/builder?lang=ar');
    const scroll = vi.fn(); const frames = vi.fn(); const fetcher = vi.fn();
    vi.stubGlobal('scrollY', 700);
    vi.stubGlobal('scrollTo', scroll); vi.stubGlobal('requestAnimationFrame', frames); vi.stubGlobal('fetch', fetcher);
    stop = installPublicNavigation(vi.fn());
    expect(click('#developer-contact')).toBe(false);
    expect(publicPageState()?.scroll.y).toBe(700);
    // The new native fragment entry has no application state. It dispatches
    // popstate first, while scrollY still points at the previous section.
    window.history.pushState(null, '', '#developer-contact');
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(scroll).not.toHaveBeenCalled(); expect(frames).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
    expect(window.history.state).toBeNull();
    vi.stubGlobal('scrollY', 1900);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(publicPageState()?.scroll.y).toBe(1900);
  });

  it('leaves same-document anchors, modified clicks, auth, and external links to the browser', () => {
    window.history.replaceState({}, '', '/developers/builder?lang=ar');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    stop = installPublicNavigation(vi.fn());
    expect(click('#developer-contact')).toBe(false);
    expect(click('/articles', { ctrlKey: true })).toBe(false);
    expect(click('/articles', { metaKey: true })).toBe(false);
    expect(click('/auth/login')).toBe(false);
    expect(click('/provider')).toBe(false);
    expect(click('https://example.com/articles')).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.navigationPending).toBeUndefined();
  });

  it('commits only the latest navigation and never executes fetched scripts', async () => {
    window.history.replaceState({}, '', '/properties');
    let resolveFirst: (response: Response) => void = () => undefined;
    let firstSignal: AbortSignal | undefined;
    const fetcher = vi.fn()
      .mockImplementationOnce((_url, options) => { firstSignal = options.signal; return new Promise<Response>(resolve => { resolveFirst = resolve; }); })
      .mockResolvedValueOnce(new Response(html, { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const onNavigate = vi.fn();
    stop = installPublicNavigation(onNavigate);
    expect(click('/developers')).toBe(true);
    expect(click('/articles?lang=en')).toBe(true);
    await vi.waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    resolveFirst(new Response(html, { headers: { 'content-type': 'text/html' } }));
    await Promise.resolve();
    await Promise.resolve();
    expect(firstSignal?.aborted).toBe(true);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/articles');
    expect(document.title).toBe('Articles');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('http://localhost/articles');
    expect((window as unknown as Record<string, unknown>).untrustedExecuted).toBeUndefined();
    expect(document.documentElement.dataset.navigationPending).toBeUndefined();
  });

  it('restores a history entry after delayed content is ready and keeps separate positions for repeated URLs', async () => {
    window.history.replaceState({ otherRouterState: 'preserved' }, '', '/properties?page=2&lang=en');
    vi.stubGlobal('scrollY', 1300);
    const scroll = vi.fn();
    vi.stubGlobal('scrollTo', scroll);
    const frames = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    const tick = () => { const next = frames.entries().next().value; if (next) { frames.delete(next[0]); next[1](0); } };
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 4000 });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(html, { headers: { 'content-type': 'text/html' } })));
    const onNavigate = vi.fn();
    stop = installPublicNavigation(onNavigate);
    savePublicListingView('list');
    expect(click('/properties/published-home?lang=en')).toBe(true);
    await vi.waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    const detailsState = window.history.state;
    expect(publicPageState()?.from?.url).toBe('/properties?page=2&lang=en');
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    scroll.mockClear();
    // Simulate the browser traversing back to the original entry.
    const sourceId = publicPageState()!.from!.id;
    window.history.replaceState({ otherRouterState: 'preserved', sadatPublicPage: { id: sourceId, scroll: { x: 0, y: 1300 }, listingView: 'list' } }, '', '/properties?page=2&lang=en');
    document.body.innerHTML = '<div id="app"><div aria-busy="true"></div></div>';
    window.dispatchEvent(new PopStateEvent('popstate'));
    await vi.waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(2));
    for (let index = 0; index < 5; index++) tick();
    expect(scroll).not.toHaveBeenCalled();
    document.querySelector('[aria-busy]')?.remove();
    for (let index = 0; index < 4; index++) tick();
    expect(scroll).toHaveBeenLastCalledWith({ top: 1300, left: 0, behavior: 'instant' });
    expect(window.history.state.otherRouterState).toBe('preserved');
    expect(publicPageState()?.listingView).toBe('list');
    vi.stubGlobal('scrollY', 2200);
    pushPublicPage('/properties?page=2&lang=en');
    expect(publicPageState()?.id).not.toBe(sourceId);
    expect(publicPageState()?.scroll.y).toBe(0);
    expect(detailsState.sadatPublicPage.scroll.y).toBe(0);
  });

  it('uses history back for the results link but retains normal navigation for a direct detail visit', async () => {
    window.history.replaceState({}, '', '/properties?page=3&lang=ar');
    pushPublicPage('/properties/published-home?lang=ar');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response(html, { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    stop = installPublicNavigation(vi.fn());
    const link = document.createElement('a');
    link.href = '/properties?page=3&lang=ar';
    link.setAttribute('data-public-return', '');
    document.body.append(link);
    link.click();
    expect(back).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
    window.history.replaceState({}, '', '/properties/published-home?lang=ar');
    link.href = '/properties?lang=ar';
    link.click();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(back).toHaveBeenCalledTimes(1);
  });
});
