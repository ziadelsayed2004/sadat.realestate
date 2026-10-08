import type { AdBanner, AdBannerPatch } from '@sadat-real-estate/contracts';

/** An explicit empty selection must not fall back to the legacy cover image. */
export function selectedBannerMediaIds(banner: Pick<AdBanner, 'mediaId' | 'mediaIds'>): string[] {
  return banner.mediaIds ?? (banner.mediaId ? [banner.mediaId] : []);
}

export function bannerImageChanges(current: AdBanner, input: AdBannerPatch) {
  if (input.mediaIds !== undefined) return { mediaIds: input.mediaIds, mediaId: input.mediaIds[0] };
  if (input.mediaId !== undefined && current.mediaIds !== undefined) {
    return { mediaIds: input.mediaId ? [input.mediaId] : [], mediaId: input.mediaId ?? undefined };
  }
  return {};
}
