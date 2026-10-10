import { useEffect, useState } from 'react';
import type { AdBanner, AdBannerListData, AdBannerMedia, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { AdminHomeSource } from './data.ts';

function LibraryImage({ media, source, locale, disabled, onPick }: { media: AdBannerMedia; source: AdminHomeSource; locale: SupportedLocale; disabled: boolean; onPick: (file: File) => void }) {
  const [image, setImage] = useState<{ url: string; file: File }>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let preview: string | undefined;
    setFailed(false); setImage(undefined);
    void source.loadMediaBlob(media.url).then(blob => {
      if (blob.size === 0 || blob.size > 10 * 1024 * 1024) throw new Error('INVALID_LIBRARY_IMAGE');
      if (!active) return;
      preview = URL.createObjectURL(blob);
      setImage({ url: preview, file: new File([blob], `banner-${media.id}.${media.mime.split('/')[1]}`, { type: media.mime }) });
    }).catch(() => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); if (active) setFailed(true); });
    return () => { active = false; if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); };
  }, [media.id, media.mime, media.url, source, attempt]);
  return <div className="admin-home__banner-slide">
    {image ? <img src={image.url} alt={locale === 'ar' ? 'صورة محفوظة في المكتبة' : 'Saved library image'} /> : <p role="status">{failed ? (locale === 'ar' ? 'تعذر تحميل الصورة.' : 'Could not load image.') : (locale === 'ar' ? 'جارٍ تحميل الصورة…' : 'Loading image…')}</p>}
    {failed ? <Button type="button" variant="secondary" onClick={() => setAttempt(value => value + 1)}>{locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}</Button> : <Button type="button" disabled={disabled || !image} onClick={() => { if (image) onPick(image.file); }}>{locale === 'ar' ? 'إضافة هذه الصورة' : 'Add this image'}</Button>}
  </div>;
}

export function BannerMediaLibrary({ source, locale, disabled, onPick }: { source: AdminHomeSource; locale: SupportedLocale; disabled: boolean; onPick: (file: File) => void }) {
  const ar = locale === 'ar';
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdBannerListData>();
  const [selected, setSelected] = useState<AdBanner>();
  const [media, setMedia] = useState<AdBannerMedia[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(undefined); setSelected(undefined); setFailed(false);
    void source.loadBanners({ page, limit: 20 }, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [source, page, attempt]);
  useEffect(() => {
    const controller = new AbortController(); setMedia(undefined); setFailed(false);
    if (selected) void source.loadBannerMedia(selected.id, controller.signal).then(items => {
      const ids = selected.mediaIds ?? (selected.mediaId ? [selected.mediaId] : []);
      if (!controller.signal.aborted) setMedia(items.filter(item => item.active && ids.includes(item.id) && /^\/api\/v1\/public\/banner-media\/[a-f0-9]{24}$/u.test(item.url)));
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [source, selected, attempt]);
  return <section aria-label={ar ? 'مكتبة الوسائط' : 'Media library'} data-testid="banner-media-library">
    <p className="admin-home__hint">{ar ? 'اختر بانرًا ثم صورة من الصور المرفوعة سابقًا. تُضاف نسخة مستقلة إلى إعلانك عند الحفظ.' : 'Choose a banner, then a previously uploaded image. An independent copy is added to your ad when saved.'}</p>
    {failed ? <p role="alert">{ar ? 'تعذر تحميل المكتبة. راجع الاتصال والصلاحيات.' : 'Could not load the library. Check connection and permissions.'} <Button type="button" variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></p> : !data ? <p role="status">{ar ? 'جارٍ تحميل المكتبة…' : 'Loading library…'}</p> : <>
      {data.items.length ? <label>{ar ? 'صور البانر' : 'Banner images'}<select style={{ minWidth: 0, maxWidth: '100%' }} value={selected?.id ?? ''} disabled={disabled} onChange={event => setSelected(data.items.find(item => item.id === event.target.value))}><option value="">{ar ? 'اختر بانرًا' : 'Choose a banner'}</option>{data.items.map(item => <option key={item.id} value={item.id}>{item.title[locale] ?? item.title.ar ?? item.title.en ?? item.id}</option>)}</select></label> : <p>{ar ? 'لا توجد بانرات محفوظة بعد. ارفع صورة من جهازك.' : 'No saved banners yet. Upload an image from your device.'}</p>}
      <div className="admin-home__inline-actions"><Button type="button" variant="secondary" disabled={disabled || page <= 1} onClick={() => setPage(value => value - 1)}>{ar ? 'السابق' : 'Previous'}</Button><span>{page} / {Math.max(1, Math.ceil(data.total / data.limit))}</span><Button type="button" variant="secondary" disabled={disabled || page * data.limit >= data.total} onClick={() => setPage(value => value + 1)}>{ar ? 'التالي' : 'Next'}</Button></div>
      {selected ? media ? media.length ? <div className="admin-home__banner-gallery">{media.map(item => <LibraryImage key={item.id} media={item} source={source} locale={locale} disabled={disabled} onPick={onPick} />)}</div> : <p>{ar ? 'لا توجد صور مرفوعة محفوظة لهذا البانر.' : 'No saved uploaded images for this banner.'}</p> : <p role="status">{ar ? 'جارٍ تحميل الصور…' : 'Loading images…'}</p> : null}
    </>}
  </section>;
}
