import { useEffect, useState } from 'react';
import { cmsTeamPhotoSchema, successEnvelopeSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient, buildApiUrl } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';

export function ProjectImage({ value, onChange, onBusy, locale, authorization, apiOrigin, admin = false, disabled = false }: {
  value: string; onChange: (value: string) => void; onBusy?: (busy: boolean) => void; locale: SupportedLocale;
  authorization?: { getAuthorizationHeader: () => string | undefined } | undefined; apiOrigin?: string | undefined; admin?: boolean; disabled?: boolean;
}) {
  const ar = locale === 'ar';
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [preview, setPreview] = useState('');
  useEffect(() => {
    setPreview('');
    if (!value) return;
    if (/^https?:\/\//u.test(value)) { setPreview(value); return; }
    const controller = new AbortController(); let objectUrl: string | undefined;
    const endpoint = value.replace('/public/organization-photos/', admin ? '/admin/providers/organization-photos/' : '/provider/organization-photos/').replace(/^\/api\/v1/, '');
    void fetch(buildApiUrl(apiOrigin, endpoint), { headers: { authorization: authorization?.getAuthorizationHeader() ?? '' }, signal: controller.signal, credentials: 'include' })
      .then(response => { if (!response.ok) throw new Error('preview'); return response.blob(); })
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setPreview(objectUrl); } }).catch(() => {});
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [value, admin, apiOrigin, authorization]);
  async function upload(file: File | undefined) {
    if (!file || busy || disabled) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) { setError(ar ? 'اختر JPG أو PNG أو WebP حتى 10 ميجابايت.' : 'Choose JPG, PNG or WebP up to 10 MB.'); return; }
    setBusy(true); onBusy?.(true);
    try {
      const result = await new ApiClient(apiOrigin ? { baseUrl: apiOrigin } : {}).request(admin ? '/admin/providers/organization-photos' : '/provider/organization-photos', {
        method: 'POST', body: file, headers: { authorization: authorization?.getAuthorizationHeader() ?? '', 'content-type': file.type }, responseSchema: successEnvelopeSchema(cmsTeamPhotoSchema)
      });
      onChange(result.data.data.imageUrl);
    } catch { setError(ar ? 'تعذر رفع الصورة. الصورة السابقة محفوظة؛ حاول مجددًا.' : 'Could not upload. The previous image is preserved; please retry.'); }
    finally { setBusy(false); onBusy?.(false); }
  }
  return <div><label htmlFor="project-image-file">{ar ? 'صورة المشروع' : 'Project image'}</label>
    <p>{ar ? 'المقاس المقترح 1600 × 900 بكسل (16:9). JPG أو PNG أو WebP حتى 10 ميجابايت. احفظ المشروع بعد الرفع.' : 'Recommended: 1600 × 900 pixels (16:9). JPG, PNG or WebP up to 10 MB. Save the project after uploading.'}</p>
    {preview ? <img src={preview} alt={ar ? 'معاينة صورة المشروع' : 'Project image preview'} style={{ width: '100%', maxHeight: 240, objectFit: 'contain' }} /> : null}
    <input id="project-image-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || disabled} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
    {value ? <Button type="button" variant="secondary" disabled={busy || disabled} onClick={() => onChange('')}>{ar ? 'إزالة صورة المشروع' : 'Remove project image'}</Button> : null}
    {busy ? <p role="status">{ar ? 'جارٍ رفع وفحص الصورة…' : 'Uploading and checking image…'}</p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
