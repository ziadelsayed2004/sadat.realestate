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
  const [paid, setPaid] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0); const [saved, setSaved] = useState(false);
  const path = `/admin/providers/${providerId}/public-identity-subscription`;
  useEffect(() => {
    const controller = new AbortController();
    void client.request(path, { signal: controller.signal, headers: { authorization: authorization?.getAuthorizationHeader?.() ?? '' }, responseSchema: publicIdentitySubscriptionSuccessEnvelopeSchema })
      .then(value => { if (!controller.signal.aborted) { const row = value.data.data; setData(row); setError(''); setSaved(false); setStart(row.startAt ? egyptLocalDateTime(new Date(row.startAt)) : egyptLocalDateTime(new Date())); setEnd(row.endAt ? egyptLocalDateTime(new Date(row.endAt)) : egyptLocalDateTime(new Date(Date.now() + 30 * 86400000))); setPaid(row.paymentConfirmed); } })
      .catch(() => { if (!controller.signal.aborted) setError(ar ? 'تعذر تحميل اشتراك الظهور. أعد المحاولة.' : 'Could not load the display subscription. Retry.'); });
    return () => controller.abort();
  }, [client, path, authorization, attempt, ar]);
  async function save(status: 'active' | 'inactive') {
    if (!data) return;
    const from = egyptInstant(start); const to = egyptInstant(end);
    if (status === 'active' && data.eligible === false) { setError(ar ? 'اعتمد حساب مقدم العقار أولًا من إجراءات مراجعة الحساب، ثم فعّل الاشتراك.' : 'Approve the provider account in account review before activation.'); return; }
    if (status === 'active' && to && to <= new Date()) { setError(ar ? 'نهاية الاشتراك أصبحت في الماضي. اختر نهاية لاحقة للوقت الحالي بتوقيت مصر.' : 'The subscription end is in the past. Choose a future end in Egypt time.'); return; }
    if (status === 'active' && (!paid || !from || !to || to <= from || to <= new Date())) { setError(ar ? 'أكد استلام الدفع خارج المنصة وحدد بداية ونهاية صحيحتين.' : 'Confirm external payment and enter a valid start and end.'); return; }
    setBusy(true); setError(''); setSaved(false);
    try {
      const result = await client.request(path, { method: 'PUT', headers: { authorization: authorization?.getAuthorizationHeader?.() ?? '' }, responseSchema: publicIdentitySubscriptionSuccessEnvelopeSchema,
        json: { status, paymentConfirmed: paid, ...(from ? { startAt: from.toISOString() } : {}), ...(to ? { endAt: to.toISOString() } : {}), expectedVersion: data.version } });
      setData(result.data.data);
      setSaved(true);
    } catch (failure) { setError(failure instanceof ApiClientError && failure.status === 409 ? ar ? 'عدّل موظف آخر الاشتراك. أعد تحميله وراجع المدة قبل الحفظ.' : 'Another employee changed this subscription. Reload and review the dates.' : failure instanceof ApiClientError && failure.status === 403 ? ar ? 'صلاحية إدارة ظهور مقدمي العقارات مطلوبة للحفظ.' : 'Provider visibility management permission is required.' : failure instanceof ApiClientError && failure.status === 400 ? ar ? 'لم يتم التفعيل. تأكد من اعتماد الحساب، وتأكيد السداد، وأن النهاية بعد البداية والوقت الحالي بتوقيت مصر.' : 'Activation failed. Check account approval, confirmed payment and a future end after the start in Egypt time.' : ar ? 'تعذر الاتصال لحفظ الاشتراك. أعد التحميل وحاول مجددًا.' : 'Could not connect to save the subscription. Reload and retry.'); }
    finally { setBusy(false); }
  }
  return <section id="provider-subscription-form" className="admin-accounts__detail-card admin-office-identity" aria-label={ar ? 'اشتراك ظهور مقدم العقار' : 'Provider identity subscription'} aria-busy={busy || (!data && !error)}>
    <header className="admin-office-identity__heading">
      <h2>{ar ? 'اشتراك ظهور مقدم العقار للزوار' : 'Provider public identity subscription'}</h2>
      {data ? <p className="admin-accounts__badge" data-tone={data.visible ? 'success' : 'neutral'} role="status">{data.visible ? ar ? 'ظاهر الآن' : 'Visible now' : ar ? 'مخفي الآن' : 'Hidden now'}</p> : null}
    </header>
    <p className="admin-office-identity__description">{ar ? 'متاح للوسيط والمكتب والشركة، ويعرض الاسم والصورة فقط. بيانات العميل ووسائل التواصل تحتفظ بقواعدها الحالية. يشاهد مقدم العقار اشتراكه من إعدادات الحساب ← الحساب.' : 'Available to brokers, offices and companies; it displays name and photo only. Customer data and contact retain their existing access rules. Providers can find their subscription under Settings → Account.'}</p>
    {data?.eligible === false ? <p role="alert">{ar ? 'الحساب غير معتمد حاليًا. اعتمده من إجراءات الحساب قبل تفعيل الظهور.' : 'The account is not approved. Approve it in account actions before activating display.'}</p> : null}
    {saved ? <p role="status">{ar ? 'تم حفظ الاشتراك. يظهر الاسم والصورة خلال المدة المحددة فقط.' : 'Subscription saved. Name and photo appear only during the selected period.'}</p> : null}
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
