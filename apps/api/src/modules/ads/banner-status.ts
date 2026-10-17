import type { AdBanner } from '@sadat-real-estate/contracts';

export function currentBannerStatus(banner: Pick<AdBanner, 'status' | 'startAt' | 'endAt'>, at: Date): AdBanner['status'] {
  if (banner.status !== 'active' && banner.status !== 'scheduled') return banner.status;
  if (Date.parse(banner.endAt) <= at.getTime()) return 'ended';
  return Date.parse(banner.startAt) > at.getTime() ? 'scheduled' : 'active';
}
