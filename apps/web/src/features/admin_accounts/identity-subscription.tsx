import { useEffect, useMemo, useState } from 'react';
import { publicIdentitySubscriptionSuccessEnvelopeSchema, type PublicIdentitySubscription, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient, ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import { egyptInstant, egyptLocalDateTime } from '../public/egypt-time.ts';

export function OfficeIdentitySubscription({ providerId, locale, authorization, apiOrigin }: {
  providerId: string; locale: SupportedLocale; authorization?: { getAuthorizationHeader?: () => string | undefined } | undefined; apiOrigin?: string | undefined;
}) {
  const ar = locale === 'ar'; const client = useMemo(() => new ApiClient(apiOrigin ? { baseUrl: apiOrigin } : {}), [apiOrigin]);
  const [data, setData] = useState<PublicIdentitySubscription>(); const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [paid, setPaid] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  const path = `/admin/providers/${providerId}/public-identity-subscription`;
  useEffect(() => {
    const controller = new AbortController();
    void client.request(path, { signal: controller.signal, headers: { authorization: authorization?.getAuthorizationHeader?.() ?? '' }, responseSchema: publicIdentitySubscriptionSuccessEnvelopeSchema })
      .then(value => { if (!controller.signal.aborted) { const row = value.data.data; setData(row); setError(''); setStart(row.startAt ? egyptLocalDateTime(new Date(row.startAt)) : egyptLocalDateTime(new Date())); setEnd(row.endAt ? egyptLocalDateTime(new Date(row.endAt)) : ''); setPaid(row.paymentConfirmed); } })
      .catch(() => { if (!controller.signal.aborted) setError(ar ? 'تعذر تحميل اشتراك الظهور. أعد المحاولة.' : 'Could not load the display subscription. Retry.'); });
    return () => controller.abort();
  }, [client, path, authorization, attempt, ar]);
  async function save(status: 'active' | 'inactive') {
    if (!data) return;
    const from = egyptInstant(start); const to = egyptInstant(end);
    if (status === 'active' && (!paid || !from || !to || to <= from || to <= new Date())) { setError(ar ? 'أكد استلام الدفع خارج المنصة وحدد بداية ونهاية صحيحتين.' : 'Confirm external payment and enter a valid start and end.'); return; }
    setBusy(true); setError('');
    try {
      const result = await client.request(path, { method: 'PUT', headers: { authorization: authorization?.getAuthorizationHeader?.() ?? '' }, responseSchema: publicIdentitySubscriptionSuccessEnvelopeSchema,
        json: { status, paymentConfirmed: paid, ...(from ? { startAt: from.toISOString() } : {}), ...(to ? { endAt: to.toISOString() } : {}), expectedVersion: data.version } });
      setData(result.data.data);
    } catch (failure) { setError(failure instanceof ApiClientError && failure.status === 409 ? ar ? 'عدّل موظف آخر الاشتراك. أعد تحميله وراجع المدة قبل الحفظ.' : 'Another employee changed this subscription. Reload and review the dates.' : ar ? 'تعذر الحفظ. راجع الصلاحيات والمدة.' : 'Could not save. Check permission and dates.'); }
    finally { setBusy(false); }
  }
  return <section id="provider-subscription-form" className="admin-accounts__detail-card admin-office-identity" aria-label={ar ? 'ظهور المكتب للزوار' : 'Office public identity'} aria-busy={busy || (!data && !error)}>
    <header className="admin-office-identity__heading">
      <h2>{ar ? 'ظهور المكتب للزوار' : 'Office public identity'}</h2>
      {data ? <p className="admin-accounts__badge" data-tone={data.visible ? 'success' : 'neutral'} role="status">{data.visible ? ar ? 'ظاهر الآن' : 'Visible now' : ar ? 'مخفي الآن' : 'Hidden now'}</p> : null}
    </header>
    <p className="admin-office-identity__description">{ar ? 'الاشتراك يعرض اسم وصورة المكتب فقط. بيانات العميل ووسائل التواصل تظل لدى الإدارة.' : 'The subscription displays only the office name and image. Customer details and contact remain with the administration.'}</p>
    {data ? <><form onSubmit={event => { event.preventDefault(); void save('active'); }}>
      <fieldset className="admin-office-identity__period" disabled={busy || !data.canManage}>
        <legend>{ar ? 'مدة الظهور — بتوقيت مصر' : 'Display period — Egypt time'}</legend>
        <div className="admin-office-identity__dates">
          <label>{ar ? 'بداية الظهور' : 'Start'}<input type="datetime-local" dir="ltr" value={start} onChange={event => setStart(event.target.value)} required /></label>
          <label>{ar ? 'نهاية الظهور' : 'End'}<input type="datetime-local" dir="ltr" value={end} onChange={event => setEnd(event.target.value)} required /></label>
        </div>
        <label className="admin-office-identity__payment"><input type="checkbox" checked={paid} onChange={event => setPaid(event.target.checked)} /><span>{ar ? 'أؤكد استلام الدفع خارج المنصة' : 'I confirm receipt of payment outside the platform'}</span></label>
        <div className="admin-office-identity__actions">
          <Button type="submit" disabled={busy || !data.canManage}>{data.status === 'active' ? ar ? 'تجديد / حفظ المدة' : 'Renew / save period' : ar ? 'تفعيل الظهور' : 'Activate display'}</Button>
          {data.status === 'active' ? <Button variant="secondary" type="button" disabled={busy || !data.canManage} onClick={() => void save('inactive')}>{ar ? 'إيقاف الظهور' : 'Stop display'}</Button> : null}
        </div>
      </fieldset>
    </form>{!data.canManage ? <p className="admin-office-identity__description">{ar ? 'تحتاج صلاحية إدارة اشتراك ظهور المكاتب للتعديل.' : 'Office identity subscription permission is required to edit.'}</p> : null}</> : !error ? <p>{ar ? 'جاري تحميل الاشتراك…' : 'Loading subscription…'}</p> : null}
    {error ? <div className="admin-office-identity__error" role="alert"><p>{error}</p><Button variant="secondary" disabled={busy} onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة تحميل الاشتراك' : 'Reload subscription'}</Button></div> : null}
  </section>;
}
