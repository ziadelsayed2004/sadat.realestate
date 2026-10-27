import { useState } from 'react';
import type { CommissionPolicy, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { AdminCommissionPolicyUpdate } from './data.ts';
import { RentField } from './rent-field.tsx';

export function PolicyActions({ item, locale, update, onSaved }: { item: CommissionPolicy; locale: SupportedLocale; update: AdminCommissionPolicyUpdate; onSaved: (item: CommissionPolicy) => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sale, setSale] = useState(String((item.percentageBps ?? item.fixedAmountMinor ?? 0) / 100));
  const [rent, setRent] = useState(String(item.rentMonths ?? 0.5));
  const ar = locale === 'ar';
  if (item.status === 'archived') return null;
  return <div className="admin-commission-exception-actions">
    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(value => !value)}>{ar ? 'تعديل عمولة البيع والإيجار' : 'Edit sale and rental commission'}</Button>
    {editing ? <>
      {item.kind !== 'exempt' ? <><label>{ar ? item.kind === 'percentage' ? 'عمولة البيع (%)' : 'مبلغ عمولة البيع' : 'Sale commission'}<input type="number" min="0" max={item.kind === 'percentage' ? 100 : undefined} step="0.01" value={sale} onChange={event => setSale(event.target.value)} /></label><RentField locale={locale} value={rent} onChange={setRent} /></> : <p>{ar ? 'هذه سياسة إعفاء. أنشئ سياسة بنسبة أو مبلغ لإلغاء الإعفاء.' : 'This policy is exempt. Create a percentage or fixed policy to replace it.'}</p>}
      <Button type="button" size="sm" disabled={busy || reason.trim().length < 2 || sale === '' || rent === '' || !Number.isFinite(Number(sale)) || Number(sale) < 0 || (item.kind === 'percentage' && Number(sale) > 100) || !Number.isFinite(Number(rent)) || Number(rent) < 0 || Number(rent) > 12} onClick={() => {
        setBusy(true); setFailed(false);
        void update(item.id, { expectedVersion: item.version, reason: reason.trim(), ...(item.kind === 'percentage' ? { percentageBps: Math.round(Number(sale) * 100) } : item.kind === 'fixed' ? { fixedAmountMinor: Math.round(Number(sale) * 100) } : {}), rentMonths: item.kind === 'exempt' ? 0 : Number(rent) }).then(next => { setEditing(false); onSaved(next); }).catch(() => setFailed(true)).finally(() => setBusy(false));
      }}>{ar ? 'حفظ تعديل العمولة' : 'Save commission changes'}</Button>
    </> : null}
    <label>{ar ? 'سبب اعتماد أو إيقاف السياسة' : 'Policy approval or stop reason'}<input value={reason} disabled={busy} onChange={event => setReason(event.target.value)} maxLength={500} /></label>
    <Button type="button" size="sm" disabled={busy || reason.trim().length < 2} loading={busy} onClick={() => {
      setBusy(true); setFailed(false);
      void update(item.id, { expectedVersion: item.version, reason: reason.trim(), status: item.status === 'active' ? 'inactive' : 'active' }).then(onSaved).catch(() => setFailed(true)).finally(() => setBusy(false));
    }}>{item.status === 'active' ? ar ? 'إيقاف السياسة' : 'Stop policy' : ar ? 'اعتماد وتفعيل السياسة' : 'Approve and activate policy'}</Button>
    {failed ? <p role="alert">{ar ? 'تعذر الإجراء. حدّث القائمة وتأكد أن تاريخ البداية حان، ولا توجد سياسة نشطة أخرى لنفس الفئة. أوقف القديمة أولًا لو بتستبدلها.' : 'Refresh the list. Check the effective dates and stop any existing active policy for this scope before activating its replacement.'}</p> : null}
  </div>;
}
