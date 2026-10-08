import { useState } from 'react';
import type { AdAdminRequest, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import { egyptDurationLabel, egyptInstant, egyptLocalDateTime } from '../public/egypt-time.ts';

export interface SchedulingOptions { waiverReason?: string; interval?: { start: string; end: string } }

function schedulingError(error: unknown, ar: boolean): string {
  if (error instanceof ApiClientError) {
    if (error.apiError?.code === 'AD_PLACEMENT_CONFLICT') return ar ? 'مكان العرض محجوز لإعلان آخر خلال هذه الفترة. اختر فترة أخرى وحاول مجددًا.' : 'Another advertisement occupies this placement during that period. Choose another period and retry.';
    if (error.status === 401 || error.status === 403) return ar ? 'حسابك يحتاج صلاحية جدولة الإعلانات. راجع صلاحيات الحساب أو سجّل الدخول مجددًا.' : 'Your account needs permission to schedule advertisements. Check account permissions or sign in again.';
    if (error.status === 409) return ar ? 'تعذرت الجدولة بسبب حالة الطلب أو اعتماد الدفع. راجع إيصال الدفع وحدّث تفاصيل الطلب قبل المحاولة مجددًا.' : 'The request state or payment approval prevents scheduling. Check the receipt and refresh the request details before retrying.';
    if (error.code === 'NETWORK_ERROR') return ar ? 'لم نتمكن من الاتصال بالخادم. تحقق من الإنترنت وأعد المحاولة؛ بياناتك محفوظة.' : 'Unable to reach the server. Check your connection and retry; your entries are preserved.';
  }
  return ar ? 'تعذرت الجدولة. أعد المحاولة، وإذا استمرت المشكلة تواصل مع الدعم. بياناتك محفوظة.' : 'Scheduling failed. Retry, and contact support if the problem persists. Your entries are preserved.';
}
export function AdSchedulePanel({ data, locale, save }: { readonly data: AdAdminRequest; readonly locale: SupportedLocale; readonly save: (options: SchedulingOptions) => Promise<void> }) {
  const ar = locale === 'ar';
  const [free, setFree] = useState(false);
  const [reason, setReason] = useState('');
  const [start, setStart] = useState(data.request.intervalStart ? egyptLocalDateTime(new Date(data.request.intervalStart)) : '');
  const [end, setEnd] = useState(data.request.intervalEnd ? egyptLocalDateTime(new Date(data.request.intervalEnd)) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const from = egyptInstant(start); const to = egyptInstant(end);
  const periodError = !from || !to
    ? (ar ? 'حدد بداية العرض ونهايته بتوقيت مصر.' : 'Choose the display start and end in Egypt time.')
    : to <= from
      ? (ar ? 'نهاية العرض لازم تكون بعد البداية.' : 'Display end must be after its start.')
      : to <= new Date()
        ? (ar ? 'فترة العرض انتهت. اختر نهاية جديدة بعد الوقت الحالي.' : 'This display period has ended. Choose an end after the current time.')
        : undefined;
  const reasonError = free && reason.trim().length < 3;
  const reasonHelp = ar ? 'اكتب سببًا واضحًا من ٣ حروف على الأقل؛ مثل: إعلان مجاني ضمن حملة ترويجية.' : 'Enter a clear reason of at least 3 characters, for example: complimentary promotional campaign.';
  return <form className="admin-ads__review-card admin-ads__schedule" onSubmit={event => {
    event.preventDefault(); if (busy || periodError || !from || !to || reasonError) return;
    if (to <= new Date()) { setError(ar ? 'انتهت الفترة أثناء فتح الصفحة. اختر نهاية جديدة للعرض.' : 'The period ended while this page was open. Choose a new display end.'); return; }
    setBusy(true); setError(undefined);
    void save({ ...(free ? { waiverReason: reason.trim() } : {}), interval: { start: from.toISOString(), end: to.toISOString() } })
      .catch(failure => setError(schedulingError(failure, ar))).finally(() => setBusy(false));
  }}>
    <h3>{ar ? 'تحديد موعد عرض الإعلان' : 'Schedule advertisement display'}</h3>
    <p>{ar ? 'حدد فترة العرض ثم اختر طريقة الاعتماد. بعد نجاح الجدولة جهّز صور الإعلان ورابطه وانشر البانر.' : 'Set the display period and choose the approval method. After scheduling, prepare the advertisement images and destination link, then publish the banner.'}</p>
    <fieldset disabled={busy}>
      <legend>{ar ? 'فترة العرض — توقيت مصر' : 'Display period — Egypt time'}</legend>
      <div className="admin-ads__schedule-dates">
        <label className="admin-ads__field" htmlFor="admin-ad-display-start">{ar ? 'بداية العرض بتوقيت مصر' : 'Display start in Egypt time'}<input id="admin-ad-display-start" type="datetime-local" value={start} required aria-describedby="admin-ad-display-period" onChange={event => { setStart(event.currentTarget.value); setError(undefined); }} /></label>
        <label className="admin-ads__field" htmlFor="admin-ad-display-end">{ar ? 'نهاية العرض بتوقيت مصر' : 'Display end in Egypt time'}<input id="admin-ad-display-end" type="datetime-local" value={end} required aria-describedby="admin-ad-display-period" aria-invalid={Boolean(periodError)} onChange={event => { setEnd(event.currentTarget.value); setError(undefined); }} /></label>
      </div>
      <p id="admin-ad-display-period" className={periodError ? 'admin-ads__schedule-error' : ''} role="status">{periodError ?? (from && to ? `${ar ? 'مدة العرض: ' : 'Display duration: '}${egyptDurationLabel(from, to, locale)}` : '')}</p>
    </fieldset>
    <fieldset disabled={busy}>
      <legend>{ar ? 'طريقة اعتماد الإعلان' : 'Advertisement approval method'}</legend>
      <div className="admin-ads__action-list">
        <label><input type="radio" name="ad-payment-mode" checked={!free} onChange={() => { setFree(false); setError(undefined); }} />{ar ? 'إعلان مدفوع' : 'Paid advertisement'}</label>
        <label><input type="radio" name="ad-payment-mode" checked={free} onChange={() => { setFree(true); setError(undefined); }} />{ar ? 'إعلان مجاني — إعفاء من الدفع' : 'Free advertisement — waive payment'}</label>
      </div>
      {free ? <>
        <p>{ar ? 'هذا الاختيار يعفي العميل من قيمة الإعلان بقرار إداري مسجل. استخدمه عند الاتفاق على إعلان مجاني؛ لا يسجل تحصيل أي مبلغ.' : 'This records an administrator decision to waive the advertisement price. Use it for an agreed complimentary advertisement; it records no money received.'}</p>
        <label className="admin-ads__field" htmlFor="admin-ad-waiver-reason">{ar ? 'سبب الإعفاء من الدفع (مطلوب)' : 'Payment waiver reason (required)'}<textarea id="admin-ad-waiver-reason" required minLength={3} maxLength={500} rows={3} value={reason} aria-invalid={reasonError} aria-describedby="admin-ad-waiver-help" onChange={event => { setReason(event.currentTarget.value); setError(undefined); }} /></label>
        <p id="admin-ad-waiver-help" className={reasonError ? 'admin-ads__schedule-error' : ''} role="status">{reasonHelp}</p>
      </> : <p>{ar ? 'اعتمد إيصال الدفع أولًا من المراجعة المالية، ثم احفظ موعد العرض. موافقة العميل على عرض السعر وحدها لا تعني اعتماد الدفع.' : 'Approve the payment receipt in financial review, then save the display period. Customer acceptance of the price quote alone does not approve payment.'} <a href={`/admin/ads/financial-review?requestId=${data.request.id}&lang=${locale}`}>{ar ? 'فتح بيانات الدفع والمراجعة المالية' : 'Open payment details and financial review'}</a></p>}
    </fieldset>
    <div className="admin-ads__schedule-submit"><Button loading={busy} disabled={busy || Boolean(periodError) || reasonError} type="submit">{free ? (ar ? 'تسجيل الإعفاء وحفظ موعد العرض' : 'Record waiver and save display period') : (ar ? 'حفظ موعد العرض بعد اعتماد الدفع' : 'Save display period after payment approval')}</Button></div>
    {error ? <p className="admin-ads__schedule-error" role="alert">{error}</p> : null}
  </form>;
}
