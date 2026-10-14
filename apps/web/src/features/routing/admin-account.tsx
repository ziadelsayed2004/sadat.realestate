import { createContext, useEffect, useState, type ReactNode } from 'react';
import { adminAccountPresenceSuccessEnvelopeSchema, type AdminAccountPresenceData } from '@sadat-real-estate/contracts';
import { ApiClient, ApiClientError } from '../contracts/index.ts';
import type { RouteShellAuthClient } from './shells.tsx';

export const AdminAccountContext = createContext<AdminAccountPresenceData | undefined>(undefined);

export function AdminAccountProvider({ enabled, authorization, children }: { enabled: boolean; authorization?: RouteShellAuthClient | undefined; children: ReactNode }) {
  const [account, setAccount] = useState<AdminAccountPresenceData>();
  useEffect(() => {
    setAccount(undefined);
    if (!enabled || !authorization?.getAuthorizationHeader) return;
    let stopped = false;
    let inFlight = false;
    let controller: AbortController | undefined;
    const client = new ApiClient();
    const update = () => {
      const header = authorization.getAuthorizationHeader?.();
      if (!header) { setAccount(undefined); return; }
      if (stopped || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      controller = new AbortController();
      const signal = controller.signal;
      let currentHeader = header;
      const request = () => client.request('/admin/account/presence', { method: 'POST', json: {}, headers: { authorization: currentHeader }, signal, responseSchema: adminAccountPresenceSuccessEnvelopeSchema });
      void request().catch(async error => {
        if (!(error instanceof ApiClientError) || error.status !== 401 || !authorization.refresh || signal.aborted) throw error;
        await authorization.refresh();
        if (stopped || signal.aborted) throw error;
        const refreshed = authorization.getAuthorizationHeader?.();
        if (!refreshed) throw error;
        currentHeader = refreshed;
        return request();
      }).then(result => {
        if (!stopped && currentHeader === authorization.getAuthorizationHeader?.()) setAccount(result.data.data);
      }).catch(() => { if (!stopped) setAccount(undefined); }).finally(() => { inFlight = false; });
    };
    update();
    const unsubscribe = authorization.subscribe?.(() => update());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => { stopped = true; controller?.abort(); unsubscribe?.(); window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [enabled, authorization]);
  return <AdminAccountContext.Provider value={account}>{children}</AdminAccountContext.Provider>;
}
