import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectTestFiles, type TestSelection } from './test-suites.js';

export const COVERAGE_THRESHOLDS = Object.freeze({
  branches: 70,
  functions: 80,
  lines: 80
});

const validSelections = new Set<TestSelection>(['unit', 'integration', 'api', 'all']);

export function parseTestSelection(value: string | undefined): TestSelection {
  if (!value || !validSelections.has(value as TestSelection)) {
    throw new Error('Test suite must be one of: unit, integration, api, all');
  }
  return value as TestSelection;
}

export function buildTestArguments(selection: TestSelection, coverage = false): string[] {
  const argumentsList = ['--import', 'tsx', '--test', '--test-concurrency=1'];
  if (coverage) {
    argumentsList.push(
      '--experimental-test-coverage',
      '--test-coverage-include=src/**/*.ts',
      `--test-coverage-branches=${COVERAGE_THRESHOLDS.branches}`,
      `--test-coverage-functions=${COVERAGE_THRESHOLDS.functions}`,
      `--test-coverage-lines=${COVERAGE_THRESHOLDS.lines}`
    );
  }
  argumentsList.push(...selectTestFiles(selection));
  return argumentsList;
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

function run(): void {
  const selection = parseTestSelection(process.argv[2]);
  const extraArguments = process.argv.slice(3);
  if (extraArguments.some((argument) => argument !== '--coverage')) {
    throw new Error('Only --coverage is supported after the test suite name');
  }
  const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const result = spawnSync(process.execPath, buildTestArguments(selection, extraArguments.includes('--coverage')), {
    cwd: apiRoot,
    env: { ...process.env, APP_ENV: 'test' },
    stdio: 'inherit'
  });
  process.exitCode = result.status ?? 1;
}

if (isEntrypoint()) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Test harness failed safely'}\n`);
    process.exitCode = 1;
  }
}

