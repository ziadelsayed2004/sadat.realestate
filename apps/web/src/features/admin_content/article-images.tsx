import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { TeamPhotoUpload, TeamPhotoLoader } from './team-photo.tsx';

export type ArticleImageSelection = { coverId?: string; galleryIds: string[] };
export function ArticleImages({ value, locale, upload, load, onChange, onBusy, onPreview }: {
  value: ArticleImageSelection; locale: SupportedLocale; upload: TeamPhotoUpload; load: TeamPhotoLoader;
  onChange: (value: ArticleImageSelection) => void; onBusy: (busy: boolean) => void; onPreview: (urls: Record<string, string>) => void;
}) {
  const ar = locale === 'ar'; const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [urls, setUrls] = useState<Record<string, string>>({}); const allocated = useRef<string[]>([]); const mounted = useRef(true);
  const ids = useMemo(() => [value.coverId, ...value.galleryIds].filter((id): id is string => Boolean(id)), [value.coverId, value.galleryIds]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; allocated.current.forEach(URL.revokeObjectURL); }; }, []);
  useEffect(() => { onPreview(urls); }, [onPreview, urls]);
  useEffect(() => {
    const controller = new AbortController();
    ids.filter(id => !urls[id]).forEach(id => {
      void load(id, controller.signal).then(blob => {
        if (!controller.signal.aborted) { const url = URL.createObjectURL(blob); allocated.current.push(url); setUrls(current => ({ ...current, [id]: url })); }
      }).catch(() => undefined);
    });
    return () => controller.abort();
  }, [ids, load, urls]);
  const select = async (file?: File, cover = false) => {
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) { setError(ar ? 'اختر JPG أو PNG أو WebP بحجم لا يتجاوز 10 ميجابايت.' : 'Choose JPG, PNG or WebP up to 10 MB.'); return; }
    setBusy(true); onBusy(true); setError('');
    try {
      const photo = await upload(file); if (!mounted.current) return;
      const url = URL.createObjectURL(file); allocated.current.push(url); setUrls(current => ({ ...current, [photo.id]: url }));
      onChange(cover || !value.coverId ? { ...value, coverId: photo.id } : { ...value, galleryIds: [...value.galleryIds, photo.id] });
    } catch { if (mounted.current) setError(ar ? 'تعذر رفع الصورة. أعد المحاولة؛ نص المقال محفوظ في النموذج.' : 'Image upload failed. Retry; your article text remains in the form.'); }
    finally { if (mounted.current) { setBusy(false); onBusy(false); } }
  };
  return <fieldset className="admin-article-images" disabled={busy}><legend>{ar ? 'صور المقال' : 'Article images'}</legend>
    <p>{ar ? 'أول صورة هي الغلاف. مقاس مقترح للغلاف: 1600 × 900 بكسل. يمكنك إضافة حتى 12 صورة أخرى؛ تظهر كاملة داخل المقال.' : 'The first image is the cover. Suggested cover: 1600 × 900 px. Add up to 12 more images, shown in full in the article.'}</p>
    <div className="admin-article-images__grid">{ids.map(id => <div key={id}>{urls[id] ? <img src={urls[id]} alt={ar ? 'معاينة صورة المقال' : 'Article image preview'} /> : <p>{ar ? 'الصورة محفوظة؛ المعاينة غير متاحة.' : 'Image saved; preview unavailable.'}</p>}
      <span>{id === value.coverId ? ar ? 'صورة الغلاف' : 'Cover image' : ar ? 'صورة داخل المقال' : 'Article image'}</span>
      {id !== value.coverId ? <Button type="button" size="sm" variant="secondary" onClick={() => onChange({ coverId: id, galleryIds: [...(value.coverId ? [value.coverId] : []), ...value.galleryIds.filter(item => item !== id)] })}>{ar ? 'تعيين كغلاف' : 'Use as cover'}</Button> : null}
      <Button type="button" size="sm" variant="secondary" onClick={() => onChange({ ...(id !== value.coverId && value.coverId ? { coverId: value.coverId } : {}), galleryIds: value.galleryIds.filter(item => item !== id) })}>{ar ? 'إزالة' : 'Remove'}</Button>
    </div>)}</div>
    <label>{ar ? 'رفع أو تغيير صورة الغلاف' : 'Upload or replace cover'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void select(file, true); }} /></label>
    <label>{ar ? 'إضافة صورة' : 'Add image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(value.coverId && value.galleryIds.length >= 12)} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void select(file); }} /></label>
    {busy ? <p role="status">{ar ? 'جارٍ رفع وفحص الصورة…' : 'Uploading and scanning image…'}</p> : null}{error ? <p role="alert">{error}</p> : null}
  </fieldset>;
}
