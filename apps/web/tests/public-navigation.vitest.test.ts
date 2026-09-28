import { afterEach, describe, expect, it, vi } from 'vitest';
import { installPublicNavigation } from '../src/features/frontend_foundation/public-navigation.ts';

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.unstubAllGlobals();
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
});
