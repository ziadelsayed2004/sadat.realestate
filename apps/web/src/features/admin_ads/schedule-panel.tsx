import { useState } from 'react';
import type { AdAdminRequest, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import { egyptDurationLabel, egyptInstant, egyptLocalDateTime } from '../public/egypt-time.ts';

export interface SchedulingOptions { waiverReason?: string; interval?: { start: string; end: string } }
export function AdSchedulePanel({ data, locale, save }: { readonly data: AdAdminRequest; readonly locale: SupportedLocale; readonly save: (options: SchedulingOptions) => Promise<void> }) {
  const ar = locale === 'ar';
  const [free, setFree] = useState(false);
  const [reason, setReason] = useState('');
  const [start, setStart] = useState(data.request.intervalStart ? egyptLocalDateTime(new Date(data.request.intervalStart)) : '');
  const [end, setEnd] = useState(data.request.intervalEnd ? egyptLocalDateTime(new Date(data.request.intervalEnd)) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const from = egyptInstant(start); const to = egyptInstant(end);
  const valid = Boolean(from && to && to > from && to > new Date());
  return <form className="admin-ads__review-card" onSubmit={event => {
    event.preventDefault(); if (busy || !valid || !from || !to || (free && reason.trim().length < 3)) return;
    setBusy(true); setError(false);
    void save({ ...(free ? { waiverReason: reason.trim() } : {}), interval: { start: from.toISOString(), end: to.toISOString() } })
      .catch(() => setError(true)).finally(() => setBusy(false));
  }}>
    <h3>{ar ? 'تفعيل وجدولة الإعلان' : 'Activate and schedule advertisement'}</h3>
    <p>{ar ? 'الإعلان المدفوع يحتاج إثبات دفع معتمد. يمكنك اعتماد إعلان مجاني بقرار مسجل من الإدارة.' : 'Paid advertising requires approved payment proof. A free advertisement needs a recorded administrator decision.'}</p>
    <label>{ar ? 'بداية العرض بتوقيت مصر' : 'Display start in Egypt time'}<input type="datetime-local" value={start} required disabled={busy} onChange={event => setStart(event.currentTarget.value)} /></label>
    <label>{ar ? 'نهاية العرض بتوقيت مصر' : 'Display end in Egypt time'}<input type="datetime-local" value={end} required disabled={busy} onChange={event => setEnd(event.currentTarget.value)} /></label>
    <p role="status">{valid && from && to ? `${ar ? 'مدة العرض: ' : 'Display duration: '}${egyptDurationLabel(from, to, locale)}` : ar ? 'حدد فترة صالحة؛ النهاية بعد البداية وبعد الوقت الحالي. لو انتهت الفترة القديمة، اختر فترة جديدة.' : 'Choose a valid period ending after its start and the current time. Replace an expired period with new dates.'}</p>
    <label><input type="checkbox" checked={free} disabled={busy} onChange={event => setFree(event.currentTarget.checked)} /> {ar ? 'اعتماد مجاني بدون دفع' : 'Approve free advertising without payment'}</label>
    {free ? <label>{ar ? 'سبب الإعفاء من الدفع (مطلوب)' : 'Payment waiver reason (required)'}<textarea required minLength={3} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.currentTarget.value)} /></label> : null}
    <Button loading={busy} disabled={busy || !valid || (free && reason.trim().length < 3)} type="submit">{free ? (ar ? 'اعتماد مجاني وجدولة' : 'Approve free and schedule') : (ar ? 'جدولة بعد اعتماد الدفع' : 'Schedule after payment approval')}</Button>
    {error ? <p role="alert">{ar ? 'تعذرت الجدولة. راجع صلاحية الإدارة أو إثبات الدفع وتوفر موضع العرض في هذه الفترة. بيانات النموذج محفوظة.' : 'Scheduling failed. Check permissions, payment approval and placement availability. Your input is preserved.'}</p> : null}
  </form>;
}
