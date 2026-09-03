import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configuredFile = process.env.PRODUCTION_ENV_FILE?.trim();
const file = configuredFile
  ? path.resolve(repositoryRoot, configuredFile)
  : path.join(repositoryRoot, '.env.production');

function isBase64UrlSecret(value) {
  if (!/^[A-Za-z0-9_-]{43,128}$/u.test(value)) return false;
  const decoded = Buffer.from(value, 'base64url');
  return decoded.byteLength >= 32 && decoded.toString('base64url') === value;
}

function isUrlSafeDatabasePassword(value) {
  return /^[A-Za-z0-9_-]{24,128}$/u.test(value);
}

function isMongoReplicaKey(value) {
  return value.length >= 128
    && value.length <= 1024
    && /^[A-Za-z0-9+/=]+$/u.test(value);
}

function parseEnvironment(source) {
  const result = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error('MALFORMED_ENVIRONMENT_LINE');
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function fail(code) {
  process.stderr.write(`PRODUCTION_PREFLIGHT_FAILED ${code}\n`);
  process.exitCode = 1;
}

function validateMongoUri(environment) {
  let uri;
  try {
    uri = new URL(environment.MONGODB_URI);
  } catch {
    return 'MONGODB_URI_INVALID';
  }
  if (uri.protocol !== 'mongodb:' || uri.hostname !== '127.0.0.1' || uri.port !== '27017'
    || uri.pathname !== '/sadat') return 'MONGODB_URI_TARGET_MISMATCH';
  if (decodeURIComponent(uri.username) !== environment.MONGO_APP_USERNAME
    || decodeURIComponent(uri.password) !== environment.MONGO_APP_PASSWORD) {
    return 'MONGODB_URI_CREDENTIAL_MISMATCH';
  }
  if (uri.searchParams.get('authSource') !== 'sadat') return 'MONGODB_URI_AUTH_SOURCE_MISSING';
  if (uri.searchParams.get('replicaSet') !== 'rs0') return 'MONGODB_URI_REPLICA_SET_MISSING';
  if (uri.searchParams.get('directConnection') !== 'true') return 'MONGODB_URI_DIRECT_CONNECTION_MISSING';
  return undefined;
}

try {
  const environment = parseEnvironment(await readFile(file, 'utf8'));
  const required = [
    'NATIVE_PRODUCTION_RUNTIME', 'APP_ENV', 'PUBLIC_DOMAIN', 'ACME_EMAIL',
    'API_HOST', 'API_PORT', 'WEB_HOST', 'WEB_PORT', 'WEB_PUBLIC_ORIGIN', 'WEB_API_ORIGIN',
    'AUTH_ACCESS_TOKEN_SECRET',
    'PRIVATE_DOWNLOAD_SIGNING_SECRET', 'MONGO_ROOT_USERNAME', 'MONGO_ROOT_PASSWORD',
    'MONGO_APP_USERNAME', 'MONGO_APP_PASSWORD', 'MONGO_REPLICA_KEY', 'MONGODB_URI',
    'OTP_PROVIDER', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_TLS', 'SMTP_USER',
    'SMTP_PASSWORD', 'SMTP_FROM', 'PRIVATE_STORAGE_MODE', 'PRIVATE_STORAGE_LOCAL_ROOT',
    'MALWARE_SCANNER_MODE', 'CLAMAV_HOST', 'CLAMAV_PORT', 'BACKUP_ROOT'
  ];
  const missing = required.filter((key) => !environment[key]);
  if (missing.length) fail(`MISSING_${missing.join('_')}`);
  else if (required.some((key) => /REPLACE_|CHANGE_ME|EXAMPLE_PASSWORD/iu.test(environment[key]))) {
    fail('PLACEHOLDER_VALUE_PRESENT');
  } else if (!isBase64UrlSecret(environment.AUTH_ACCESS_TOKEN_SECRET)
    || !isBase64UrlSecret(environment.PRIVATE_DOWNLOAD_SIGNING_SECRET)) {
    fail('INVALID_SIGNING_SECRET');
  } else if (!isUrlSafeDatabasePassword(environment.MONGO_ROOT_PASSWORD)
    || !isUrlSafeDatabasePassword(environment.MONGO_APP_PASSWORD)
    || environment.MONGO_ROOT_PASSWORD === environment.MONGO_APP_PASSWORD) {
    fail('INVALID_OR_REUSED_DATABASE_PASSWORD');
  } else if (!isMongoReplicaKey(environment.MONGO_REPLICA_KEY)) {
    fail('INVALID_MONGO_REPLICA_KEY');
  } else if (environment.PUBLIC_DOMAIN !== 'elsadatrealestate.com') {
    fail('UNEXPECTED_PUBLIC_DOMAIN');
  } else if (environment.NATIVE_PRODUCTION_RUNTIME !== 'true' || environment.APP_ENV !== 'production') {
    fail('NATIVE_PRODUCTION_RUNTIME_REQUIRED');
  } else if (environment.API_HOST !== '127.0.0.1' || environment.WEB_HOST !== '127.0.0.1'
    || environment.API_PORT !== '3000' || environment.WEB_PORT !== '4173') {
    fail('APPLICATION_MUST_BIND_TO_LOOPBACK');
  } else if (environment.WEB_PUBLIC_ORIGIN !== 'https://elsadatrealestate.com'
    || environment.WEB_API_ORIGIN !== 'http://127.0.0.1:3000') {
    fail('WEB_ORIGIN_MISMATCH');
  } else if (environment.ACME_EMAIL !== 'info@elsadatrealestate.com') {
    fail('UNEXPECTED_ACME_EMAIL');
  } else if (environment.OTP_PROVIDER !== 'smtp'
    || environment.SMTP_HOST !== 'smtp.hostinger.com'
    || environment.SMTP_USER !== 'info@elsadatrealestate.com'
    || !environment.SMTP_FROM.includes('info@elsadatrealestate.com')) {
    fail('HOSTINGER_SMTP_IDENTITY_MISMATCH');
  } else if (!((environment.SMTP_PORT === '465' && environment.SMTP_TLS === 'implicit')
    || (environment.SMTP_PORT === '587' && environment.SMTP_TLS === 'starttls'))) {
    fail('SMTP_TLS_PORT_MISMATCH');
  } else if (environment.AUTH_ACCESS_TOKEN_SECRET === environment.PRIVATE_DOWNLOAD_SIGNING_SECRET) {
    fail('SIGNING_SECRETS_MUST_DIFFER');
  } else if (validateMongoUri(environment)) {
    fail(validateMongoUri(environment));
  } else if (environment.PRIVATE_STORAGE_MODE !== 'local-filesystem'
    || environment.PRIVATE_STORAGE_LOCAL_ROOT !== '/var/lib/elsadatrealestate/private'
    || environment.MALWARE_SCANNER_MODE !== 'clamav'
    || environment.CLAMAV_HOST !== '127.0.0.1'
    || environment.CLAMAV_PORT !== '3310') {
    fail('NATIVE_PRIVATE_STORAGE_OR_SCANNER_MISMATCH');
  } else if (environment.BACKUP_ROOT !== '/var/backups/elsadatrealestate') {
    fail('BACKUP_ROOT_MISMATCH');
  } else {
    process.stdout.write('PRODUCTION_PREFLIGHT_OK runtime=native_ubuntu secrets=present_and_redacted domain=elsadatrealestate.com smtp=hostinger_tls mongo=loopback_authenticated_rs0 uploads=private_clamav\n');
  }
} catch {
  fail('ENVIRONMENT_FILE_UNREADABLE_OR_INVALID');
}
