import {
  securityAssuranceFindingSchema,
  securityAssuranceReportSchema,
  type SecurityAssuranceFinding,
  type SecurityAssuranceReport
} from '@sadat-real-estate/contracts';

export const SECURITY_ASSURANCE_FINDINGS: readonly SecurityAssuranceFinding[] = Object.freeze([
  {
    id: 'api1-bola', domain: 'owasp_api', category: 'api1_bola', status: 'implemented',
    title: 'Object ownership and assignment boundaries are enforced in route and service projections',
    evidence: ['apps/api/src/modules/security/authorization-matrix.ts', 'apps/api/tests/security/authorization-matrix.test.ts', 'apps/api/tests/security/request-projection.test.ts']
  },
  {
    id: 'api2-authentication', domain: 'owasp_api', category: 'api2_authentication', status: 'implemented',
    title: 'Bearer, refresh, OTP, and session replay boundaries fail closed',
    evidence: ['apps/api/src/modules/security/middleware.ts', 'apps/api/tests/security/middleware.test.ts', 'apps/api/tests/auth/router.test.ts']
  },
  {
    id: 'api3-property-authorization', domain: 'owasp_api', category: 'api3_property_authorization', status: 'implemented',
    title: 'Property, media, document, and public projections allowlist fields and scopes',
    evidence: ['apps/api/tests/security/public-projections.test.ts', 'apps/api/tests/security/upload-media-security.test.ts', 'apps/api/tests/security/request-projection.test.ts']
  },
  {
    id: 'api4-resource-consumption', domain: 'owasp_api', category: 'api4_resource_consumption', status: 'implemented',
    title: 'Body, pagination, upload, rate-limit, and query bounds are enforced',
    evidence: ['apps/api/src/modules/security/middleware.ts', 'apps/api/tests/security/middleware.test.ts', 'apps/api/tests/performance/search-performance.test.ts']
  },
  {
    id: 'api5-function-authorization', domain: 'owasp_api', category: 'api5_function_authorization', status: 'implemented',
    title: 'Administrative roles, verification, permissions, and route classifications are explicit',
    evidence: ['apps/api/src/modules/security/authorization-matrix.ts', 'apps/api/tests/security/authorization-matrix.test.ts', 'docs/api/negative-authorization-matrix.md']
  },
  {
    id: 'api6-business-flow', domain: 'owasp_api', category: 'api6_business_flow', status: 'partial',
    title: 'State transitions and replay guards are covered by deterministic service and API tests',
    evidence: ['apps/api/tests/accounts/service.test.ts', 'apps/api/tests/auth/router.test.ts', 'apps/api/tests/commissions/service.test.ts'],
    gap: 'Live replica-set transaction and multi-process concurrency evidence is unavailable in this environment',
    ownerAction: 'Run isolated non-production transaction and concurrency suites before production approval'
  },
  {
    id: 'api7-ssrf', domain: 'owasp_api', category: 'api7_ssrf', status: 'not_applicable',
    title: 'The current API does not fetch caller-controlled URLs or expose a URL proxy',
    evidence: ['apps/api/src/modules/security/middleware.ts', 'apps/api/src/modules/uploads/environment.ts'],
    ownerAction: 'Re-open SSRF review before adding callback, URL-import, map, or provider-fetch features'
  },
  {
    id: 'api8-misconfiguration', domain: 'owasp_api', category: 'api8_misconfiguration', status: 'implemented',
    title: 'Headers, CORS, proxy trust, parser errors, readiness, and environment validation are explicit',
    evidence: ['apps/api/src/modules/security/middleware.ts', 'apps/api/tests/security/middleware.test.ts', 'apps/api/src/modules/config/environment.ts']
  },
  {
    id: 'api9-inventory', domain: 'owasp_api', category: 'api9_inventory', status: 'implemented',
    title: 'Runtime route inventory, OpenAPI, and Postman drift checks are executable',
    evidence: ['apps/api/src/modules/docs/route-inventory.ts', 'apps/api/tests/docs/route-inventory.test.ts', 'docs/api/runtime-route-inventory.md']
  },
  {
    id: 'api10-unsafe-consumption', domain: 'owasp_api', category: 'api10_unsafe_consumption', status: 'partial',
    title: 'External adapters fail closed and sanitize provider-facing boundaries',
    evidence: ['apps/api/src/modules/uploads/environment.ts', 'apps/api/src/modules/database/health.ts', 'docs/api/security.md'],
    gap: 'External provider, storage, scanner, and database deployments are not available for live contract verification',
    ownerAction: 'Run isolated provider contract and readiness checks with approved non-production credentials'
  },
  {
    id: 'platform-secrets', domain: 'platform', category: 'platform_secrets', status: 'implemented',
    title: 'Secrets are environment-provided, redacted from logs, and rejected from checked-in artifacts',
    evidence: ['apps/api/src/modules/observability/logger.ts', 'apps/api/tests/observability/observability.test.ts', 'apps/api/src/modules/auth/environment.ts']
  },
  {
    id: 'platform-data-protection', domain: 'platform', category: 'platform_data_protection', status: 'implemented',
    title: 'Private data, credentials, audit snapshots, and public projections have explicit boundaries',
    evidence: ['apps/api/tests/security/public-projections.test.ts', 'apps/api/tests/security/upload-media-security.test.ts', 'docs/api/security.md']
  },
  {
    id: 'platform-supply-chain', domain: 'platform', category: 'platform_supply_chain', status: 'partial',
    title: 'Lockfile, dependency audit, static checks, restricted system services, and atomic release guidance are present',
    evidence: ['package-lock.json', 'deploy/systemd/elsadat-api.service', 'deploy/native/deploy-release.sh', 'docs/api/deployment.md'],
    gap: 'Target-host package provenance and operating-system security updates require live Ubuntu verification',
    ownerAction: 'Record target package versions, security updates, and release checks before approval'
  },
  {
    id: 'platform-availability', domain: 'platform', category: 'platform_availability', status: 'partial',
    title: 'Readiness, bounded requests, graceful shutdown, and fail-closed adapters protect single-instance behavior',
    evidence: ['apps/api/src/modules/database/health.ts', 'apps/api/src/modules/deployment/runtime.ts', 'apps/api/src/modules/security/middleware.ts'],
    gap: 'The default rate limiter and metrics registry are process-local and do not prove multi-replica coordination',
    ownerAction: 'Configure shared rate-limit, metrics, and alerting infrastructure before horizontal scaling'
  },
  {
    id: 'platform-external-assurance', domain: 'platform', category: 'platform_external_assurance', status: 'blocked',
    title: 'External penetration, live replica-set, provider, and production secret checks are not claimed',
    evidence: ['agent_pack/08_reality_sync/RISKS_AND_GAPS.md', 'docs/api/testing.md'],
    gap: 'No isolated live topology, approved provider account, external scanner, or penetration-test engagement is available',
    ownerAction: 'Provision isolated non-production dependencies and complete the external assurance plan before production approval'
  }
].map((finding) => securityAssuranceFindingSchema.parse(finding)));

export function summarizeSecurityAssurance(findings: readonly SecurityAssuranceFinding[] = SECURITY_ASSURANCE_FINDINGS): 'pass' | 'conditional' | 'blocked' {
  if (findings.some((finding) => finding.status === 'blocked')) return 'conditional';
  if (findings.some((finding) => finding.status === 'partial')) return 'conditional';
  return 'pass';
}

export function buildSecurityAssuranceReport(now: () => Date = () => new Date()): SecurityAssuranceReport {
  return securityAssuranceReportSchema.parse({
    version: 1,
    generatedAt: now().toISOString(),
    overall: summarizeSecurityAssurance(),
    findings: SECURITY_ASSURANCE_FINDINGS
  });
}

export function validateSecurityAssuranceReport(input: unknown): SecurityAssuranceReport {
  return securityAssuranceReportSchema.parse(input);
}
