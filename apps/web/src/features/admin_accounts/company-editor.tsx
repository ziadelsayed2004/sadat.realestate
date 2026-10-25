import { ImageUploadGuide } from '../design_system/image-upload-guide.tsx';
import { ImageFitField } from '../provider/image-fit-field.tsx';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import type { AdminAccountsAuthorizationSource } from './data.ts';
import './company-editor.css';
import { CompanyPhoto } from './company-photo.tsx';

const schema = z.object({ coverFit: z.enum(['cover', 'contain']).optional(), id: z.string(), slug: z.string(), version: z.number(), name: z.object({ ar: z.string().optional(), en: z.string().optional() }), description: z.object({ ar: z.string().optional(), en: z.string().optional() }), imageUrl: z.string().nullable(), logoUrl: z.string().nullable().optional(), status: z.string() });
type ImageField = 'imageUrl' | 'logoUrl';
export function CompanyEditor({ providerId, locale, authorization, apiOrigin, owner = false, identity = false }: { identity?: boolean; owner?: boolean; providerId: string; locale: SupportedLocale; authorization?: AdminAccountsAuthorizationSource | undefined; apiOrigin?: string | undefined }) {
  const ar = locale === 'ar', client = useMemo(() => new ApiClient(apiOrigin ? { baseUrl: apiOrigin } : {}), [apiOrigin]);
  const [company, setCompany] = useState<z.infer<typeof schema>>(), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState(''), [reason, setReason] = useState(owner ? 'Company profile updated by its owner' : ''), [attempt, setAttempt] = useState(0);
  const [changedImages, setChangedImages] = useState<ReadonlySet<ImageField>>(() => new Set());
  const endpoint = owner ? '/provider/organization' : `/admin/providers/${providerId}/organization`;
  const headers = () => ({ authorization: authorization?.getAuthorizationHeader() ?? '' });
  useEffect(() => {
    let active = true;
    void client.request(endpoint, { headers: { authorization: authorization?.getAuthorizationHeader() ?? '' }, responseSchema: z.object({ data: schema }) }).then(result => {
      if (active) { setCompany(result.data.data); setChangedImages(new Set()); }
    }, () => { if (active) setFeedback(ar ? 'ملف الشركة غير متاح حاليًا. تحقق من اعتماد الحساب وصلاحية عرض العارضين.' : 'Company profile unavailable. Check approval and provider-view access.'); });
    return () => { active = false; };
  }, [client, endpoint, authorization, ar, attempt]);
  function setImage(field: ImageField, value: string | null) {
    setCompany(current => current ? { ...current, [field]: value } : current);
    setChangedImages(current => new Set([...current, field]));
  }
  async function upload(field: ImageField, file: File) {
    if (busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) { setFeedback(ar ? 'اختر JPG أو PNG أو WebP حتى 10 ميجابايت.' : 'Choose JPG, PNG or WebP up to 10 MB.'); return; }
    setBusy(true); setFeedback('');
    try {
      const result = await client.request(owner ? '/provider/organization-photos' : '/admin/providers/organization-photos', { method: 'POST', body: file, headers: { ...headers(), 'content-type': file.type }, responseSchema: z.object({ data: z.object({ imageUrl: z.string() }) }) });
      setImage(field, result.data.data.imageUrl);
      setFeedback(ar ? 'تم رفع الصورة. احفظ الملف لإظهارها في الدليل.' : 'Image uploaded. Save the profile to display it publicly.');
    } catch { setFeedback(ar ? 'تعذر رفع الصورة. بياناتك محفوظة؛ اختر JPG أو PNG أو WebP حتى 10 ميجابايت.' : 'Upload failed. Your details are preserved; choose JPG, PNG or WebP up to 10 MB.'); }
    finally { setBusy(false); }
  }
  async function save(status = company?.status) {
    if (!company || reason.trim().length < 3 || busy) return;
    setBusy(true); setFeedback('');
    const images = Object.fromEntries([...changedImages].map(field => [field, company[field] || null]));
    try {
      const result = await client.request(endpoint, { method: 'PATCH', headers: headers(), json: { version: company.version, name: company.name, description: company.description, ...(!individual ? { coverFit: company.coverFit ?? 'cover' } : {}), ...images, ...(owner ? {} : { status }), reason: reason.trim() }, responseSchema: z.object({ data: schema }) });
      setCompany(result.data.data); setChangedImages(new Set()); setFeedback(ar ? 'تم حفظ ملف الشركة.' : 'Company profile saved.');
    } catch { setFeedback(ar ? 'تعذر الحفظ. بياناتك موجودة؛ تحقق من الصلاحيات وحدّث البيانات قبل إعادة المحاولة.' : 'Could not save. Your details are preserved; check permissions and reload before retrying.'); }
    finally { setBusy(false); }
  }
  const individual = company?.slug.startsWith('broker-') === true;
  return <section className="admin-accounts__detail-card admin-company-editor" id="company-profile-editor">
    <h2>{identity ? (ar ? 'اسمك وصورتك للعرض العام' : 'Your public name and photo') : owner ? (ar ? 'بيانات شركتك والغلاف واللوجو' : 'Your company details, cover and logo') : (ar ? 'إدارة ملف الشركة والغلاف واللوجو' : 'Manage company profile, cover and logo')}</h2>
    {owner && !individual ? <p>{ar ? 'الغلاف صورة عريضة أعلى صفحة الشركة، واللوجو شعار مربع يظهر في هوية الشركة وكروتها. ارفع كل صورة في مكانها ثم اضغط حفظ.' : 'The cover is the wide image above your company page. The square logo identifies your company on its profile and cards. Upload each separately, then save.'}</p> : null}
    {company ? <form onSubmit={event => { event.preventDefault(); void save(); }}>
      {!individual ? <a href={`/developers/${company.slug}?lang=${locale}`} target="_blank" rel="noreferrer">{ar ? 'عرض صفحة الشركة' : 'View company page'}</a> : null}
      {(['ar', 'en'] as const).map(lang => <label key={lang}>{ar ? `${individual ? 'اسم العرض' : 'اسم الشركة'} — ${lang === 'ar' ? 'العربية' : 'الإنجليزية'}` : `${individual ? 'Display name' : 'Company name'} — ${lang}`}<input value={company.name[lang] ?? ''} disabled={busy} onChange={event => setCompany({ ...company, name: { ...company.name, [lang]: event.target.value } })} /></label>)}
      <label>{ar ? 'نبذة الشركة' : 'Company description'}<textarea value={company.description[locale] ?? ''} disabled={busy} onChange={event => setCompany({ ...company, description: { ...company.description, [locale]: event.target.value } })} /></label>
      <div className="admin-company-editor__images">{(individual ? ['logoUrl'] as const : ['imageUrl', 'logoUrl'] as const).map(field => <fieldset key={field} className={`admin-company-editor__image admin-company-editor__image--${field === 'logoUrl' ? 'logo' : 'cover'}`} disabled={busy}>
        <legend>{individual ? ar ? 'صورة العرض' : 'Public photo' : field === 'logoUrl' ? ar ? 'لوجو الشركة' : 'Company logo' : ar ? 'صورة غلاف الشركة' : 'Company cover'}</legend>
        <p>{field === 'logoUrl' ? ar ? 'صورة مربعة؛ المقاس المقترح 512 × 512 بكسل. يظهر الشعار كاملًا.' : 'Square image; suggested size 512 × 512 px. The full logo stays visible.' : ar ? 'صورة عريضة؛ المقاس المقترح 1600 × 900 بكسل.' : 'Wide image; suggested size 1600 × 900 px.'}</p>
        {field === 'imageUrl' ? <ImageFitField locale={locale} value={company.coverFit ?? 'cover'} onChange={coverFit => setCompany({ ...company, coverFit })} disabled={busy} /> : null}
        {company[field] ? <CompanyPhoto fit={field === 'imageUrl' ? company.coverFit ?? 'cover' : 'contain'} imageUrl={company[field]!} owner={owner} authorization={authorization} apiOrigin={apiOrigin} alt={field === 'logoUrl' ? ar ? 'معاينة لوجو الشركة' : 'Company logo preview' : ar ? 'معاينة غلاف الشركة' : 'Company cover preview'} /> : null}
        <ImageUploadGuide locale={locale} kind={field === 'logoUrl' ? 'logo' : 'cover'}><label>{field === 'logoUrl' ? ar ? 'رفع لوجو الشركة' : 'Upload company logo' : ar ? 'رفع صورة الشركة' : 'Upload company image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(field, file); }} /></label></ImageUploadGuide>
        {company[field] ? <Button type="button" variant="secondary" onClick={() => setImage(field, null)}>{field === 'logoUrl' ? ar ? 'إزالة اللوجو' : 'Remove logo' : ar ? 'إزالة الغلاف' : 'Remove cover'}</Button> : null}
      </fieldset>)}</div>
      {!owner ? <label>{ar ? 'سبب التعديل أو الحذف' : 'Change or removal reason'}<input value={reason} minLength={3} onChange={event => setReason(event.target.value)} required /></label> : null}
      <div><Button disabled={busy || reason.trim().length < 3} type="submit">{ar ? 'حفظ ملف الشركة' : 'Save company'}</Button>{!owner ? <Button type="button" variant="danger" disabled={busy || reason.trim().length < 3} onClick={() => void save(company.status === 'inactive' ? 'approved' : 'inactive')}>{company.status === 'inactive' ? ar ? 'إعادة عرض الشركة' : 'Restore company' : ar ? 'حذف الشركة من الدليل' : 'Remove company from directory'}</Button> : null}</div>
      {!owner ? <p>{ar ? 'الحذف من الدليل يخفي ملف الشركة ويمكن الرجوع عنه؛ لا يحذف حسابها أو سجلاتها المالية.' : 'Removing the directory profile is reversible and preserves the account and financial history.'}</p> : null}
    </form> : <Button onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة تحميل الملف' : 'Reload profile'}</Button>}
    {feedback ? <p role="status">{feedback}</p> : null}
  </section>;
}
