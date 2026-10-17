import { useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';
import { RouteShellAuthContext } from '../routing/shells.tsx';

export function AdvertiserLink({ id, locale }: { id: string; locale: SupportedLocale }) {
  const auth = useContext(RouteShellAuthContext), [name, setName] = useState('');
  const header = auth?.getAuthorizationHeader?.();
  useEffect(() => { if (!header) return; let active = true; void new ApiClient().request(`/admin/providers/${id}`, { headers: { authorization: auth?.getAuthorizationHeader?.() ?? '' }, responseSchema: z.object({ data: z.object({ displayName: z.string().optional(), legalCompanyName: z.string().optional(), legalBusinessName: z.string().optional(), brandName: z.string().optional(), email: z.string().optional() }).passthrough() }) }).then(result => { if (active) { const data = result.data.data; setName(data.brandName ?? data.legalCompanyName ?? data.legalBusinessName ?? data.displayName ?? data.email ?? ''); } }, () => {}); return () => { active = false; }; }, [id, auth, header]);
  return <a href={`/admin/providers/${id}?lang=${locale}`}>{name || (locale === 'ar' ? 'فتح حساب المعلن' : 'Open advertiser account')}</a>;
}
