import type { AdBanner, AdRequest } from '@sadat-real-estate/contracts';
import { AdBannerServiceError } from './service.js';

/** A paid banner uses the same placement and display window as its request. */
export function validateBannerCampaign(banner: Pick<AdBanner, 'adRequestId' | 'placementKey' | 'startAt' | 'endAt' | 'status' | 'targetUrl'>, request?: Pick<AdRequest, 'id' | 'status' | 'placementKey' | 'intervalStart' | 'intervalEnd'>): void {
  if (!banner.adRequestId) return;
  if (!request || request.id !== banner.adRequestId) throw new AdBannerServiceError('NOT_FOUND');
  if (request.placementKey !== banner.placementKey || !request.intervalStart || !request.intervalEnd ||
    new Date(request.intervalStart).getTime() !== new Date(banner.startAt).getTime() ||
    new Date(request.intervalEnd).getTime() !== new Date(banner.endAt).getTime()) throw new AdBannerServiceError('BANNER_INVALID_STATE');
  if (['scheduled', 'active'].includes(banner.status)) {
    if (!['scheduled', 'active'].includes(request.status)) throw new AdBannerServiceError('BANNER_INVALID_STATE');
    if (!banner.targetUrl) throw new AdBannerServiceError('BANNER_TARGET_REQUIRED');
  }
}
