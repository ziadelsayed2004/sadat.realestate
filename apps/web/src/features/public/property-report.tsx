import { useContext, useState } from 'react';
import type { SupportedLocale, PropertyReportCreate } from '@sadat-real-estate/contracts';
import { Button, Modal } from '../design_system/index.ts';
import { ApiClientError } from '../contracts/index.ts';
import { PublicAuthRoleContext } from './components.tsx';
import type { PublicPropertyDetailsActions } from './details-data.ts';

export function PropertyReport({ propertyId, locale, actions }: { propertyId: string; locale: SupportedLocale; actions: PublicPropertyDetailsActions }) {
  const ar = locale === 'ar', role = useContext(PublicAuthRoleContext);
  const returnTo = typeof window === 'undefined' ? `/properties?lang=${locale}` : window.location.pathname + window.location.search;
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [feedback, setFeedback] = useState('');
  const [reason, setReason] = useState<PropertyReportCreate['reason']>('inaccurate'), [details, setDetails] = useState('');
  const labels = { inaccurate: ar ? 'بيانات غير صحيحة' : 'Inaccurate information', duplicate: ar ? 'إعلان مكرر' : 'Duplicate listing', fraud: ar ? 'اشتباه في احتيال' : 'Suspected fraud', inappropriate: ar ? 'محتوى غير مناسب' : 'Inappropriate content', other: ar ? 'سبب آخر' : 'Other reason' };
  async function send() {
    if (busy || !actions.submitReport || !role) return;
    setBusy(true); setFeedback('');
    try { await actions.submitReport(propertyId, { reason, ...(details.trim() ? { details: details.trim().replace(/\s+/gu, ' ') } : {}) }); setSent(true); }
    catch (error) {
      if (error instanceof ApiClientError && error.status === 409) setFeedback(ar ? 'لديك بلاغ مسجل لهذا العقار بالفعل؛ ستراجعه الإدارة.' : 'You already reported this property. Administration will review it.');
      else if (error instanceof ApiClientError && error.status === 401) setFeedback(ar ? 'انتهت صلاحية الجلسة. سجل الدخول ثم أعد المحاولة؛ نص البلاغ محفوظ هنا.' : 'Your session expired. Sign in and retry; your report text is preserved.');
      else setFeedback(ar ? 'تعذر إرسال البلاغ. راجع السبب والتفاصيل وحاول مجددًا.' : 'Could not submit. Check the reason and details, then retry.');
    } finally { setBusy(false); }
  }
  return <aside className="public-property-report">
    <Button type="button" variant="secondary" onClick={() => setOpen(true)}>{ar ? 'الإبلاغ عن هذا العقار' : 'Report this property'}</Button>
    <p>{ar ? 'لو البيانات غير صحيحة أو الإعلان فيه مشكلة، ابعت بلاغًا خاصًا للإدارة.' : 'Send a private report to administration if the listing has a problem.'}</p>
    <Modal open={open} title={ar ? 'الإبلاغ عن العقار' : 'Report property'} closeLabel={ar ? 'إغلاق' : 'Close'} onClose={() => { if (!busy) setOpen(false); }}>
      {sent ? <p role="status">{ar ? 'تم إرسال بلاغك للإدارة. لن يظهر اسمك أو تفاصيل البلاغ للزوار.' : 'Your report was sent to administration. Your name and report details are not public.'}</p> : !role ? <p>{ar ? 'سجل الدخول لإرسال بلاغ ومتابعته مع الإدارة.' : 'Sign in to submit a report.'} <a href={`/auth/login?lang=${locale}&returnTo=${encodeURIComponent(returnTo)}`}>{ar ? 'تسجيل الدخول' : 'Sign in'}</a></p> : <form onSubmit={event => { event.preventDefault(); void send(); }}>
        <label>{ar ? 'سبب البلاغ' : 'Report reason'}<select value={reason} disabled={busy} onChange={event => setReason(event.target.value as typeof reason)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>{ar ? 'تفاصيل تساعد الإدارة' : 'Details for administration'}<textarea value={details} onChange={event => setDetails(event.target.value)} minLength={5} maxLength={2000} required={reason === 'other'} disabled={busy} /></label>
        <p>{ar ? 'البلاغ لا يخفي العقار تلقائيًا؛ الإدارة تراجعه قبل اتخاذ الإجراء.' : 'A report does not automatically hide the property; administration reviews it first.'}</p>
        <Button type="submit" disabled={busy || !actions.submitReport} loading={busy}>{ar ? 'إرسال البلاغ' : 'Submit report'}</Button>
        {feedback ? <p role="alert">{feedback}</p> : null}
      </form>}
    </Modal>
  </aside>;
}
