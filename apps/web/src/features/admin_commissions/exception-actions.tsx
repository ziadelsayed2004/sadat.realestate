import { useState } from 'react';
import type { CommissionException, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { AdminCommissionExceptionUpdate } from './data.ts';

export function ExceptionActions({ item, locale, update, onSaved }: { item: CommissionException; locale: SupportedLocale; update: AdminCommissionExceptionUpdate; onSaved: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const ar = locale === 'ar';
  if (item.status === 'archived') return null;
  return <form onSubmit={event => {
    event.preventDefault(); setBusy(true); setError(false);
    void update(item.id, { expectedVersion: item.version, reason, status: item.status === 'active' ? 'inactive' : 'active' })
      .then(onSaved).catch(() => setError(true)).finally(() => setBusy(false));
  }}><p>{item.effectiveTo ? new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Cairo', dateStyle: 'medium' }).format(new Date(item.effectiveTo)) : ar ? 'مستمر حتى إيقافه أو تغييره' : 'Continues until stopped or changed'}</p>
    <label>{ar ? 'سبب الإجراء' : 'Action reason'}<input value={reason} onChange={event => setReason(event.target.value)} minLength={2} maxLength={500} required /></label>
    <Button type="submit" size="sm" loading={busy}>{item.status === 'active' ? ar ? 'إيقاف الاستثناء' : 'Stop exception' : ar ? 'اعتماد وتفعيل' : 'Approve and activate'}</Button>
    {error ? <p role="alert">{ar ? 'تعذر الإجراء. حدّث البيانات وتأكد من أن الفترة بدأت ولم تنتهِ، ولا يوجد استثناء آخر نشط لنفس الحساب.' : 'Refresh the data and check the effective window and other active exceptions for this account.'}</p> : null}
  </form>;
}
