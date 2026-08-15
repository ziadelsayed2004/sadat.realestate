import {
  releaseReadinessSchema,
  type ReleaseCheck,
  type ReleasePrerequisite,
  type ReleaseReadiness
} from '@sadat-realestate/contracts';

export const RELEASE_GATE_CHECKS = Object.freeze([
  { name: 'typecheck', command: 'npm run typecheck' },
  { name: 'lint', command: 'npm run lint' },
  { name: 'tests', command: 'npm test -- --runInBand' },
  { name: 'coverage', command: 'npm run test:coverage' },
  { name: 'build', command: 'npm run build' },
  { name: 'dependency-audit', command: 'npm audit --audit-level=high' },
  { name: 'api-inventory', command: 'npm run api:inventory' },
  { name: 'openapi', command: 'npm run openapi:validate' },
  { name: 'postman', command: 'npm run postman:validate' },
  { name: 'environment', command: 'npm run env:check' },
  { name: 'integration', command: 'npm run test:integration' },
  { name: 'api', command: 'npm run test:api' },
  { name: 'agent-pack', command: 'node agent_pack/scripts/audit_pack.mjs' }
] as const);

export const RELEASE_EXTERNAL_PREREQUISITES: readonly ReleasePrerequisite[] = Object.freeze([
  {
    name: 'live-mongodb-replica-set',
    status: 'blocked',
    ownerAction: 'Provide an isolated non-production MongoDB replica set and run the live integration, migration, index, and backup checks.'
  },
  {
    name: 'private-storage-and-scanner',
    status: 'blocked',
    ownerAction: 'Configure approved non-production private storage and malware-scanner adapters, then rerun readiness.'
  },
  {
    name: 'docker-engine',
    status: 'blocked',
    ownerAction: 'Run the checked-in container artifacts with an approved Docker engine and record the health/readiness result.'
  },
  {
    name: 'external-security-assurance',
    status: 'blocked',
    ownerAction: 'Run isolated provider/image scanning and penetration assurance before any production security claim.'
  }
]);

export interface ReadinessReportInput {
  readonly checks: readonly ReleaseCheck[];
  readonly prerequisites?: readonly ReleasePrerequisite[];
  readonly generatedAt?: string;
}

export function buildReadinessReport(input: ReadinessReportInput): ReleaseReadiness {
  const seen = new Set<string>();
  for (const check of input.checks) {
    if (seen.has(check.name)) throw new Error(`Duplicate release check ${check.name}`);
    seen.add(check.name);
  }
  const failed = input.checks.some(check => check.status === 'failed');
  const blocked = input.checks.some(check => check.status === 'blocked') || (input.prerequisites ?? []).length > 0;
  const outcome = failed ? 'blocked' : blocked ? 'conditional' : 'ready';
  return releaseReadinessSchema.parse({
    version: 'backend-readiness-v1',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    outcome,
    checks: [...input.checks],
    prerequisites: [...(input.prerequisites ?? [])],
    frontendStarted: false
  });
}

export function passedReleaseChecks(notes = 'Command passed with exit code 0.'): ReleaseCheck[] {
  return RELEASE_GATE_CHECKS.map(check => ({ ...check, status: 'passed' as const, notes }));
}

export function validateReadinessReport(report: unknown): string[] {
  const parsed = releaseReadinessSchema.safeParse(report);
  if (!parsed.success) return parsed.error.issues.map(issue => `${issue.path.join('.')} ${issue.message}`);
  const knownNames = new Set<string>(RELEASE_GATE_CHECKS.map(check => check.name));
  const unknown = parsed.data.checks.filter(check => !knownNames.has(check.name));
  return unknown.map(check => `Unknown release check ${check.name}`);
}
