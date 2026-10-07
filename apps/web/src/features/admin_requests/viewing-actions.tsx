import { useState } from 'react';
import type { SupportedLocale, ViewingData, ViewingTransition } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import { egyptInstant, egyptLocalDateTime, EGYPT_TIME_ZONE, egyptTimeLabel } from '../public/egypt-time.ts';

export function ViewingActions({ item, locale, save }: { readonly item: ViewingData; readonly locale: SupportedLocale; readonly save: (input: ViewingTransition) => Promise<unknown> }) {
  const ar = locale === 'ar';
  const [action, setAction] = useState<ViewingTransition['action']>('confirm');
  const [date, setDate] = useState(egyptLocalDateTime(new Date(item.requestedAt)));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const actions = item.availableActions ?? [];
  const currentAction = actions.includes(action) ? action : actions[0];
  const appointment = egyptInstant(date);
  const labels = ar ? { confirm: 'تأكيد المعاينة', reschedule: 'تغيير الموعد', cancel: 'رفض / إلغاء المعاينة', complete: 'تمت المعاينة' }
    : { confirm: 'Confirm viewing', reschedule: 'Reschedule', cancel: 'Reject / cancel viewing', complete: 'Complete viewing' };
  if (!actions.length) return null;
  return <form className="admin-requests__actions" onSubmit={event => {
    event.preventDefault();
    if (busy || !currentAction || reason.trim().length < 5 || (currentAction === 'reschedule' && (!appointment || appointment <= new Date()))) return;
    setBusy(true); setFeedback('');
    void save({ action: currentAction, expectedVersion: item.version, reason: reason.trim(),
      ...(currentAction === 'reschedule' && appointment ? { requestedAt: appointment.toISOString(), timezone: EGYPT_TIME_ZONE } : {})
    }).then(() => { setReason(''); setFeedback(ar ? 'تم تحديث المعاينة وإرسال إشعار للعميل.' : 'Viewing updated and customer notified.'); })
      .catch(error => setFeedback(error instanceof ApiClientError && error.status === 409 ? (ar ? 'الطلب اتغير أو الموعد غير متاح. أغلق التفاصيل وأعد تحميل الطلب.' : 'The request changed or the appointment is unavailable. Reload the request.')
        : error instanceof ApiClientError && error.status === 403 ? (ar ? 'تحتاج صلاحية إدارة الطلبات.' : 'Request management permission is required.') : ar ? 'تعذر الحفظ. بياناتك محفوظة في النموذج.' : 'Could not save. Your input is preserved.'))
      .finally(() => setBusy(false));
  }}>
    <h3>{ar ? 'إجراءات المعاينة' : 'Viewing actions'}</h3>
    <label>{ar ? 'الإجراء' : 'Action'}<select value={currentAction} disabled={busy} onChange={event => setAction(event.currentTarget.value as ViewingTransition['action'])}>{actions.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
    {currentAction === 'reschedule' ? <label>{ar ? 'الموعد الجديد بتوقيت مصر' : 'New appointment in Egypt time'}<input type="datetime-local" required value={date} onChange={event => setDate(event.currentTarget.value)} disabled={busy} /><span>{appointment ? egyptTimeLabel(locale, appointment) : ar ? 'أدخل موعدًا صالحًا.' : 'Enter a valid appointment.'}</span></label> : null}
    <label>{ar ? 'سبب الإجراء (مطلوب)' : 'Action reason (required)'}<textarea required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.currentTarget.value)} disabled={busy} /></label>
    <Button type="submit" loading={busy} disabled={busy || reason.trim().length < 5 || (currentAction === 'reschedule' && (!appointment || appointment <= new Date()))}>{ar ? 'حفظ الإجراء' : 'Save action'}</Button>
    {feedback ? <p role="status">{feedback}</p> : null}
  </form>;
}
