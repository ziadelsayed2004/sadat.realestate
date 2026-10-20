import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { CompanyPhoto } from '../admin_accounts/company-photo.tsx';
import { Button } from '../design_system/index.ts';
import type { ProviderOrganizationFlowClient } from './organization.tsx';

export function CompanyImageField({ locale, value, client, onChange, onBusy }: { locale: SupportedLocale; value: string; client: ProviderOrganizationFlowClient; onChange: (value: string) => void; onBusy: (busy: boolean) => void }) {
  const ar = locale === 'ar', [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const authorization = useMemo(() => client.getAuthorizationHeader ? { getAuthorizationHeader: client.getAuthorizationHeader.bind(client) } : undefined, [client]);
  async function upload(file: File | undefined) {
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { setMessage(ar ? 'اختار صورة JPG أو PNG أو WebP بحجم لا يزيد عن 10 ميجابايت.' : 'Choose a JPG, PNG or WebP image up to 10 MB.'); return; }
    setBusy(true); onBusy(true); setMessage('');
    try {
      if (!client.uploadCompanyPhoto) throw new Error('Upload unavailable');
      onChange(await client.uploadCompanyPhoto(file));
      setMessage(ar ? 'تم رفع الصورة. احفظ بيانات الشركة لإرفاقها بالطلب.' : 'Image uploaded. Save company details to attach it to the application.');
    } catch { setMessage(ar ? 'تعذر رفع الصورة. بياناتك محفوظة؛ حاول مرة تانية.' : 'The image could not upload. Your details are preserved; retry.'); }
    finally { setBusy(false); onBusy(false); }
  }
  return <section className="provider-company-image" aria-label={ar ? 'صورة الشركة مع طلب التسجيل' : 'Company image with registration'}>
    <h2>{ar ? 'صورة غلاف الشركة (اختياري)' : 'Company cover image (optional)'}</h2>
    <p>{ar ? 'ارفع صورة واضحة للشركة أو شعارها. الإدارة هتشوفها مع الطلب، وبعد الموافقة هتظهر في صفحة شركتك. تقدر تغيّرها بعد كده من الإعدادات.' : 'Upload a clear company photo or logo. Administration reviews it with your application, and it appears on your company page after approval. You can change it later in settings.'}</p>
    {value ? <><CompanyPhoto imageUrl={value} owner authorization={authorization} alt={ar ? 'معاينة صورة الشركة' : 'Company image preview'} /><Button type="button" variant="secondary" disabled={busy} onClick={() => onChange('')}>{ar ? 'إزالة الصورة من الطلب' : 'Remove application image'}</Button></> : null}
    <label>{busy ? (ar ? 'جارٍ رفع الصورة…' : 'Uploading image…') : (ar ? 'اختيار صورة الشركة' : 'Choose company image')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { void upload(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /></label>
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
