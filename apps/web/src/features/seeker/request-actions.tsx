import { useState } from 'react';
import { requestCreateSchema, type RequestData, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, Modal } from '../design_system/index.ts';
import { localeForSeekerPath, type SeekerContactRequestCreator } from './data.ts';

export function RequestInformationForm({ locale, onSubmit }: { readonly locale: SupportedLocale; readonly onSubmit: (message: string) => Promise<void> }) {
  const ar = locale === 'ar';
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <form className="seeker-request-form" aria-label={ar ? 'إرسال المعلومات المطلوبة' : 'Send requested information'} onSubmit={event => {
    event.preventDefault();
    if (saving) return;
    if (!message.trim()) { setError(ar ? 'اكتب المعلومات المطلوبة أولاً.' : 'Enter the requested information first.'); return; }
    setSaving(true); setError('');
    void onSubmit(message.trim()).catch(failure => setError(failure instanceof ApiClientError && failure.status === 409
      ? (ar ? 'تغيّرت حالة الطلب. حدّث الصفحة وراجع آخر تحديث قبل الإرسال.' : 'The request changed. Refresh the page and review the latest update before sending.')
      : (ar ? 'تعذر إرسال المعلومات. محتوى ردك موجود؛ حاول مرة أخرى.' : 'Could not send the information. Your reply is still here; try again.'))).finally(() => setSaving(false));
  }}>
    <label htmlFor="seeker-request-information">{ar ? 'المعلومات المطلوبة' : 'Requested information'}</label>
    <textarea id="seeker-request-information" value={message} onChange={event => setMessage(event.target.value)} rows={4} maxLength={2000} required disabled={saving} placeholder={ar ? 'اكتب ردك على رسالة الإدارة هنا…' : 'Reply to the team’s message here…'} />
    {error ? <p role="alert">{error}</p> : null}
    <Button type="submit" loading={saving}>{ar ? 'إرسال المعلومات للإدارة' : 'Send information to the team'}</Button>
  </form>;
}

export function NewSeekerRequestAction({ locale, create, request }: { readonly locale: SupportedLocale; readonly create: SeekerContactRequestCreator; readonly request?: RequestData | undefined }) {
  const ar = locale === 'ar';
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(typeof request?.payload.fullName === 'string' ? request.payload.fullName : '');
  const [phone, setPhone] = useState(typeof request?.payload.phone === 'string' ? request.payload.phone : '');
  const [time, setTime] = useState('morning');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<RequestData>();
  const title = ar ? 'طلب جديد' : 'New request';
  return <>
    <Button variant="secondary" onClick={() => { setOpen(true); setCreated(undefined); setMessage(''); setError(''); }}>{title}</Button>
    <Modal open={open} title={title} closeLabel={ar ? 'إغلاق' : 'Close'} onClose={() => { if (!saving) setOpen(false); }}>
      {created ? <p role="status">{ar ? 'تم إرسال طلبك الجديد.' : 'Your new request was sent.'} <a href={localeForSeekerPath(locale, `/seeker/requests/${created.id}`)}>{ar ? 'متابعة الطلب الجديد' : 'Track the new request'}</a></p> : <form className="seeker-request-form" aria-label={title} onSubmit={event => {
        event.preventDefault();
        if (saving) return;
        const parsed = requestCreateSchema.safeParse({ type: 'contact', payload: { fullName: name.trim(), phone: phone.trim(), preferredContactTime: time, message: message.trim(), contactChannel: 'platform', locale,
          ...(request?.propertyId ? { propertyId: request.propertyId } : {}),
          ...(request?.projectId ? { projectId: request.projectId } : {}),
          ...(typeof request?.payload.organizationId === 'string' ? { organizationId: request.payload.organizationId } : {})
        } });
        if (!parsed.success || parsed.data.type !== 'contact') { setError(ar ? 'راجع الاسم ورقم الهاتف واكتب تفاصيل طلبك.' : 'Check your name and phone number, and enter your request details.'); return; }
        setSaving(true); setError('');
        void create(parsed.data.payload).then(setCreated).catch(failure => setError(failure instanceof ApiClientError && failure.apiError?.code === 'REQUEST_DUPLICATE'
          ? (ar ? 'سبق إرسال نفس الطلب. راجعه من قائمة طلباتك.' : 'This request was already sent. Check your requests list.')
          : (ar ? 'تعذر إرسال الطلب. بياناتك موجودة؛ حاول مرة أخرى.' : 'Could not send the request. Your details are still here; try again.'))).finally(() => setSaving(false));
      }}>
        <p>{ar ? 'تستقبل إدارة المنصة طلبك الجديد وتتابعه معك من حسابك.' : 'The platform team receives your new request and follows up through your account.'}</p>
        {request?.propertyId ? <p>{ar ? 'الطلب الجديد بخصوص نفس العقار المرتبط بطلبك الحالي. اكتب التفاصيل الجديدة أدناه.' : 'This new request concerns the same property as your current request. Enter the new details below.'}</p> : null}
        <Input id="seeker-new-request-name" label={ar ? 'الاسم' : 'Full name'} value={name} onChange={event => setName(event.target.value)} required maxLength={160} disabled={saving} />
        <Input id="seeker-new-request-phone" type="tel" label={ar ? 'رقم الهاتف' : 'Phone number'} value={phone} onChange={event => setPhone(event.target.value)} required maxLength={40} disabled={saving} />
        <label htmlFor="seeker-new-request-time">{ar ? 'الوقت المناسب للتواصل' : 'Preferred contact time'}</label>
        <select id="seeker-new-request-time" value={time} onChange={event => setTime(event.target.value)} disabled={saving}><option value="morning">{ar ? 'صباحاً' : 'Morning'}</option><option value="evening">{ar ? 'مساءً' : 'Evening'}</option></select>
        <label htmlFor="seeker-new-request-message">{ar ? 'تفاصيل طلبك الجديد' : 'New request details'}</label>
        <textarea id="seeker-new-request-message" value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} rows={4} required disabled={saving} />
        {error ? <p role="alert">{error}</p> : null}
        <Button type="submit" loading={saving}>{ar ? 'إرسال طلب جديد' : 'Send new request'}</Button>
      </form>}
    </Modal>
  </>;
}
