import { useEffect, useState } from 'react';
import type { AdBannerConfig, SupportedLocale } from '@sadat-real-estate/contracts';
import { getBannerControlCopy } from './banner-controls-copy.ts';
export { getBannerControlCopy } from './banner-controls-copy.ts';
import { Button } from '../design_system/index.ts';
import type { AdminHomeSource } from './data.ts';

export function BannerDisplayControls({ locale, source }: { locale: SupportedLocale; source: AdminHomeSource }) {
  const copy = getBannerControlCopy(locale);
  const [config, setConfig] = useState<AdBannerConfig>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setError(false);
    void source.loadBannerConfig().then(value => { if (active) setConfig(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [source, attempt]);
  async function toggle() {
    if (!config) return;
    setBusy(true); setError(false);
    try { setConfig(await source.updateBannerConfig({ enabled: !config.enabled, expectedVersion: config.version, reason: config.enabled ? 'Stop homepage banner display' : 'Enable homepage banner display' })); }
    catch { setError(true); } finally { setBusy(false); }
  }
  async function togglePlacement(placement: AdBannerConfig['placements'][number]) {
    if (!config || !['homepage.hero', 'homepage.featured'].includes(placement.key)) return;
    setBusy(true); setError(false);
    try { setConfig(await source.updateBannerConfig({ enabled: config.enabled, expectedVersion: config.version,
      [placement.key === 'homepage.hero' ? 'heroActive' : 'featuredActive']: !placement.active,
      reason: `${placement.active ? 'Stop' : 'Enable'} placement ${placement.key}` })); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <section id="banner-display-settings" className="admin-home__panel admin-home__banner-settings"><h2>{copy.setup}</h2><p>{copy.configureHint}</p>{config ? <>
    <p><a href={`/admin/content/homepage?section=hero&lang=${locale}`}>{locale === 'ar' ? 'تعديل نصوص بداية الرئيسية' : 'Edit homepage introduction text'}</a></p>
    <p role="status">{config.enabled ? copy.on : copy.off}</p>
    <Button variant="secondary" disabled={busy} onClick={() => void toggle()}>{config.enabled ? copy.disable : copy.enable}</Button>
    <section id="banner-placements" aria-labelledby="banner-placements-title">
      <h3 id="banner-placements-title">{copy.placementsTitle}</h3><p>{copy.placementHelp}</p>
      <p>{locale === 'ar' ? 'البانر العلوي والكارت المميز مكانان مستقلان؛ لكل مكان إعلاناته ومفتاح تشغيله. إضافة كارت مميز لا تغيّر البانر أعلى الصفحة.' : 'The hero banner and featured card are independent positions, each with its own ads and display switch. Adding a featured card does not change the hero banner.'}</p>
      <p>{locale === 'ar' ? 'دي أماكن عرض ثابتة، وليست صور البانرات. تعديل الصورة أو حذف الإعلان من العرض يتم من «إدارة إعلانات الموضع». إيقاف الموضع يخفي كل إعلاناته مؤقتًا ويحفظ بياناتها؛ تشغيله لا ينشر المسودات.' : 'These are fixed display locations, not banner images. Use “Manage placement ads” to edit images or remove an ad from display. Stopping a placement temporarily hides all its ads and keeps their data; enabling it does not publish drafts.'}</p>
      <a href={`/admin/settings/advertising?lang=${locale}`}>{copy.advertisingSettings}</a>
      {config.placements.length === 0 ? <p>{copy.noPlacements}</p> : <div className="admin-home__table-wrap admin-home__banner-list"><table className="admin-home__table" role="table"><thead className="a11y-visually-hidden"><tr><th scope="col">{copy.placementName}</th><th scope="col">{copy.placementState}</th><th scope="col">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th></tr></thead><tbody role="rowgroup">{config.placements.map(placement => <tr role="row" key={placement.key} data-placement={placement.key}>
        <td role="cell"><strong>{placement.label[locale] ?? placement.label.ar ?? placement.label.en}</strong></td><td role="cell" data-label={copy.placementState}>{placement.active ? copy.placementActive : copy.placementInactive}</td>
        <td><div className="admin-home__row-actions">{['homepage.hero', 'homepage.featured'].includes(placement.key) ? <>
          <a href={placement.key === 'homepage.hero' ? `/admin/banners?lang=${locale}#banner-list` : `/admin/ads/featured?lang=${locale}`}>{locale === 'ar' ? 'إدارة إعلانات الموضع' : 'Manage placement ads'}</a>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void togglePlacement(placement)}>{placement.active ? locale === 'ar' ? 'إيقاف الموضع' : 'Stop placement' : locale === 'ar' ? 'تشغيل الموضع' : 'Enable placement'}</Button>
        </> : <a href={`/admin/settings/advertising?lang=${locale}`}>{copy.advertisingSettings}</a>}</div></td>
      </tr>)}</tbody></table></div>}
      {!config.enabled ? <p>{locale === 'ar' ? 'العرض العام متوقف؛ تشغيل موضع وحده لا يشغّل العرض العام.' : 'Global display is stopped; enabling a placement alone does not enable global display.'}</p> : null}
    </section>
  </> : null}{error ? <p role="alert">{copy.setupError} <Button size="sm" variant="ghost" onClick={() => setAttempt(value => value + 1)}>{locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}</Button></p> : null}</section>;
}
