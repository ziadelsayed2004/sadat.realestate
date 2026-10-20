import { useEffect, useState } from 'react';
import type { FeaturedOptions, SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminHomeSource } from './data.ts';
import { localizedText } from '../public/model.ts';

export function BannerDestinationPicker({ providerId, source, locale, value, onChange }: { providerId: string; source: AdminHomeSource; locale: SupportedLocale; value: string; onChange: (url: string) => void }) {
  const [pages, setPages] = useState<FeaturedOptions['destinations']>([]);
  const [failed, setFailed] = useState(false);
  const ar = locale === 'ar';
  useEffect(() => {
    let active = true;
    void source.loadDestinations(providerId).then(data => { if (active) { setPages(data.destinations); setFailed(false); } }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [providerId, source]);
  useEffect(() => {
    if (!value && pages.length === 1) onChange(new URL(pages[0]!.href, 'https://elsadatrealestate.com').href);
  }, [value, pages, onChange]);
  return <div className="admin-home__hint"><label>{ar ? 'اختيار رابط تلقائي من صفحات صاحب الطلب' : 'Choose a destination from the request owner’s pages'}<select value={pages.find(page => new URL(page.href, 'https://elsadatrealestate.com').href === value)?.href ?? ''} onChange={event => { if (event.target.value) onChange(new URL(event.target.value, 'https://elsadatrealestate.com').href); }}><option value="">{ar ? 'اختر صفحة أو اكتب الرابط يدويًا بالأسفل' : 'Choose a page or enter its URL below'}</option>{pages.map(page => <option value={page.href} key={`${page.kind}:${page.id}`}>{localizedText(page.name, locale)}</option>)}</select></label><p>{failed ? ar ? 'تعذر تحميل الصفحات؛ يمكنك إدخال رابط الوجهة يدويًا.' : 'Pages could not load; enter the destination URL manually.' : ar ? 'لو للحساب صفحة واحدة هتتحدد تلقائيًا. لو له أكثر من صفحة، اختار الصفحة المقصودة حتى لا يفتح الإعلان عقارًا آخر.' : 'A single page is selected automatically. When there are several pages, choose the intended destination.'}</p></div>;
}
