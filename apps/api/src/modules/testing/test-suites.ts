export const TEST_SUITES = Object.freeze({
  unit: Object.freeze([
    'tests/auth/contracts.test.ts',
    'tests/auth/crypto.test.ts',
    'tests/auth/environment.test.ts',
    'tests/auth/models.test.ts',
    'tests/auth/otp.test.ts',
    'tests/auth/repository.test.ts',
    'tests/auth/service.test.ts',
    'tests/seeker/contracts.test.ts',
    'tests/seeker/service.test.ts',
    'tests/config/environment.test.ts',
    'tests/contracts/error-boundary.test.ts',
    'tests/database/connection.test.ts',
    'tests/database/environment.test.ts',
    'tests/database/index-policy.test.ts',
    'tests/database/seed.test.ts',
    'tests/identity/models.test.ts',
    'tests/testing/harness.test.ts'
  ]),
  integration: Object.freeze([
    'tests/docs/api-artifacts.test.ts',
    'tests/database/artifacts.test.ts',
    'tests/database/health.test.ts'
  ]),
  api: Object.freeze([
    'tests/auth/router.test.ts',
    'tests/seeker/router.test.ts',
    'tests/server.test.ts',
    'tests/security/middleware.test.ts',
    'tests/observability/observability.test.ts'
  ])
});

export type TestSuiteName = keyof typeof TEST_SUITES;
export type TestSelection = TestSuiteName | 'all';

export const ALL_TEST_FILES = Object.freeze([
  ...TEST_SUITES.unit,
  ...TEST_SUITES.integration,
  ...TEST_SUITES.api
]);

export function selectTestFiles(selection: TestSelection): readonly string[] {
  return selection === 'all' ? ALL_TEST_FILES : TEST_SUITES[selection];
}
