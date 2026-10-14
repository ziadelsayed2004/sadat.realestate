export const DEFAULT_CATEGORY_IMAGE = '/assets/canonical/public/category-placeholder.svg';

export function categoryImageUrl(imageUrl?: string | null): string {
  return imageUrl?.trim() && imageUrl !== '/assets/canonical/public/sadat-city-entrance.jpg' ? imageUrl : DEFAULT_CATEGORY_IMAGE;
}
