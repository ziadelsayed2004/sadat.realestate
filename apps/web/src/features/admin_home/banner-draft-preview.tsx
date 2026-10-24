import { bannerFileKey, type BannerSlideDrafts } from './banner-slide-editor.tsx';
import { useEffect, useState } from 'react';
import type { LocalizedText, SupportedLocale } from '@sadat-real-estate/contracts';
import { localizedText } from '../public/model.ts';
import { Button } from '../design_system/index.ts';
import type { BannerImageSelection } from './banner-gallery.tsx';

export function BannerDraftPreview({ locale, title, body, files, images, keepOriginal, targetUrl, drafts = {} }: { locale: SupportedLocale; title: LocalizedText; body: LocalizedText; files: File[]; images: BannerImageSelection[]; keepOriginal: boolean; drafts?: BannerSlideDrafts; targetUrl?: string }) {
  const ar = locale === 'ar';
  const [urls, setUrls] = useState<string[]>([]), [mobile, setMobile] = useState(false), [original, setOriginal] = useState(false), [image, setImage] = useState(0);
  useEffect(() => { const next = files.map(file => URL.createObjectURL(file)); setUrls(next); return () => next.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  const pictures = [...images.map(item => ({ url: item.url, draft: drafts[item.id] })), ...urls.map((url, index) => ({ url, draft: drafts[bannerFileKey(files[index]!)] }))];
  const current = pictures[image % Math.max(pictures.length, 1)];
  const showingOriginal = keepOriginal && original;
  const url = showingOriginal ? '/assets/canonical/public/home-hero-sadat-city.png' : current?.url;
  return <aside className="admin-home__draft-preview" aria-label={ar ? 'معاينة البانر قبل النشر' : 'Banner preview before publishing'}>
    <h3>{ar ? 'معاينة مباشرة قبل الحفظ والنشر' : 'Live preview before saving and publishing'}</h3>
    <p>{ar ? 'دي معاينة محلية فقط؛ لا تنشر الإعلان ولا تحفظه.' : 'Local preview only. It does not save or publish the advertisement.'}</p>
    <div className="admin-home__inline-actions">
      <Button type="button" size="sm" variant="secondary" onClick={() => setMobile(value => !value)}>{mobile ? ar ? 'عرض اللابتوب' : 'Laptop view' : ar ? 'عرض الهاتف' : 'Phone view'}</Button>
      {keepOriginal ? <Button type="button" size="sm" variant="secondary" onClick={() => setOriginal(value => !value)}>{showingOriginal ? ar ? 'معاينة الإعلان' : 'Preview advertisement' : ar ? 'معاينة المقدمة الأصلية' : 'Preview original introduction'}</Button> : null}
      {pictures.length > 1 && !showingOriginal ? <Button type="button" size="sm" variant="secondary" onClick={() => setImage(value => value + 1)}>{ar ? 'الصورة التالية' : 'Next image'}</Button> : null}
    </div>
    <div className="admin-home__draft-preview-frame" data-mobile={mobile || undefined}>
      {url ? <img src={url} alt="" /> : <span className="admin-home__draft-preview-empty">{ar ? 'اختر صورة لعرضها هنا قبل الرفع' : 'Choose an image to preview before uploading'}</span>}
      <div className="admin-home__draft-preview-copy"><h4>{showingOriginal ? ar ? 'ابحث عن عقارك الآن في مدينة السادات' : 'Find your property in Sadat City' : (localizedText(current?.draft?.title, locale) ?? localizedText(title, locale)) || (ar ? 'عنوان إعلانك' : 'Your advertisement title')}</h4><p>{showingOriginal ? ar ? 'منصة متكاملة لعقارات وخدمات مدينة السادات' : 'Sadat City properties and services' : (localizedText(current?.draft?.body, locale) ?? localizedText(body, locale))}</p></div>
    </div>
    {!showingOriginal && (current?.draft?.targetUrl || targetUrl) ? <p><bdi>{current?.draft?.targetUrl || targetUrl}</bdi></p> : null}
    {keepOriginal ? <p>{ar ? 'المقدمة الأصلية ستظل أول صورة، ثم يتبدل العرض بينها وبين صور الإعلان. البحث وقائمة الموقع يظلان متاحين.' : 'The original introduction remains the first slide, rotating with advertisement images. Search and site navigation remain available.'}</p> : null}
  </aside>;
}
