import { useContext, useEffect, useState } from 'react';
import { adminNotificationListSuccessEnvelopeSchema, type AuthRoleType, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient, ApiClientError } from '../contracts/index.ts';
import { RouteShellAuthContext } from '../routing/shells.tsx';

export function PublicNotificationBell({ role, locale }: { role: AuthRoleType; locale: SupportedLocale }) {
  const authorization = useContext(RouteShellAuthContext);
  const header = authorization?.getAuthorizationHeader?.();
  const [state, setState] = useState<{ header: string; role: AuthRoleType; unread: number }>();
  const unread = state?.header === header && state?.role === role ? state.unread : 0;

  useEffect(() => {
    const client = new ApiClient();
    let stopped = false;
    let controller: AbortController | undefined;
    let pending = false;
    let queued = false;
    const update = () => {
      if (stopped || document.visibilityState === 'hidden') return;
      let currentHeader = authorization?.getAuthorizationHeader?.();
      if (!currentHeader) { setState(undefined); return; }
      if (pending) { queued = true; return; }
      pending = true;
      controller = new AbortController();
      const signal = controller.signal;
      const request = () => client.request(`/${role}/notifications`, {
        query: { page: 1, limit: 1 }, headers: { authorization: currentHeader! }, signal,
        responseSchema: adminNotificationListSuccessEnvelopeSchema
      });
      void request().catch(async error => {
        if (!(error instanceof ApiClientError) || error.status !== 401 || !authorization?.refresh || stopped || signal.aborted) throw error;
        await authorization.refresh();
        if (stopped || signal.aborted) throw error;
        currentHeader = authorization.getAuthorizationHeader?.();
        if (!currentHeader) throw error;
        return request();
      }).then(result => {
        if (!stopped && currentHeader === authorization?.getAuthorizationHeader?.()) {
          const data = result.data.data;
          setState({ header: currentHeader!, role, unread: data.unreadCount + (role === 'admin' ? data.attention?.total ?? 0 : 0) });
        }
      }).catch(error => {
        if (stopped) return;
        if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) setState(undefined);
      }).finally(() => {
        pending = false;
        if (queued && !stopped) { queued = false; update(); }
      });
    };
    update();
    const unsubscribe = authorization?.subscribe?.(() => { setState(undefined); update(); });
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      stopped = true;
      unsubscribe?.();
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [authorization, role]);

  const label = locale === 'ar' ? 'الإشعارات' : 'Notifications';
  const countLabel = locale === 'ar' ? `${unread} إشعارات غير مقروءة` : `${unread} unread notifications`;
  return <a className="public-homepage__notifications" href={`/${role}/notifications?lang=${locale}`} aria-label={unread > 0 ? `${label}: ${countLabel}` : label}>
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    {unread > 0 && <span className="public-homepage__notification-count" aria-hidden="true">{unread > 99 ? '99+' : new Intl.NumberFormat(locale).format(unread)}</span>}
  </a>;
}
