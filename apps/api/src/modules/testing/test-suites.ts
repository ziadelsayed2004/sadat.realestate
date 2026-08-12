export const TEST_SUITES = Object.freeze({
  unit: Object.freeze([
    'tests/config/environment.test.ts',
    'tests/contracts/error-boundary.test.ts',
    'tests/database/connection.test.ts',
    'tests/database/environment.test.ts',
    'tests/database/index-policy.test.ts',
    'tests/database/seed.test.ts',
    'tests/testing/harness.test.ts'
  ]),
  integration: Object.freeze([
    'tests/docs/api-artifacts.test.ts',
    'tests/database/artifacts.test.ts',
    'tests/database/health.test.ts'
  ]),
  api: Object.freeze([
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
