import { AD_BANNER_STATUSES, type AdBanner, type SupportedLocale } from '@sadat-real-estate/contracts';
import { getAdminHomeCopy } from './copy.ts';

export function bannerListStatus(status: string, locale: SupportedLocale): string {
  return status === 'draft' ? locale === 'ar' ? 'مسودة / موقوف' : 'Draft / stopped' : getAdminHomeCopy(locale).statuses[status] ?? status;
}

export function BannerListControls({ locale, status, onChange }: { locale: SupportedLocale; status: AdBanner['status'] | ''; onChange: (status: AdBanner['status'] | '') => void }) {
  return <section className="admin-home__request-filter" aria-label={locale === 'ar' ? 'البانرات المحفوظة' : 'Saved banners'}>
    <div><label htmlFor="admin-home-banner-filter">{locale === 'ar' ? 'حالة البانر' : 'Banner status'} </label><select id="admin-home-banner-filter" value={status} onChange={event => onChange(event.target.value as AdBanner['status'] | '')}>
      <option value="">{locale === 'ar' ? 'كل البانرات' : 'All banners'}</option>{AD_BANNER_STATUSES.map(value => <option key={value} value={value}>{bannerListStatus(value, locale)}</option>)}
    </select><p>{locale === 'ar' ? 'البانر الموقوف محفوظ كمسودة. يمكنك معاينته وتعديله هنا دون تشغيله، ثم نشره بعد الحفظ.' : 'Stopped banners are kept as drafts. Preview and edit them here without enabling display, then publish after saving.'}</p></div>
    <a href="#banner-display-settings">{locale === 'ar' ? 'تشغيل عرض البانرات وإعداداته' : 'Banner display settings'}</a>
  </section>;
}
