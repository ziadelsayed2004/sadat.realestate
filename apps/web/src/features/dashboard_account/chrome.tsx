import { createContext, useContext, useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { LocaleSwitcher } from '../localization/index.ts';

export const DashboardLocaleContext = createContext<((locale: SupportedLocale) => void) | undefined>(undefined);

export function DashboardLanguage({ locale }: { readonly locale: SupportedLocale }) {
  const onLocaleChange = useContext(DashboardLocaleContext);
  return (
    <div className="dashboard-sidebar-language">
      <span>{locale === 'ar' ? 'لغة العرض' : 'Display language'}</span>
      <LocaleSwitcher locale={locale} onLocaleChange={onLocaleChange} placement="up" />
    </div>
  );
}

/** Keep the desktop rail and compact drawer controlled by the same menu button. */
export function useDashboardNavigation(enabled = true) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!enabled || typeof window.matchMedia !== 'function') return;
    const compact = window.matchMedia('(max-width: 1100px)');
    setOpen(!compact.matches);
    const resize = (event: MediaQueryListEvent) => setOpen(!event.matches);
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="menu"], .custom-locale-switcher.is-open, .admin-attention__panel')) setOpen(false);
    };
    compact.addEventListener('change', resize);
    document.addEventListener('keydown', escape);
    return () => {
      compact.removeEventListener('change', resize);
      document.removeEventListener('keydown', escape);
    };
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !open || !window.matchMedia?.('(max-width: 1100px)').matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [enabled, open]);
  return { open, setOpen };
}
