import type { AdBanner, AdBannerPatch } from '@sadat-real-estate/contracts';

/** An explicit empty selection must not fall back to the legacy cover image. */
export function selectedBannerMediaIds(banner: Pick<AdBanner, 'mediaId' | 'mediaIds'>): string[] {
  return banner.mediaIds ?? (banner.mediaId ? [banner.mediaId] : []);
}

export function bannerImageChanges(current: AdBanner, input: AdBannerPatch) {
  if (input.mediaIds !== undefined) return { mediaIds: input.mediaIds, mediaId: input.mediaIds[0], ...(input.slides === undefined && current.slides ? { slides: current.slides.filter(slide => input.mediaIds!.includes(slide.mediaId)) } : {}) };
  if (input.mediaId !== undefined && current.mediaIds !== undefined) {
    return { mediaIds: input.mediaId ? [input.mediaId] : [], mediaId: input.mediaId ?? undefined, ...(input.slides === undefined && current.slides ? { slides: current.slides.filter(slide => slide.mediaId === input.mediaId) } : {}) };
  }
  return {};
}

export function bannerSlideOverrides(slides: AdBanner['slides'], mediaId: string) {
  const slide = slides?.find(item => item.mediaId === mediaId);
  if (!slide) return {};
  return { ...(slide.title ? { title: slide.title } : {}), ...(slide.body ? { body: slide.body } : {}), ...(slide.targetUrl ? { targetUrl: slide.targetUrl } : {}) };
}
