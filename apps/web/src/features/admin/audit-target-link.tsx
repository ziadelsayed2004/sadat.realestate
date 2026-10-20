import type { AuditLogData, SupportedLocale } from '@sadat-real-estate/contracts';

export function auditTargetHref(log: Pick<AuditLogData, 'targetType' | 'targetId'>, locale: SupportedLocale): string | undefined {
  const id = encodeURIComponent(log.targetId);
  const routes: Record<string, string> = {
    property: `/admin/properties/review?propertyId=${id}`, property_media: '/admin/properties',
    cms_homepage_section: `/admin/content/homepage?contentId=${id}`, cms_real_estate_tip: `/admin/content/tips?contentId=${id}`,
    cms_about_block: '/admin/content/about', article: `/admin/articles?articleId=${id}`, article_category: '/admin/article-categories',
    rbac_role: `/admin/roles/${id}`, user: `/admin/users/${id}`, admin_user: `/admin/admin-users/${id}`,
    provider_application: `/admin/providers/${id}`, provider: `/admin/providers/${id}`, ad_request: `/admin/ads/requests?requestId=${id}`,
    ad_banner: '/admin/banners', community_post: `/admin/community?postId=${id}`, community_report: `/admin/community/moderation?reportId=${id}`,
    property_taxonomy: '/admin/property-categories', location: '/admin/locations', admin_settings: '/admin/settings/platform',
    commission_account_override: '/admin/commissions/history', commission_policy: '/admin/commissions', commission_exception: '/admin/commissions/exceptions'
  };
  const path = routes[log.targetType];
  return path ? `${path}${path.includes('?') ? '&' : '?'}lang=${locale}` : undefined;
}
export function AuditTargetLink({ log, locale }: { log: Pick<AuditLogData, 'targetType' | 'targetId'>; locale: SupportedLocale }) {
  const href = auditTargetHref(log, locale);
  return href ? <a className="ui-button ui-button--secondary" href={href} target="_blank" rel="noreferrer">{locale === 'ar' ? 'فتح السجل الذي اتغير' : 'Open the changed record'} ↗</a> : null;
}
