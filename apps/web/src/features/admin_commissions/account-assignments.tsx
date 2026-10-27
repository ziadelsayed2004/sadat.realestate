import { rentLabel } from './rent-field.tsx';
import { useEffect, useState } from 'react';
import type { CommissionAccountOverrideListData, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import { ApiClientError } from '../contracts/index.ts';
import type { AdminCommissionsSource } from './data.ts';
import { getAdminCommissionsCopy } from './copy.ts';

export function AccountAssignments({ accountId, locale, source, canManage, revision, onChanged }: { accountId: string; locale: SupportedLocale; source: Pick<AdminCommissionsSource, 'loadAssignments' | 'updateAssignment'>; canManage: boolean; revision: number; onChanged: () => Promise<void> }) {
  const copy = getAdminCommissionsCopy(locale), ar = locale === 'ar';
  const [data, setData] = useState<CommissionAccountOverrideListData>(), [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState(''), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setData(undefined); setError('');
    void source.loadAssignments(accountId, page, controller.signal).then(next => { if (!controller.signal.aborted) setData(next); }).catch(() => { if (!controller.signal.aborted) setError(ar ? 'تعذر تحميل التخصيصات المحفوظة.' : 'Saved assignments could not load.'); });
    return () => controller.abort();
  }, [source, accountId, page, attempt, revision, ar]);
  async function cancel() {
    const item = data?.items.find(row => row.id === selected);
    if (!canManage || !item || reason.trim().length < 2) return;
    setBusy(true); setError('');
    try {
      await source.updateAssignment(accountId, item.id, { expectedVersion: item.version, status: 'archived', reason: reason.trim() });
      setSelected(''); setReason(''); setAttempt(value => value + 1); await onChanged();
    } catch (cause) { setError(cause instanceof ApiClientError && cause.status === 409 ? ar ? 'تغير التخصيص؛ أعد تحميل القائمة قبل الإلغاء.' : 'The assignment changed; reload the list before cancelling.' : ar ? 'تعذر الإلغاء. أعد المحاولة.' : 'Cancellation failed. Try again.'); }
    finally { setBusy(false); }
  }
  return <section className="admin-commissions__subpanel" aria-label={ar ? 'التخصيصات المحفوظة' : 'Saved assignments'}>
    <h2>{ar ? 'التخصيصات المحفوظة' : 'Saved assignments'}</h2>
    <p>{ar ? 'الإلغاء يوقف التخصيص ويحفظه في السجل. يمكنك بعدها إنشاء تخصيص جديد بنفس تاريخ البداية. إذا كان هناك استثناء معتمد فهو يسبق تخصيص الحساب، ثم تأتي السياسة العامة.' : 'Cancellation stops an assignment and retains its history. You can then create a replacement with the same start date. Approved exceptions take priority over account assignments, followed by the general policy.'}</p>
    {error ? <p role="alert">{error}</p> : null}
    <Button size="sm" variant="secondary" disabled={busy} onClick={() => setAttempt(value => value + 1)}>{ar ? 'تحديث القائمة' : 'Refresh list'}</Button>
    {!data && !error ? <p role="status">{ar ? 'جارٍ التحميل…' : 'Loading…'}</p> : null}
    {data?.items.map(item => <article key={item.id} className="admin-commissions__subpanel" data-testid={`account-assignment-${item.id}`}>
      <p><strong>{copy.value(item.kind, item.percentageBps, item.fixedAmountMinor, item.currency)}</strong> — {copy.statuses[item.status]}</p><p>{rentLabel(item.rentMonths, locale)}</p>
      <p>{copy.labels.effectiveFrom}: <time dateTime={item.effectiveFrom}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(item.effectiveFrom))}</time>{item.effectiveTo ? <> — {copy.labels.effectiveTo}: <time dateTime={item.effectiveTo}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(item.effectiveTo))}</time></> : null}</p>
      {canManage && item.status !== 'archived' ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setSelected(item.id); setReason(''); }}>{ar ? 'إلغاء التخصيص المحفوظ' : 'Cancel saved assignment'}</Button> : null}
      {selected === item.id ? <form className="admin-commissions__form" onSubmit={event => { event.preventDefault(); void cancel(); }}>
        <label>{copy.labels.reason}<textarea value={reason} disabled={busy} onChange={event => setReason(event.target.value)} minLength={2} maxLength={500} required /></label>
        <Button type="submit" loading={busy} disabled={reason.trim().length < 2}>{ar ? 'تأكيد الإلغاء' : 'Confirm cancellation'}</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => setSelected('')}>{ar ? 'رجوع' : 'Back'}</Button>
      </form> : null}
    </article>)}
    {data?.total === 0 ? <p>{ar ? 'لا توجد تخصيصات محفوظة لهذا الحساب.' : 'This account has no saved assignments.'}</p> : null}
    {data && data.total > data.limit ? <div className="admin-commissions__inline-actions"><Button disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>{ar ? 'السابق' : 'Previous'}</Button><span>{page} / {Math.ceil(data.total / data.limit)}</span><Button disabled={page * data.limit >= data.total || busy} onClick={() => setPage(value => value + 1)}>{ar ? 'التالي' : 'Next'}</Button></div> : null}
  </section>;
}
