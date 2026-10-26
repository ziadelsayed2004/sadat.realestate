// Reviewed against the MongoDB models, repositories and seed collections.
// Unknown collections must be reviewed before a launch can delete anything.
export const LAUNCH_IDENTITY_COLLECTIONS = new Map<string, string>([
  ['users', '_id'], ['admin_profiles', 'userId'], ['admin_credentials', 'userId'],
  ['admin_bootstrap', 'userId'], ['admin_accounts', 'userId']
]);

export const LAUNCH_REFERENCE_COLLECTIONS = new Set([
  'roles', 'admin_settings', 'cms_settings', 'cms_display_settings',
  'settings_seo', 'settings_privacy_policies', 'commission_policies',
  'locations', 'property_taxonomy', 'features_services', 'article_categories',
  'ad_placements', 'ad_settings', 'cms_population_source_cache',
  'cms_team_categories', 'community_categories', 'taxonomy_photos', 'rbac_roles'
]);

export const LAUNCH_PURGED_COLLECTIONS = new Set([
  '_development_seed_runs', '_production_demo_runs', '_production_showcase_runs',
  'account_reports', 'account_state_transitions', 'ad_banner_media', 'ad_banners',
  'ad_quotes', 'ad_requests', 'ad_schedules', 'admin_role_assignments', 'articles',
  'audit_logs', 'cms_about_blocks', 'cms_homepage_sections', 'cms_population_values',
  'cms_real_estate_tips', 'cms_setting_history', 'cms_team_members',
  'commission_account_overrides', 'commission_confirmations', 'commission_exceptions',
  'community_comments', 'community_posts', 'community_reactions', 'community_reports', 'favorites',
  'notifications', 'organizations', 'otp_challenges', 'outbox_events', 'payment_proofs',
  'projects', 'properties', 'property_media', 'property_reports', 'provider_applications',
  'provider_documents', 'provider_profiles', 'provider_settings', 'request_issues',
  'requests', 'seeker_profiles', 'sessions', 'viewing_schedule_locks', 'viewings',
  'cms_banners', 'cms_homepage_metrics', 'cms_article_photos', 'cms_team_photos',
  'organization_photos', 'organization_reconciliations', 'property_edit_drafts',
  'property_media_drafts', 'property_view_events', 'provider_identity_subscriptions',
  'commission_snapshots', 'admin_attention_reads'
]);

export function launchSyntheticFilter(): Record<string, unknown> {
  return { $or: [{ synthetic: true }, { seedKey: { $exists: true } }] };
}
