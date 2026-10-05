import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { adminNotificationListSuccessEnvelopeSchema, type AdminAttention, type AdminAttentionKey, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient, ApiClientError } from '../contracts/index.ts';

const destinations: ReadonlyArray<{ key: AdminAttentionKey; path: string; ar: string; en: string }> = [
  { key: 'verification', path: '/admin/verification', ar: 'طلبات توثيق المزودين', en: 'Provider verification' },
  { key: 'property-review', path: '/admin/properties/review', ar: 'عقارات للمراجعة', en: 'Property submissions' },
  { key: 'project-review', path: '/admin/projects/review', ar: 'مشروعات للمراجعة', en: 'Project submissions' },
  { key: 'account-reports', path: '/admin/account-reports', ar: 'بلاغات الحسابات', en: 'Account reports' },
  { key: 'property-reports', path: '/admin/property-reports', ar: 'بلاغات العقارات', en: 'Property reports' },
  { key: 'request-issues', path: '/admin/request-issues', ar: 'بلاغات ومشكلات الطلبات', en: 'Request issues' },
  { key: 'community', path: '/admin/community?status=draft', ar: 'منشورات المجتمع للمراجعة', en: 'Community submissions' },
  { key: 'community-reports', path: '/admin/community/moderation', ar: 'بلاغات المجتمع', en: 'Community reports' },
  { key: 'contact-requests', path: '/admin/contact-requests', ar: 'طلبات التواصل', en: 'Contact requests' },
  { key: 'viewing-requests', path: '/admin/viewing-requests', ar: 'طلبات المعاينة', en: 'Viewing requests' },
  { key: 'search-requests', path: '/admin/search-requests', ar: 'طلبات البحث عن عقار', en: 'Property search requests' },
  { key: 'customer-requests', path: '/admin/customer-requests', ar: 'طلبات العملاء', en: 'Customer requests' },
  { key: 'advertising', path: '/admin/ads/requests', ar: 'طلبات الإعلانات', en: 'Advertising requests' },
  { key: 'payment-review', path: '/admin/ads/payments/pending-review', ar: 'إثباتات الدفع للمراجعة', en: 'Payment review' }
];

type AttentionData = { attention?: AdminAttention; unread: number; ready: boolean; unavailable?: boolean };
type AttentionState = AttentionData & { refresh: () => void };
export const AdminAttentionContext = createContext<AttentionState>({ unread: 0, ready: false, refresh: () => undefined });
const REFRESH_EVENT = 'sadat-admin-attention-refresh';
export function refreshAdminAttention(): void { window.dispatchEvent(new Event(REFRESH_EVENT)); }

export function AdminAttentionProvider({ enabled, authorization, children }: { enabled: boolean; authorization?: { getAuthorizationHeader?: (() => string | undefined) | undefined } | undefined; children: ReactNode }) {
  const [state, setState] = useState<AttentionData>({ unread: 0, ready: false });
  const refresh = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!enabled || !authorization?.getAuthorizationHeader) { setState({ unread: 0, ready: false }); return; }
    let stopped = false;
    let controller: AbortController | undefined;
    let inFlight = false;
    const client = new ApiClient();
    const update = () => {
      const header = authorization.getAuthorizationHeader?.();
      if (!header) { setState({ unread: 0, ready: false }); return; }
      if (stopped || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      controller = new AbortController();
      void client.request('/admin/notifications', { query: { page: 1, limit: 1 }, headers: { authorization: header }, signal: controller.signal, responseSchema: adminNotificationListSuccessEnvelopeSchema }).then(result => {
        if (!stopped && header === authorization.getAuthorizationHeader?.()) setState({ ...(result.data.data.attention ? { attention: result.data.data.attention } : {}), unread: result.data.data.unreadCount, ready: true });
      }).catch(error => {
        // Do not replace real counts with a fabricated zero during an outage.
        if (!stopped) {
          if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) setState({ unread: 0, ready: false, unavailable: true });
          else setState(current => ({ ...current, unavailable: true }));
        }
      }).finally(() => { inFlight = false; });
    };
    refresh.current = update;
    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    window.addEventListener(REFRESH_EVENT, update);
    return () => {
      stopped = true; controller?.abort(); window.clearInterval(timer); refresh.current = () => undefined;
      window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); window.removeEventListener(REFRESH_EVENT, update);
    };
  }, [enabled, authorization]);
  return <AdminAttentionContext.Provider value={{ ...state, refresh: () => refresh.current() }}>{children}</AdminAttentionContext.Provider>;
}

