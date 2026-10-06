import { resolveRoute } from '../../routes/route-table.js';
import { ensurePublicPageState, publicPageState, publicReturnUrl, pushPublicPage, savePublicScroll } from './public-history.ts';

function publicUrl(url: URL): boolean {
  const route = resolveRoute(url.href);
  return route.kind === 'matched' && route.id.startsWith('public-');
}

/** Keep public navigation in the hydrated app. Auth and private routes retain
 * their server navigation and access checks. No fetched scripts are executed. */
export function installPublicNavigation(onNavigate: (source: Document, url: URL) => void): () => void {
  let pathname = window.location.pathname;
  let pending: AbortController | undefined;
  ensurePublicPageState();
  let cancelRestoration = () => {};
  let restoring = false;
  let scrollTimer: ReturnType<typeof setTimeout> | undefined;
  const previousRestoration = window.history.scrollRestoration;
  if (publicUrl(new URL(window.location.href))) window.history.scrollRestoration = 'manual';

  const savePosition = () => {
    if (!restoring && publicUrl(new URL(window.location.href)) && pathname === window.location.pathname && !document.documentElement.dataset.navigationPending && !document.querySelector('#app [aria-busy="true"]')) savePublicScroll();
  };
  const onScroll = () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(savePosition, 120);
  };

  const positionPage = (target: URL, returning: boolean) => {
    cancelRestoration();
    // New pages start at the top as soon as React commits, including while their
    // data/fonts are loading. Only history returns restore an earlier position.
    if (!returning) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const saved = publicPageState()?.scroll ?? { x: 0, y: 0 };
    restoring = true;
    const deadline = performance.now() + 10_000;
    let frame = 0;
    let passes = 0;
    let settled = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', onKey);
      restoring = false;
    };
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stop();
    };
    const restore = () => {
      // React and the query loader must commit before checking the page height.
      passes += 1;
      const ready = passes > 2 && !document.querySelector('#app [aria-busy="true"]') && document.fonts?.status !== 'loading';
      const top = returning ? saved.y : 0;
      const room = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
      if ((ready && room >= top - 1) || performance.now() >= deadline) {
        const anchor = !returning && target.hash ? document.getElementById(decodeURIComponent(target.hash.slice(1))) : null;
        if (anchor) anchor.scrollIntoView();
        else window.scrollTo({ top, left: returning ? saved.x : 0, behavior: 'instant' });
        settled += 1;
        if (settled >= 2 || performance.now() >= deadline) {
          stop();
          if (!returning) {
            const heading = document.querySelector<HTMLElement>('#app h1');
            heading?.setAttribute('tabindex', '-1');
            heading?.focus({ preventScroll: true });
          }
          return;
        }
      } else settled = 0;
      frame = requestAnimationFrame(restore);
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', onKey);
    cancelRestoration = stop;
    frame = requestAnimationFrame(restore);
  };

  const navigate = async (target: URL, popstate: boolean) => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    document.documentElement.dataset.navigationPending = 'true';
    try {
      const response = await fetch(target.href, { signal: controller.signal, headers: { Accept: 'text/html' } });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Public navigation unavailable');
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      const resolved = new URL(response.url || target.href);
      if (resolved.origin !== window.location.origin || !publicUrl(resolved) || !source.getElementById('app')) throw new Error('Unsupported navigation response');
      if (controller.signal.aborted) return;
      if (!popstate) pushPublicPage(target.pathname + target.search + target.hash);
      pathname = target.pathname;
      document.title = source.title;
      const description = source.querySelector('meta[name="description"]')?.getAttribute('content');
      if (description !== null && description !== undefined) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
      for (const selector of ['link[rel="canonical"]', 'meta[property^="og:"]', 'meta[name^="twitter:"]']) {
        document.head.querySelectorAll(selector).forEach(element => element.remove());
        source.head.querySelectorAll(selector).forEach(element => document.head.append(document.importNode(element, true)));
      }
      onNavigate(source, target);
      positionPage(target, popstate);
    } catch {
      if (!controller.signal.aborted) window.location.assign(target.href);
    } finally {
      if (pending === controller) delete document.documentElement.dataset.navigationPending;
    }
  };

  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self') || link.hasAttribute('download') || link.rel.includes('external')) return;
    const target = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);
    if (target.origin !== current.origin || !publicUrl(current) || !publicUrl(target)) return;
    if (link.hasAttribute('data-public-return') && publicReturnUrl('') === target.pathname + target.search + target.hash) {
      event.preventDefault();
      savePosition();
      window.history.back();
      return;
    }
    // Same-document anchors must remain native: no fetch, no masking, no reload.
    if (target.pathname === current.pathname && target.search === current.search) {
      cancelRestoration();
      return;
    }
    event.preventDefault();
    savePosition();
    cancelRestoration();
    void navigate(target, false);
  };

  const popstate = () => {
    pending?.abort();
    cancelRestoration();
    clearTimeout(scrollTimer);
    ensurePublicPageState();
    delete document.documentElement.dataset.navigationPending;
    const target = new URL(window.location.href);
    // Listing filters own their query history; do not reload their component.
    if (target.pathname === pathname) {
      positionPage(target, true);
      return;
    }
    if (publicUrl(target)) void navigate(target, true);
    else window.location.reload();
  };

  document.addEventListener('click', click);
  window.addEventListener('popstate', popstate);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pagehide', savePosition);
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted && publicUrl(new URL(window.location.href))) positionPage(new URL(window.location.href), true);
  };
  window.addEventListener('pageshow', onPageShow);
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (publicUrl(new URL(window.location.href)) && (navigation?.type === 'back_forward' || navigation?.type === 'reload')) positionPage(new URL(window.location.href), true);
  return () => {
    savePosition();
    cancelRestoration();
    clearTimeout(scrollTimer);
    window.history.scrollRestoration = previousRestoration;
    pending?.abort();
    delete document.documentElement.dataset.navigationPending;
    document.removeEventListener('click', click);
    window.removeEventListener('popstate', popstate);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pagehide', savePosition);
    window.removeEventListener('pageshow', onPageShow);
  };
}
