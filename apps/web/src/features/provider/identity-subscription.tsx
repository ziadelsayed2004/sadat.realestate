import { useEffect, useMemo, useState } from 'react';
import { publicIdentitySubscriptionSuccessEnvelopeSchema, type PublicIdentitySubscription, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import type { ProviderAuthorizationSource } from './data.ts';

export function ProviderIdentitySubscription({ locale, authorization, apiOrigin }: { locale: SupportedLocale; authorization?: ProviderAuthorizationSource | undefined; apiOrigin?: string | undefined }) {
  const ar = locale === 'ar';
  const client = useMemo(() => new ApiClient(apiOrigin ? { baseUrl: apiOrigin } : {}), [apiOrigin]);
  const [data, setData] = useState<PublicIdentitySubscription>();
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setFailed(false);
    void client.request('/provider/public-identity-subscription', { signal: controller.signal, headers: { authorization: authorization?.getAuthorizationHeader?.() ?? '' }, responseSchema: publicIdentitySubscriptionSuccessEnvelopeSchema })
      .then(result => { if (!controller.signal.aborted) setData(result.data.data); }, () => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [client, authorization, attempt]);
  const date = (value: string | undefined) => value ? new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  const status = data?.visible ? ar ? 'الاشتراك ساري — الهوية ظاهرة الآن' : 'Active — identity visible now' : data?.status === 'active' && data.startAt && new Date(data.startAt) > new Date() ? ar ? 'مجدول — يبدأ في الموعد أدناه' : 'Scheduled — starts below' : ar ? 'الاشتراك غير ساري حاليًا' : 'Subscription is not currently active';
  return <section className="provider-settings__panel" id="provider-display-subscription"><h2>{ar ? 'اشتراك ظهور اسم وصورة مقدم العقار' : 'Provider identity display subscription'}</h2><p>{ar ? 'تتولى الإدارة التفعيل والتجديد بعد تأكيد السداد خارج المنصة. الاشتراك خاص بظهور الاسم والصورة، ولا يمنح وصولًا لبيانات العملاء أو يغيّر اتفاق العمولة للشركة.' : 'Administration activates and renews the subscription after confirming external payment. It controls name/photo visibility, without granting customer data access or changing company commission agreements.'}</p>{failed ? <><p role="alert">{ar ? 'تعذر تحميل الاشتراك.' : 'Could not load subscription.'}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></> : data ? <><p role="status">{status}</p><dl><dt>{ar ? 'البداية — توقيت مصر' : 'Start — Egypt time'}</dt><dd>{date(data.startAt)}</dd><dt>{ar ? 'النهاية — توقيت مصر' : 'End — Egypt time'}</dt><dd>{date(data.endAt)}</dd></dl><p>{ar ? 'للتفعيل أو التجديد تواصل مع إدارة المنصة. الإعلانات المدفوعة خدمة منفصلة.' : 'Contact platform administration to activate or renew. Advertising is a separate service.'}</p></> : <p>{ar ? 'جارٍ تحميل الاشتراك…' : 'Loading subscription…'}</p>}</section>;
}
