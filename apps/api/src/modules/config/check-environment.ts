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
import {
  AuthEnvironmentValidationError,
  parseAuthEnvironment,
  toSafeAuthEnvironmentSummary
} from '../auth/environment.js';
import {
  parseUploadEnvironment,
  toSafeUploadEnvironmentSummary,
  UploadEnvironmentValidationError
} from '../uploads/environment.js';

try {
  const environment = parseRuntimeEnvironment(process.env);
  const database = parseDatabaseEnvironment(process.env);
  const auth = parseAuthEnvironment(process.env, environment.appEnvironment);
  const uploads = parseUploadEnvironment(process.env, environment.appEnvironment);
  console.log(`ENV_CHECK_OK ${JSON.stringify({
    ...toSafeEnvironmentSummary(environment),
    ...toSafeDatabaseSummary(database),
    ...toSafeAuthEnvironmentSummary(auth),
    ...toSafeUploadEnvironmentSummary(uploads)
  })}`);
} catch (error) {
  if (
    error instanceof EnvironmentValidationError
    || error instanceof DatabaseEnvironmentValidationError
    || error instanceof AuthEnvironmentValidationError
    || error instanceof UploadEnvironmentValidationError
  ) {
    console.error(error.message);
  } else {
    console.error('Environment validation failed');
  }
  process.exitCode = 1;
}
