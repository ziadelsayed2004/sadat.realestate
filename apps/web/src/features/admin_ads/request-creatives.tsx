import { useEffect, useState } from 'react';
import type { AdBanner, AdBannerListData, SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminHomeSource } from '../admin_home/data.ts';
import { Button } from '../design_system/index.ts';
import { getAdminHomeCopy } from '../admin_home/copy.ts';

function Creative({ banner, locale, source }: { banner: AdBanner; locale: SupportedLocale; source: AdminHomeSource }) {
  const ar = locale === 'ar';
  const title = banner.title[locale] || banner.title.ar || banner.title.en || banner.id;
  const [images, setImages] = useState<Array<{ id: string; url: string }>>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); const blobs = new Set<string>();
    const release = () => { blobs.forEach(url => URL.revokeObjectURL(url)); blobs.clear(); };
    setImages(undefined); setFailed(false);
    void source.previewBanner(banner.id, controller.signal).then(async preview => {
      const media = preview.mediaItems ?? (preview.media ? [preview.media] : []);
      const values = await Promise.allSettled(media.map(async item => {
        const url = await source.loadMediaPreview(item.url);
        if (url.startsWith('blob:')) {
          if (controller.signal.aborted) URL.revokeObjectURL(url);
          else blobs.add(url);
        }
        return { id: item.id, url };
      }));
      if (values.some(value => value.status === 'rejected')) throw new Error('BANNER_IMAGE_PREVIEW_FAILED');
      if (!controller.signal.aborted) setImages(values.flatMap(value => value.status === 'fulfilled' ? [value.value] : []));
    }).catch(() => { release(); if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); release(); };
  }, [banner.id, banner.version, source, attempt]);
  return <article className="admin-ads__creative" data-testid="request-creative">
    <h5>{title}</h5><p>{getAdminHomeCopy(locale).statuses[banner.status]} · {banner.placementKey}</p>
    {banner.targetUrl ? <a href={banner.targetUrl} target="_blank" rel="noopener noreferrer">{ar ? 'صفحة العقار أو المشروع أو الشركة المعلن عنها' : 'Advertised property, project or company page'}<span dir="ltr">{banner.targetUrl}</span></a> : <p>{ar ? 'لم يحدد رابط الوجهة بعد؛ لا يمكن معرفة صفحة العقار من هذا البانر.' : 'No destination assigned yet; this banner does not identify a property page.'}</p>}
    {failed ? <div role="alert"><p>{ar ? 'تعذر عرض صور البانر. قد تحتاج صلاحية عرض البانرات.' : 'Could not display banner images. Banner viewing permission may be required.'}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></div> : images === undefined ? <p role="status">{ar ? 'جارٍ تحميل صور الإعلان…' : 'Loading advertising images…'}</p> : images.length ? <div className="admin-ads__creative-images">{images.map((item, index) => <img key={item.id} src={item.url} alt={`${title} — ${ar ? 'صورة' : 'Image'} ${index + 1}`} onError={() => setFailed(true)} />)}</div> : <p>{ar ? 'لم تضف صور لهذا البانر بعد.' : 'No images added to this banner yet.'}</p>}
  </article>;
}

export function RequestCreatives({ requestId, locale, source }: { requestId: string; locale: SupportedLocale; source: AdminHomeSource }) {
  const ar = locale === 'ar';
  const [data, setData] = useState<AdBannerListData>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(undefined); setFailed(false);
    void source.loadBanners({ adRequestId: requestId, page: 1, limit: 20 }, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [source, requestId, attempt]);
  return <section className="admin-ads__creatives" aria-label={ar ? 'صور الإعلان المعدة لهذا الطلب' : 'Advertising images prepared for this request'}>
    <h4>{ar ? 'صور الإعلان المعدة لهذا الطلب' : 'Advertising images prepared for this request'}</h4>
    {failed ? <div role="alert"><p>{ar ? 'تعذر تحميل بانرات هذا الطلب. راجع صلاحية عرض البانرات أو أعد المحاولة.' : 'Could not load request banners. Check banner viewing permission or retry.'}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></div> : !data ? <p role="status">{ar ? 'جارٍ تحميل البانرات…' : 'Loading banners…'}</p> : !data.items.length ? <p>{ar ? 'لا توجد بانرات أو صور إعلان مرتبطة بهذا الطلب بعد. إيصال الدفع لا يضيف صورًا للإعلان.' : 'No banners or advertising images are linked to this request yet. A payment receipt does not add advertising images.'}</p> : <>{data.items.map(banner => <Creative key={banner.id} banner={banner} locale={locale} source={source} />)}{data.total > data.items.length ? <p>{ar ? 'هذه أول 20 نتيجة؛ افتح صور وبانرات هذا الطلب لعرض الباقي.' : 'Showing the first 20 results; open Images and banners for this request to see the rest.'}</p> : null}</>}
  </section>;
}
