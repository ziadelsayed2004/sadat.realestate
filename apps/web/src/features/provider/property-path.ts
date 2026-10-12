import type { PropertyData } from '@sadat-real-estate/contracts';

export function providerPropertyStatusPath(property: PropertyData): string {
  const propertyId = encodeURIComponent(property.id);
  if (property.status === 'rejected') return `/provider/properties/${propertyId}/rejected`;
  if (property.status === 'pending_review') return `/provider/properties/${propertyId}/submitted`;
  if (property.status === 'approved' || property.status === 'published' || property.status === 'hidden') return `/provider/properties/${propertyId}/published`;
  return `/provider/properties/${propertyId}/review`;
}

export function providerPropertyOpenPath(property: PropertyData): string {
  if (property.status === 'published' && property.active) return `/properties/${encodeURIComponent(property.slug)}`;
  if (property.status === 'draft') return `/provider/properties/${encodeURIComponent(property.id)}/basic`;
  return providerPropertyStatusPath(property);
}
