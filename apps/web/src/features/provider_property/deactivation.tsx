import { useRef, useState, type FormEvent } from 'react';
import type { PropertyData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';

export function PropertyDeactivationRequest({ property, locale, submit, startEdit }: { readonly property: PropertyData; readonly locale: SupportedLocale; readonly submit: (reason: string) => Promise<void>; readonly startEdit: () => Promise<void> }) {
  const ar = locale === 'ar';
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string>();
  const request = property.deactivationRequest;
  const canRequest = property.availableActions.includes('request_deactivation');
  const canEdit = property.availableActions.includes('start_edit') || (property.hasEditDraft === true && property.status === 'published' && property.active);
  if (!canRequest && !canEdit && !request) return null;
  async function perform(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setSaving(true); setError(undefined);
    try { await action(); }
    catch (cause) { setError(cause instanceof ApiClientError && cause.status === 409 ? ar ? 'حالة العقار تغيّرت. حدّث الصفحة وراجع الطلب قبل الإرسال؛ السبب المكتوب محفوظ.' : 'The property changed. Refresh and review the request before sending; your reason is kept.' : ar ? 'تعذر تنفيذ الإجراء. حاول مرة أخرى؛ السبب المكتوب محفوظ.' : 'Could not complete the action. Retry; your reason is kept.'); }
    finally { pending.current = false; setSaving(false); }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) return;
    await perform(async () => { await submit(reason.trim()); setReason(''); });
  }
  return <section className="provider-property-state__card provider-property-deactivation" aria-labelledby="property-deactivation-title">
    <h2 id="property-deactivation-title">{ar ? 'طلب إلغاء تفعيل العقار' : 'Request property deactivation'}</h2>
    <p>{ar ? 'لو العقار اتباع أو لم يعد متاحًا، أرسل طلبًا لإيقاف عرضه. يظل العقار ظاهرًا حتى موافقة الإدارة.' : 'If the property is sold or unavailable, request removal from public listings. It stays visible until administration approves.'}</p>
    {request ? <div role="status"><strong>{request.status === 'pending' ? ar ? 'تم إرسال الطلب — بانتظار موافقة الإدارة' : 'Request sent — awaiting administration approval' : request.status === 'approved' ? ar ? 'وافقت الإدارة على إلغاء التفعيل' : 'Administration approved deactivation' : ar ? 'رفضت الإدارة طلب إلغاء التفعيل' : 'Administration rejected deactivation'}</strong><p>{request.reason}</p>{request.decisionReason ? <p>{ar ? 'سبب القرار: ' : 'Decision reason: '}{request.decisionReason}</p> : null}</div> : null}
    {canRequest ? <form onSubmit={event => { void send(event); }}><label htmlFor="property-deactivation-reason">{ar ? 'سبب إلغاء التفعيل' : 'Deactivation reason'}</label><textarea id="property-deactivation-reason" rows={3} minLength={5} maxLength={500} required disabled={saving} value={reason} onChange={event => setReason(event.target.value)} placeholder={ar ? 'مثال: تم بيع العقار' : 'For example: the property has been sold'} /><Button type="submit" loading={saving} disabled={saving}>{ar ? 'إرسال طلب إلغاء التفعيل' : 'Send deactivation request'}</Button></form> : null}
    {canEdit ? <><h2>{ar ? 'تعديل العقار المنشور' : 'Edit published property'}</h2><p>{ar ? 'فتح التعديل أو حفظ مسودة لا يخفي عقارك. تظل النسخة الحالية منشورة حتى تضغط «إرسال للمراجعة»؛ عندها يتوقف عرض العقار مؤقتًا ويعود بعد اعتماد الإدارة.' : 'Opening the editor or saving a draft keeps your current listing published. Only submitting for review temporarily hides it until administration approves.'}</p><Button type="button" variant="secondary" disabled={saving} onClick={() => { void perform(startEdit); }}>{ar ? 'بدء تعديل العقار' : 'Start editing property'}</Button></> : null}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
