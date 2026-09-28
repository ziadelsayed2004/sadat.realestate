(() => {
  const intro = document.getElementById('site-intro');
  if (!intro || location.pathname !== '/' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    if (sessionStorage.getItem('sadat.home-intro.seen')) return;
    sessionStorage.setItem('sadat.home-intro.seen', '1');
  } catch {
    // Storage disabled: skip the intro to avoid repeating it on each visit.
    return;
  }
  intro.hidden = false;
  const startedAt = performance.now();
  let leaving = false;
  const dismiss = () => {
    if (leaving) return;
    leaving = true;
    document.removeEventListener('sadat:app-ready', onReady);
    setTimeout(() => {
      intro.dataset.leaving = '';
      setTimeout(() => intro.remove(), 180);
    }, Math.max(0, 850 - (performance.now() - startedAt)));
  };
  const onReady = () => dismiss();
  document.addEventListener('sadat:app-ready', onReady, { once: true });
  setTimeout(dismiss, 1500);
  window.addEventListener('pagehide', () => intro.remove(), { once: true });
})();
