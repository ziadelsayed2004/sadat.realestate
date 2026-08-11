import {
  EnvironmentValidationError,
  parseRuntimeEnvironment,
  toSafeEnvironmentSummary
} from './environment.js';
import {
  DatabaseEnvironmentValidationError,
  parseDatabaseEnvironment,
  toSafeDatabaseSummary
} from '../database/environment.js';

try {
  const environment = parseRuntimeEnvironment(process.env);
  const database = parseDatabaseEnvironment(process.env);
  console.log(`ENV_CHECK_OK ${JSON.stringify({ ...toSafeEnvironmentSummary(environment), ...toSafeDatabaseSummary(database) })}`);
} catch (error) {
  if (error instanceof EnvironmentValidationError || error instanceof DatabaseEnvironmentValidationError) {
    console.error(error.message);
  } else {
    console.error('Environment validation failed');
  }
  process.exitCode = 1;
}
