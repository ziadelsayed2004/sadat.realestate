import type { AdAdminRequest, AdBannerConfig, SupportedLocale } from '@sadat-real-estate/contracts';
import { adPlacementLabel } from '../admin_ads/request-summary.tsx';

export function BannerPlacementOptions({ placements, placementKey, campaign, locale }: {
  placements: AdBannerConfig['placements']; placementKey: string; campaign: AdAdminRequest | undefined; locale: SupportedLocale;
}) {
  const fallback = campaign ? adPlacementLabel(campaign, locale) : placementKey === 'homepage.hero' ? (locale === 'ar' ? 'بانر الصفحة الرئيسية' : 'Homepage banner') : placementKey;
  return <>
    {!placements.some(item => item.key === placementKey) ? <option value={placementKey}>{fallback}</option> : null}
    {placements.map(item => <option key={item.key} value={item.key} disabled={!item.active}>{item.label[locale] || item.label.ar || item.label.en || item.key}</option>)}
  </>;
}
