import { ImageUploadGuide } from '../design_system/image-upload-guide.tsx';
import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { CompanyPhoto } from '../admin_accounts/company-photo.tsx';
import { Button } from '../design_system/index.ts';
import type { ProviderOrganizationFlowClient } from './organization.tsx';

export function CompanyImageField({ locale, value, client, onChange, onBusy, kind = 'cover', disabled = false }: { locale: SupportedLocale; value: string; client: ProviderOrganizationFlowClient; onChange: (value: string) => void; onBusy: (busy: boolean) => void; kind?: 'cover' | 'logo'; disabled?: boolean }) {
  const ar = locale === 'ar', [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const authorization = useMemo(() => client.getAuthorizationHeader ? { getAuthorizationHeader: client.getAuthorizationHeader.bind(client) } : undefined, [client]);
  async function upload(file: File | undefined) {
    if (!file || busy || disabled) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) { setMessage(ar ? 'اختار صورة JPG أو PNG أو WebP بحجم لا يزيد عن 10 ميجابايت.' : 'Choose a JPG, PNG or WebP image up to 10 MB.'); return; }
    setBusy(true); onBusy(true); setMessage('');
    try {
      if (!client.uploadCompanyPhoto) throw new Error('Upload unavailable');
      onChange(await client.uploadCompanyPhoto(file));
      setMessage(ar ? 'تم رفع الصورة. احفظ بيانات الشركة لإرفاقها بالطلب.' : 'Image uploaded. Save company details to attach it to the application.');
    } catch { setMessage(ar ? 'تعذر رفع الصورة. بياناتك محفوظة؛ حاول مرة تانية.' : 'The image could not upload. Your details are preserved; retry.'); }
    finally { setBusy(false); onBusy(false); }
  }
  return <section className="provider-company-image" data-image-kind={kind} aria-label={kind === 'logo' ? ar ? 'لوجو الشركة مع طلب التسجيل' : 'Company logo with registration' : ar ? 'صورة الشركة مع طلب التسجيل' : 'Company image with registration'}>
    <h2>{kind === 'logo' ? ar ? 'لوجو الشركة (اختياري)' : 'Company logo (optional)' : ar ? 'صورة غلاف الشركة (اختياري)' : 'Company cover image (optional)'}</h2>
    <p>{kind === 'logo' ? ar ? 'ارفع شعار الشركة منفصلًا عن الغلاف، ويفضل صورة مربعة 512 × 512 بكسل. هتظهر كاملة في هوية شركتك بعد الموافقة.' : 'Upload the company logo separately from the cover, preferably a square 512 × 512 px image. It appears in full in your company identity after approval.' : ar ? 'الغلاف صورة عريضة أعلى صفحة الشركة، والمقاس المقترح 1600 × 900 بكسل. الإدارة هتشوفها مع الطلب، وتقدر تغيرها من الإعدادات بعد الموافقة.' : 'The cover is a wide image above the company page; suggested size 1600 × 900 px. Administration reviews it with the application. You can change it in settings after approval.'}</p>
    {value ? <><CompanyPhoto imageUrl={value} owner authorization={authorization} alt={kind === 'logo' ? ar ? 'معاينة لوجو الشركة' : 'Company logo preview' : ar ? 'معاينة صورة الشركة' : 'Company image preview'} /><Button type="button" variant="secondary" disabled={busy || disabled} onClick={() => onChange('')}>{kind === 'logo' ? ar ? 'إزالة اللوجو من الطلب' : 'Remove application logo' : ar ? 'إزالة الصورة من الطلب' : 'Remove application image'}</Button></> : null}
    <ImageUploadGuide locale={locale} kind={kind === 'logo' ? 'logo' : 'cover'}><label>{busy ? (ar ? 'جارٍ رفع الصورة…' : 'Uploading image…') : kind === 'logo' ? ar ? 'اختيار لوجو الشركة' : 'Choose company logo' : ar ? 'اختيار صورة الشركة' : 'Choose company image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} onChange={event => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /></label></ImageUploadGuide>
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
