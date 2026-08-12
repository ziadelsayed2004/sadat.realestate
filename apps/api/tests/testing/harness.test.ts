import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ALL_TEST_FILES,
  TEST_SUITES,
  selectTestFiles
} from '../../src/modules/testing/test-suites.js';
import {
  buildTestArguments,
  COVERAGE_THRESHOLDS,
  parseTestSelection
} from '../../src/modules/testing/run-test-suite.js';
import {
  LiveTestPrerequisiteError,
  resolveLiveMongoEnvironment
} from '../../src/modules/testing/live-mongodb.js';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function discoverTests(directory: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...discoverTests(absolute));
    else if (entry.name.endsWith('.test.ts')) results.push(path.relative(apiRoot, absolute).replaceAll('\\', '/'));
  }
  return results.sort();
}

test('classifies every API test exactly once across non-empty suites', () => {
  const categorized = Object.values(TEST_SUITES).flat();
  assert.ok(Object.values(TEST_SUITES).every((files) => files.length > 0));
  assert.equal(new Set(categorized).size, categorized.length);
  assert.deepEqual([...ALL_TEST_FILES].sort(), discoverTests(path.join(apiRoot, 'tests')));
});

test('selects named and complete test suites deterministically', () => {
  assert.deepEqual(selectTestFiles('unit'), TEST_SUITES.unit);
  assert.deepEqual(selectTestFiles('integration'), TEST_SUITES.integration);
  assert.deepEqual(selectTestFiles('api'), TEST_SUITES.api);
  assert.deepEqual(selectTestFiles('all'), ALL_TEST_FILES);
  assert.equal(parseTestSelection('all'), 'all');
  assert.throws(() => parseTestSelection('unknown'), /unit, integration, api, all/);
});

test('builds a serial Node test command with enforced coverage thresholds', () => {
  const argumentsList = buildTestArguments('all', true);
  assert.deepEqual(argumentsList.slice(0, 4), ['--import', 'tsx', '--test', '--test-concurrency=1']);
  assert.ok(argumentsList.includes('--experimental-test-coverage'));
  assert.ok(argumentsList.includes(`--test-coverage-branches=${COVERAGE_THRESHOLDS.branches}`));
  assert.ok(argumentsList.includes(`--test-coverage-functions=${COVERAGE_THRESHOLDS.functions}`));
  assert.ok(argumentsList.includes(`--test-coverage-lines=${COVERAGE_THRESHOLDS.lines}`));
  for (const file of ALL_TEST_FILES) assert.ok(argumentsList.includes(file));
});

test('guards optional live MongoDB checks with isolated test-only configuration', () => {
  assert.throws(
    () => resolveLiveMongoEnvironment({ APP_ENV: 'production', TEST_MONGODB_URI: 'mongodb://127.0.0.1/test' }),
    (error: unknown) => error instanceof LiveTestPrerequisiteError && /APP_ENV=test/.test(error.message)
  );
  assert.throws(
    () => resolveLiveMongoEnvironment({ APP_ENV: 'test' }),
    (error: unknown) => error instanceof LiveTestPrerequisiteError && /TEST_MONGODB_URI/.test(error.message)
  );
  assert.deepEqual(
    resolveLiveMongoEnvironment({ APP_ENV: 'test', TEST_MONGODB_URI: 'mongodb://127.0.0.1/sadat_isolated_test' }),
    { uri: 'mongodb://127.0.0.1/sadat_isolated_test' }
  );
});