export function adminAttentionCount(id: string, attention: AdminAttention | undefined, unread = 0): number {
  const counts = attention?.counts ?? {};
  if (id === 'notifications') return (attention?.total ?? 0) + unread;
  if (id === 'properties') return counts['property-review'] ?? 0;
  if (id === 'projects') return counts['project-review'] ?? 0;
  if (id === 'providers') return counts.verification ?? 0;
  if (id === 'payment-proofs') return counts['payment-review'] ?? 0;
  if (id === 'requests') return (counts['contact-requests'] ?? 0) + (counts['viewing-requests'] ?? 0) + (counts['search-requests'] ?? 0) + (counts['customer-requests'] ?? 0);
  return counts[id as AdminAttentionKey] ?? 0;
}

export function AdminAttentionBadge({ count, locale, id }: { count: number; locale: SupportedLocale; id?: string }) {
  if (count <= 0) return null;
  return <span className="admin-attention__badge" data-testid={id ? `admin-attention-${id}` : undefined} aria-label={locale === 'ar' ? `${count} تنبيهات` : `${count} alerts`}>{count > 99 ? '99+' : new Intl.NumberFormat(locale).format(count)}</span>;
}

function hrefFor(path: string, locale: SupportedLocale): string {
  const url = new URL(path, 'https://example.invalid'); url.searchParams.set('lang', locale); return url.pathname + url.search;
}

export function AdminAttentionQueues({ locale, attention }: { locale: SupportedLocale; attention?: AdminAttention | undefined }) {
  if (!attention?.total) return null;
  return <section className="admin-attention__queues" aria-label={locale === 'ar' ? 'تحتاج المراجعة' : 'Needs attention'}>
    <h2>{locale === 'ar' ? 'تحتاج المراجعة' : 'Needs attention'}</h2>
    <p>{locale === 'ar' ? 'العدد يقل بعد مراجعة العنصر أو إغلاقه، وليس بمجرد فتح الصفحة.' : 'Counts decrease after reviewing or closing an item, not simply opening its page.'}</p>
    <ul>{destinations.filter(item => (attention.counts[item.key] ?? 0) > 0).map(item => <li key={item.key}><a href={hrefFor(item.path, locale)}><span>{item[locale]}</span><AdminAttentionBadge count={attention.counts[item.key]!} locale={locale} /></a></li>)}</ul>
  </section>;
}

export function AdminAttentionBell({ locale }: { locale: SupportedLocale }) {
  const state = useContext(AdminAttentionContext);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 80 });
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const bounds = button.current?.getBoundingClientRect();
      if (!bounds) return;
      const width = Math.min(360, window.innerWidth - 32);
      setPosition({ left: Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16)), top: bounds.bottom + 12 });
    };
    place();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  const count = (state.attention?.total ?? 0) + state.unread;
  return <div className="admin-attention" ref={wrapper} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <button type="button" ref={button} className="admin-attention__bell" aria-label={locale === 'ar' ? `التنبيهات: ${count}` : `Alerts: ${count}`} aria-expanded={open} aria-controls="admin-attention-panel" onClick={() => { setOpen(value => !value); state.refresh(); }}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <AdminAttentionBadge count={count} locale={locale} />
    </button>
    {open ? <div className="admin-attention__panel" style={{ left: position.left, top: position.top, maxHeight: `calc(100dvh - ${position.top + 16}px)` }} id="admin-attention-panel" role="region" aria-label={locale === 'ar' ? 'التنبيهات الجديدة' : 'New alerts'}>
      <AdminAttentionQueues locale={locale} attention={state.attention} />
      {state.unavailable ? <p role="status">{locale === 'ar' ? 'تعذر تحديث التنبيهات. اضغط على الجرس لإعادة المحاولة.' : 'Alerts could not refresh. Press the bell to retry.'}</p> : !state.ready ? <p role="status">{locale === 'ar' ? 'جارٍ تحميل التنبيهات…' : 'Loading alerts…'}</p> : count === 0 ? <p>{locale === 'ar' ? 'لا توجد عناصر جديدة تحتاج المراجعة.' : 'No new items need attention.'}</p> : null}
      <a className="admin-attention__inbox" href={hrefFor('/admin/notifications', locale)}>{locale === 'ar' ? 'عرض كل الإشعارات' : 'View all notifications'}<AdminAttentionBadge count={state.unread} locale={locale} /></a>
    </div> : null}
  </div>;
}
