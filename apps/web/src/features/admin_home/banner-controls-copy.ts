import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { getEditableCopyCatalog } from '../localization/copy-catalog.ts';

type BannerControlCopy = Readonly<Record<'edit' | 'publish' | 'stop' | 'archive' | 'confirm' | 'setup' | 'enable' | 'disable' | 'placementsTitle' | 'placementName' | 'placementCode' | 'placementState' | 'placementActive' | 'placementInactive' | 'noPlacements' | 'placementHelp' | 'advertisingSettings' | 'on' | 'off' | 'setupError' | 'upload' | 'uploadHint' | 'draftSaved' | 'published' | 'mediaRequired' | 'expired' | 'conflict' | 'reason' | 'failed' | 'archiveNote' | 'previous' | 'next' | 'configureHint', string>>;

export function getBannerControlCopy(locale: SupportedLocale): BannerControlCopy {
  return getEditableCopyCatalog(locale)['admin_home/banner-controls-copy#getBannerControlCopy'] as unknown as BannerControlCopy;
}
