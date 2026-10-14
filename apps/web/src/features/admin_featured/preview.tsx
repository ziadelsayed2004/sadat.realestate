import { useEffect, useState } from 'react';
import type { AdBanner, FeaturedOptions, PublicHomepageBanner, SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminHomeSource } from '../admin_home/data.ts';
import { Button } from '../design_system/index.ts';
import { FeaturedCard } from '../public/featured-card.tsx';

export function FeaturedPreview({ item, options, loadOptions, source, locale, onClose }: {
  item: AdBanner; options: FeaturedOptions; loadOptions: (id?: string) => Promise<FeaturedOptions>;
  source: AdminHomeSource; locale: SupportedLocale; onClose: () => void;
}) {
  const ar = locale === 'ar';
  const [banner, setBanner] = useState<PublicHomepageBanner>();
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0), [size, setSize] = useState<'desktop' | 'mobile'>('desktop');
  useEffect(() => {
    let current = true, objectUrl: string | undefined;
    setBanner(undefined); setError(false);
    void (async () => {
      const saved = await source.previewBanner(item.id);
      const value = saved.banner;
      const provider = options.advertisers.find(row => row.id === value.featured?.advertiserProviderId || row.aliases?.includes(value.featured?.advertiserProviderId ?? ''));
      let targetUrl: string | undefined;
      if (provider) {
        try {
          const choices = await loadOptions(provider.id);
          targetUrl = choices.destinations.find(row => row.kind === value.featured?.destination?.kind && row.id === value.featured?.destination?.id)?.href;
        } catch { /* A withdrawn advertiser/page does not prevent a private creative preview. */ }
      }
      const preview: PublicHomepageBanner = { key: 'saved_preview', order: value.sortOrder, title: value.title, body: value.body,
        highlight: value.featured?.highlight, installment: value.featured?.installment, eyebrow: value.featured?.eyebrow, ctaLabel: value.featured?.ctaLabel,
        advertiserName: provider?.name, advertiserImageUrl: provider?.imageUrl, advertiserVerified: Boolean(provider?.verified), targetUrl };
      if (current) setBanner(preview);
      if (saved.media) {
        const imageUrl = await source.loadMediaPreview(saved.media.url);
        if (imageUrl.startsWith('blob:')) objectUrl = imageUrl;
        if (!current) { if (objectUrl) URL.revokeObjectURL(objectUrl); return; }
        setBanner({ ...preview, imageUrl });
      }
    })().catch(() => { if (current) setError(true); });
    return () => { current = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.id, item.version, options, loadOptions, source, attempt]);
  return <section className="admin-home__editor" aria-label={ar ? 'معاينة الإعلان المميز' : 'Featured ad preview'}>
    <div className="admin-home__editor-heading"><h2>{ar ? 'معاينة الإعلان' : 'Ad preview'}</h2><Button variant="secondary" onClick={onClose}>{ar ? 'إغلاق' : 'Close'}</Button></div>
    <p>{ar ? 'معاينة للمحتوى المحفوظ فقط. المسودة لا تظهر للزوار حتى تختار الحساب والصفحة وتنشرها بموعد ساري.' : 'Preview of saved content only. Drafts stay hidden until you select an advertiser and page and publish for valid dates.'}</p>
    <div className="admin-home__inline-actions"><Button variant="secondary" onClick={() => setSize('desktop')}>{ar ? 'كمبيوتر' : 'Desktop'}</Button><Button variant="secondary" onClick={() => setSize('mobile')}>{ar ? 'موبايل' : 'Mobile'}</Button></div>
    {!banner && !error ? <p role="status">{ar ? 'جارٍ تحميل المعاينة…' : 'Loading preview…'}</p> : null}
    {error ? <div role="alert"><p>{ar ? 'تعذر تحميل المعاينة كاملة. أعد المحاولة.' : 'Could not load the complete preview. Retry.'}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة تحميل المعاينة' : 'Reload preview'}</Button></div> : null}
    {banner ? <div className="admin-featured__preview public-homepage__section--banners" data-size={size}><div className="public-homepage__banner-card"><FeaturedCard banner={banner} locale={locale} preview /></div></div> : null}
  </section>;
}
