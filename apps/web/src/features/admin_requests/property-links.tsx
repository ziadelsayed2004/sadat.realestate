import type { RequestData, SupportedLocale } from '@sadat-real-estate/contracts';
import { getAdminRequestsCopy } from './copy.ts';

export function RequestPropertyLinks({ request, locale, compact = false }: { request: RequestData; locale: SupportedLocale; compact?: boolean }) {
  const slug = request.payload.organizationSlug;
  if (!request.propertyId) return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) ? <a href={`/developers/${slug}?lang=${locale}`} target="_blank" rel="noopener noreferrer">{locale === 'ar' ? 'عرض الشركة' : 'View company'}</a> : null;
  const copy = getAdminRequestsCopy(locale);
  return <div className="admin-requests__property-links">
    {request.property?.slug ? <a href={`/properties/${encodeURIComponent(request.property.slug)}?lang=${locale}`} target="_blank" rel="noopener noreferrer">{copy.openProperty}</a> : null}
    {!compact || !request.property?.slug ? <a href={`/admin/properties/${request.propertyId}?lang=${locale}`} target="_blank" rel="noopener noreferrer">{copy.manageProperty}</a> : null}
  </div>;
}
