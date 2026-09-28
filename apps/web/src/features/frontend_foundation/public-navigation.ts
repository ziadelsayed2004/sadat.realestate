import { resolveRoute } from '../../routes/route-table.js';

function publicUrl(url: URL): boolean {
  const route = resolveRoute(url.href);
  return route.kind === 'matched' && route.id.startsWith('public-');
}

/** Keep public navigation in the hydrated app. Auth and private routes retain
 * their server navigation and access checks. No fetched scripts are executed. */
export function installPublicNavigation(onNavigate: (source: Document, url: URL) => void): () => void {
  let pathname = window.location.pathname;
  let pending: AbortController | undefined;

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
      if (!popstate) window.history.pushState({}, '', target.pathname + target.search + target.hash);
      pathname = target.pathname;
      document.title = source.title;
      const description = source.querySelector('meta[name="description"]')?.getAttribute('content');
      if (description !== null && description !== undefined) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
      for (const selector of ['link[rel="canonical"]', 'meta[property^="og:"]', 'meta[name^="twitter:"]']) {
        document.head.querySelectorAll(selector).forEach(element => element.remove());
        source.head.querySelectorAll(selector).forEach(element => document.head.append(document.importNode(element, true)));
      }
      onNavigate(source, target);
      requestAnimationFrame(() => {
        if (controller.signal.aborted) return;
        const anchor = target.hash ? document.getElementById(decodeURIComponent(target.hash.slice(1))) : null;
        if (anchor) anchor.scrollIntoView();
        else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        const heading = document.querySelector<HTMLElement>('#app h1');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      });
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
    // Same-document anchors must remain native: no fetch, no masking, no reload.
    if (target.pathname === current.pathname && target.search === current.search) return;
    event.preventDefault();
    void navigate(target, false);
  };

  const popstate = () => {
    pending?.abort();
    delete document.documentElement.dataset.navigationPending;
    const target = new URL(window.location.href);
    // Listing filters own their query history; do not reload their component.
    if (target.pathname === pathname) return;
    if (publicUrl(target)) void navigate(target, true);
    else window.location.reload();
  };

  document.addEventListener('click', click);
  window.addEventListener('popstate', popstate);
  return () => {
    pending?.abort();
    delete document.documentElement.dataset.navigationPending;
    document.removeEventListener('click', click);
    window.removeEventListener('popstate', popstate);
  };
}
