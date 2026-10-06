import { afterEach, describe, expect, it, vi } from 'vitest';
import { installPublicNavigation } from '../src/features/frontend_foundation/public-navigation.ts';
import { publicPageState, pushPublicPage, savePublicListingView } from '../src/features/frontend_foundation/public-history.ts';

let stop: (() => void) | undefined;
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
