import type { RequestData, SupportedLocale } from '@sadat-real-estate/contracts';
import { getAdminRequestsCopy } from './copy.ts';

export function RequestPropertyLinks({ request, locale, compact = false }: { request: RequestData; locale: SupportedLocale; compact?: boolean }) {
  if (!request.propertyId) return null;
  const copy = getAdminRequestsCopy(locale);
  return <div className="admin-requests__property-links">
    {request.property?.slug ? <a href={`/properties/${encodeURIComponent(request.property.slug)}?lang=${locale}`} target="_blank" rel="noopener noreferrer">{copy.openProperty}</a> : null}
    {!compact || !request.property?.slug ? <a href={`/admin/properties/${request.propertyId}?lang=${locale}`} target="_blank" rel="noopener noreferrer">{copy.manageProperty}</a> : null}
  </div>;
}
