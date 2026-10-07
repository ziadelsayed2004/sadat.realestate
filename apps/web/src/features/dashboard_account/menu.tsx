import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function UserGuideIcon() {
  return <svg data-user-guide-icon="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" /><path d="M6 8h3M6 11h3M15 8h3M15 11h3" /></svg>;
}

export function DashboardAccountMenu({ locale, children, triggerClassName = '', settingsHref, settingsLabel, guideHref, signingOut, onSignOut }: {
  readonly locale: SupportedLocale;
  readonly children: ReactNode;
  readonly triggerClassName?: string;
  readonly settingsHref: string;
  readonly settingsLabel?: string;
  readonly guideHref: string;
  readonly signingOut: boolean;
  readonly onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);
  const label = locale === 'ar' ? 'قائمة الحساب' : 'Account menu';
  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
  useEffect(() => {
    if (!open) return undefined;
    const controls = menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)');
    const position = () => {
      const bounds = trigger.current?.getBoundingClientRect();
      if (!menu.current || !bounds) return;
      const width = menu.current.getBoundingClientRect().width;
      const height = menu.current.getBoundingClientRect().height;
      menu.current.style.left = `${Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8))}px`;
      menu.current.style.top = `${Math.max(8, Math.min(bounds.bottom + 8, window.innerHeight - height - 8))}px`;
    };
    position();
    controls?.[focusLast.current ? controls.length - 1 : 0]?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', position, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', close); window.removeEventListener('scroll', position, true); };
  }, [open]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) { focusLast.current = event.key === 'ArrowUp' || event.key === 'End'; setOpen(true); return; }
      const controls = items();
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + controls.length) % controls.length;
      controls[next]?.focus({ preventScroll: true });
    }
  };
  return <div className="dashboard-account" dir={locale === 'ar' ? 'rtl' : 'ltr'} ref={root} onKeyDown={onKeyDown} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button ref={trigger} type="button" className={`dashboard-account__trigger ${triggerClassName}`.trim()} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => { focusLast.current = false; setOpen(value => !value); }}>
      {children}<svg className="dashboard-account__chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
    </button>
    {open ? <div ref={menu} id={id} role="menu" aria-label={label} className="dashboard-account__menu" onMouseDown={event => {
      // Safari focuses the surrounding main element when a button is tapped.
      // Keep focus inside the menu so blur cannot remove it before the click.
      const item = event.target instanceof Element ? event.target.closest<HTMLElement>('[role="menuitem"]') : null;
      if (item && !item.matches(':disabled')) { event.preventDefault(); item.focus({ preventScroll: true }); }
    }}>
      <a role="menuitem" href={settingsHref}>{settingsLabel ?? (locale === 'ar' ? 'إعدادات الحساب' : 'Account settings')}</a>
      <a role="menuitem" href={guideHref}><UserGuideIcon />{locale === 'ar' ? 'دليل الاستخدام' : 'User guide'}</a>
      <button role="menuitem" type="button" className="dashboard-account__logout" disabled={signingOut} onClick={onSignOut}><img src="/assets/canonical/provider/navigation/logout.svg" alt="" width="18" height="18" />{signingOut ? (locale === 'ar' ? 'جاري تسجيل الخروج…' : 'Signing out…') : (locale === 'ar' ? 'تسجيل الخروج' : 'Sign out')}</button>
    </div> : null}
  </div>;
}
