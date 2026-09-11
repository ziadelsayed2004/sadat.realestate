// Each assertion is scoped to an observed check, never to attachment presence.
export function reviewedJourneyGuarantees(journeyId, { requests, community, communityGuarantees, privacy, seeker }) {
  const evidence = [];
  const add = (run, path, field, check, category) => {
    if (run?.status !== 'PASS_LOCAL' || run.mockedRoutes === true || !run[field]?.includes(check)) return;
    evidence.push({ category, check, path, verifiedAt: run.finishedAt ?? run.testedAt });
  };
  const request = (check, category) => add(requests, 'docs/quality/guide-runs/request-guarantees-local-latest.json', 'checks', check, category);
  if (['GUIDE-06', 'GUIDE-21'].includes(journeyId)) {
    request('foreign_request_read_and_cancel_404', 'horizontalAccess');
    request('current_account_status_overrides_previously_issued_tokens', 'currentSessionState');
    request('live_RBAC_revocation_denies_write_keeps_authorized_read', 'roleAuthorization');
    request('concurrent_identical_creation_one_201_one_409_one_record', 'duplicateMutation');
    request('concurrent_decisions_one_success_one_409_one_audit', 'expectedVersion409');
    request('missing_reason_400', 'decisionReason');
    request('audit_failure_rolls_back_both_mutation_and_inserted_audit', 'atomicAuditRollback');
  }
  if (journeyId === 'GUIDE-07') {
    request('legacy_profile_owned_viewing_visible_and_actionable_only_to_linked_account', 'horizontalAccess');
    request('viewing_admin_requires_own_permission_and_current_active_account', 'currentSessionState');
    request('viewing_admin_requires_own_permission_and_current_active_account', 'roleAuthorization');
    request('two_customers_same_slot_one_201_one_409', 'duplicateMutation');
    request('viewing_concurrent_confirmation_one_200_one_409', 'expectedVersion409');
    request('viewing_cancel_missing_empty_whitespace_short_reason_400_without_write', 'decisionReason');
    request('viewing_audit_failure_rolls_back_mutation_and_audit', 'atomicAuditRollback');
  }
  if (['GUIDE-03', 'GUIDE-22'].includes(journeyId) && community?.journeys?.includes(journeyId)) {
    add(community, 'docs/quality/guide-runs/community-local-latest.json', 'authorization', 'limited_admin_moderation_denied_403', 'roleAuthorization');
    add(community, 'docs/quality/guide-runs/community-local-latest.json', 'transitions', 'concurrent_hide_one_200_one_409_v2', 'expectedVersion409');
  }
  if (['GUIDE-03', 'GUIDE-22'].includes(journeyId) && communityGuarantees?.journeys?.includes(journeyId)) {
    for (const [check, category] of [
      ['all_moderation_actions_missing_empty_whitespace_reason_400_without_write', 'decisionReason'],
      ['audit_failure_rolls_back_post_and_inserted_audit', 'atomicAuditRollback'],
      ['current_admin_status_overrides_previously_issued_token', 'currentSessionState'],
    ]) add(communityGuarantees, 'docs/quality/guide-runs/community-guarantees-local-latest.json', 'checks', check, category);
  }
  if (['GUIDE-25', 'GUIDE-26'].includes(journeyId) && privacy?.journeys?.includes(journeyId)) {
    add(privacy, 'docs/quality/guide-runs/privacy-security-local-latest.json', 'authorization', 'stale_settings_version_rejected_409', 'expectedVersion409');
    add(privacy, 'docs/quality/guide-runs/privacy-security-local-latest.json', 'authorization', 'limited_admin_settings_mutation_denied_403', 'roleAuthorization');
  }
  if (journeyId === 'GUIDE-09') {
    add(seeker, 'docs/quality/guide-runs/seeker-account-local-latest.json', 'authorization', 'cross_account_notification_hidden_as_404', 'horizontalAccess');
  }
  return evidence;
}
