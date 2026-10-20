export const DEFAULT_CATEGORY_IMAGE = '/assets/sadat-real-estate-logo.png';

export function categoryImageUrl(imageUrl?: string | null): string {
  return imageUrl?.trim() && imageUrl !== '/assets/canonical/public/sadat-city-entrance.jpg' && imageUrl !== '/assets/canonical/public/category-placeholder.svg' ? imageUrl : DEFAULT_CATEGORY_IMAGE;
}
