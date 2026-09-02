import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { promisify } from 'node:util';
import mongoose from 'mongoose';
import { readEnvironmentFile, repositoryRoot } from './environment-file.mjs';

const execFileAsync = promisify(execFile);

export const localRoot = path.join(repositoryRoot, '.local');
export const statusFile = path.join(localRoot, 'status.json');
export const logFile = path.join(localRoot, 'native-local.log');
export const envFile = path.join(repositoryRoot, '.env.local');
export const ownerMarker = 'sadat-native-local-v2';
const environmentOverrideKeys = [
  'NATIVE_LOCAL_RUNTIME', 'APP_ENV', 'MONGODB_URI', 'LOCAL_HTTP_PORT',
  'LOCAL_MAIL_UI_PORT', 'LOCAL_SMTP_PORT', 'LOCAL_AUTO_SEED',
  'LOCAL_AUTO_BOOTSTRAP_ADMIN', 'LOCAL_DEMO_ADMIN_EMAIL',
  'LOCAL_DEMO_ADMIN_PASSWORD', 'API_HOST', 'API_PORT', 'WEB_HOST',
  'WEB_PORT', 'WEB_PUBLIC_ORIGIN', 'WEB_API_ORIGIN', 'LOCAL_PROXY_HOST', 'AUTH_ACCESS_TOKEN_SECRET',
  'OTP_PROVIDER', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_TLS', 'SMTP_FROM',
  'SMTP_PRODUCT_NAME', 'PRIVATE_STORAGE_MODE', 'PRIVATE_STORAGE_LOCAL_ROOT',
  'PRIVATE_DOWNLOAD_SIGNING_SECRET', 'MALWARE_SCANNER_MODE'
];

export const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

export function pidAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function parsePort(value, key) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new Error(`Invalid ${key}`);
  return port;
}

export function parseMongoTarget(uri) {
  if (typeof uri !== 'string' || !/^mongodb(?:\+srv)?:\/\//u.test(uri) || /[\u0000-\u0020]/u.test(uri)) {
    throw new Error('MONGODB_URI must be a MongoDB URI without whitespace');
  }
  const parsed = new URL(uri);
  const host = parsed.hostname;
  if (!host) throw new Error('MONGODB_URI must include a host');
  const port = parsed.port ? parsePort(parsed.port, 'MONGODB_URI port') : 27017;
  return { host, port, srv: parsed.protocol === 'mongodb+srv:' };
}

export async function loadLocalConfig() {
  let fileConfig;
  try {
    fileConfig = await readEnvironmentFile(envFile);
  } catch {
    throw new Error('Run npm run local:prepare first');
  }
  // Explicit process-environment overrides make CI and a one-off local
  // doctor safe without rewriting a user's existing .env.local. Values are
  // never printed; the URI is only used for connection probing and child env.
  const overrides = Object.fromEntries(
    environmentOverrideKeys
      .filter(key => typeof process.env[key] === 'string')
      .map(key => [key, process.env[key]])
  );
  const config = { ...fileConfig, ...overrides };
  if (config.NATIVE_LOCAL_RUNTIME !== 'true') throw new Error('NATIVE_LOCAL_RUNTIME must be true in .env.local');
  if (config.APP_ENV !== 'local') throw new Error('APP_ENV must be local for the native Local runtime');
  if (!config.MONGODB_URI) throw new Error('MONGODB_URI is required in .env.local; Docker and embedded MongoDB are not supported');
  parseMongoTarget(config.MONGODB_URI);
  parsePort(config.API_PORT, 'API_PORT');
  parsePort(config.WEB_PORT, 'WEB_PORT');
  parsePort(config.LOCAL_HTTP_PORT, 'LOCAL_HTTP_PORT');
  parsePort(config.LOCAL_MAIL_UI_PORT, 'LOCAL_MAIL_UI_PORT');
  parsePort(config.LOCAL_SMTP_PORT, 'LOCAL_SMTP_PORT');
  return Object.freeze(config);
}

export async function readStatus() {
  try {
    return JSON.parse(await readFile(statusFile, 'utf8'));
  } catch {
    return undefined;
  }
}

export async function writeStatus(value) {
  await mkdir(localRoot, { recursive: true });
  const temporary = `${statusFile}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
  await rename(temporary, statusFile);
}

export async function removeStatus() {
  await rm(statusFile, { force: true });
}

export async function portAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

export async function probeHttp(url, timeoutMs = 3_000) {
  try {
    const response = await fetch(url, { signal: globalThis.AbortSignal.timeout(timeoutMs), redirect: 'manual' });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: undefined, error: error instanceof Error ? error.name : 'UNREACHABLE' };
  }
}

export async function probeMongo(uri, timeoutMs = 4_000) {
  let connection;
  try {
    connection = mongoose.createConnection();
    await connection.openUri(uri, { serverSelectionTimeoutMS: timeoutMs, connectTimeoutMS: timeoutMs });
    if (!connection.db) return false;
    await connection.db.command({ ping: 1 }, { timeoutMS: Math.min(timeoutMs, 1_000) });
    return true;
  } catch {
    return false;
  } finally {
    await connection?.close().catch(() => undefined);
  }
}

export async function ensureWritable(directory = localRoot) {
  await mkdir(directory, { recursive: true });
  const probe = path.join(directory, `.write-probe-${process.pid}-${Date.now()}`);
  await writeFile(probe, 'ok', { encoding: 'utf8', flag: 'wx' });
  await rm(probe, { force: true });
}

export async function rotateLog(maxBytes = 5 * 1024 * 1024) {
  try {
    const details = await stat(logFile);
    if (details.size < maxBytes) return;
    await rm(`${logFile}.2`, { force: true });
    await rename(`${logFile}.1`, `${logFile}.2`).catch(() => undefined);
    await rename(logFile, `${logFile}.1`);
  } catch {
    // The log does not exist yet; the supervisor will create it.
  }
}

export async function npmVersion() {
  const command = process.platform === 'win32' ? process.execPath : 'npm';
  const args = process.platform === 'win32'
    ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), '--version']
    : ['--version'];
  const { stdout } = await execFileAsync(command, args, {
    cwd: repositoryRoot,
    windowsHide: true
  });
  return stdout.trim();
}

export function safeMongoSummary(uri) {
  const target = parseMongoTarget(uri);
  return { host: target.host, port: target.port, srv: target.srv };
}
