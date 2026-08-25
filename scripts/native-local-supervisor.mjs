import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { repositoryRoot, resolvedEnvironment } from './environment-file.mjs';
import {
  loadLocalConfig,
  localRoot,
  ownerMarker,
  probeHttp,
  probeMongo,
  sleep,
  writeStatus,
} from './local-runtime.mjs';

const statusFile = path.join(localRoot, 'status.json');
const children = new Map();
let stopping = false;
let monitorTimer;

async function status(state, details = {}) {
  await writeStatus({
    owner: ownerMarker,
    state,
    pid: process.pid,
    updatedAt: new Date().toISOString(),
    ...details
  });
}

function start(name, command, args, environment) {
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: environment,
    stdio: 'inherit',
    windowsHide: true
  });
  children.set(name, child);
  child.once('exit', (code, signal) => {
    children.delete(name);
    if (!stopping) void fail(`${name.toUpperCase()}_EXITED_${code ?? signal ?? 'UNKNOWN'}`);
  });
  child.once('error', error => {
    children.delete(name);
    if (!stopping) void fail(`${name.toUpperCase()}_SPAWN_${error.code || 'FAILED'}`);
  });
  return child;
}

async function waitFor(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let last = 'UNREACHABLE';
  while (Date.now() < deadline) {
    const response = await probeHttp(url, 3_000);
    if (response.ok) return response;
    last = response.status ? `HTTP_${response.status}` : response.error || 'UNREACHABLE';
    await sleep(500);
  }
  throw new Error(`READINESS_TIMEOUT_${last}`);
}

function runtimeUrls(config) {
  const apiPort = config.API_PORT || '3000';
  const webPort = config.WEB_PORT || '4173';
  const proxyPort = config.LOCAL_HTTP_PORT || '8080';
  return {
    apiUrl: `http://127.0.0.1:${apiPort}`,
    webUrl: `http://127.0.0.1:${webPort}`,
    proxyUrl: `http://127.0.0.1:${proxyPort}`,
    publicUrl: `http://localhost:${proxyPort}`,
    mailUrl: `http://localhost:${config.LOCAL_MAIL_UI_PORT || '8025'}`
  };
}

async function runCommand(command, args, environment) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: repositoryRoot, env: environment, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command}_EXIT_${code}`)));
  });
}

async function runSeed(environment) {
  await runCommand('SEED', ['apps/api/dist/modules/database/run-seed.js'], environment);
}

async function runAdminBootstrap(environment, configured) {
  const bootstrapEnvironment = resolvedEnvironment(environment, {
    ADMIN_BOOTSTRAP_EMAIL: configured.LOCAL_DEMO_ADMIN_EMAIL || 'admin.demo@example.invalid',
    ADMIN_BOOTSTRAP_PASSWORD: configured.LOCAL_DEMO_ADMIN_PASSWORD || 'LocalPreview-Admin-Only-2026!',
    ADMIN_BOOTSTRAP_CONFIRMATION: 'CREATE_FIRST_SUPER_ADMIN',
    ADMIN_BOOTSTRAP_LOCALE: 'ar'
  });
  await runCommand('ADMIN_BOOTSTRAP', ['apps/api/dist/modules/admin/run-bootstrap.js'], bootstrapEnvironment);
}

async function checkRuntime(urls, mongodbUri) {
  const [apiHealth, apiReady, web, proxy, mongo] = await Promise.all([
    probeHttp(`${urls.apiUrl}/health`),
    probeHttp(`${urls.apiUrl}/ready`),
    probeHttp(`${urls.webUrl}/health`),
    probeHttp(`${urls.proxyUrl}/health`),
    probeMongo(mongodbUri, 2_500)
  ]);
  const ready = apiHealth.ok && apiReady.ok && web.ok && proxy.ok && mongo && apiReady.body?.checks?.mongodb === 'ready';
  return {
    ready,
    degraded: apiHealth.ok && web.ok && proxy.ok && (!apiReady.ok || !mongo),
    checks: {
      apiHealth: apiHealth.ok ? 'ready' : 'not_ready',
      apiReadiness: apiReady.ok ? 'ready' : 'not_ready',
      mongodb: mongo && apiReady.body?.checks?.mongodb === 'ready' ? 'ready' : 'not_ready',
      web: web.ok ? 'ready' : 'not_ready',
      proxy: proxy.ok ? 'ready' : 'not_ready'
    }
  };
}

async function monitor(urls, mongodbUri) {
  if (stopping) return;
  const live = await checkRuntime(urls, mongodbUri);
  if (live.checks.apiHealth === 'not_ready' || live.checks.web === 'not_ready' || live.checks.proxy === 'not_ready') {
    await fail('RUNTIME_LIVENESS_LOST');
    return;
  }
  // Never persist the configured MongoDB URI: it may contain credentials or
  // query parameters that are secret-bearing. Runtime status only describes
  // health and repository-owned process URLs.
  await status(live.ready ? 'ready' : 'degraded', { ...urls, checks: live.checks });
}

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  if (monitorTimer) globalThis.clearInterval(monitorTimer);
  await status('stopping').catch(() => undefined);
  for (const child of children.values()) child.kill('SIGTERM');
  await sleep(800);
  for (const child of children.values()) child.kill('SIGKILL');
  children.clear();
  await rm(statusFile, { force: true }).catch(() => undefined);
  process.exit(exitCode);
}

async function fail(code) {
  if (stopping) return;
  await status('failed', { code }).catch(() => undefined);
  process.stderr.write(`LOCAL_SUPERVISOR_FAILED ${code}\n`);
  await shutdown(1);
}

try {
  await mkdir(localRoot, { recursive: true });
  const configured = await loadLocalConfig();
  if (configured.NATIVE_LOCAL_RUNTIME !== 'true') throw new Error('NATIVE_LOCAL_RUNTIME_INVALID');
  if (!configured.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');
  const urls = runtimeUrls(configured);
  await status('starting', { stage: 'mongodb-probe', ...urls });
  if (!await probeMongo(configured.MONGODB_URI)) throw new Error('MONGODB_UNREACHABLE');
  const runtime = resolvedEnvironment(configured, {
    APP_ENV: 'local',
    API_HOST: '127.0.0.1',
    API_PORT: configured.API_PORT || '3000',
    WEB_HOST: '127.0.0.1',
    WEB_PORT: configured.WEB_PORT || '4173',
    WEB_API_ORIGIN: urls.apiUrl,
    WEB_PUBLIC_ORIGIN: urls.publicUrl,
    MONGODB_URI: configured.MONGODB_URI,
    OTP_PROVIDER: configured.OTP_PROVIDER || 'smtp',
    SMTP_HOST: configured.SMTP_HOST || '127.0.0.1',
    SMTP_PORT: configured.SMTP_PORT || '1025',
    SMTP_TLS: configured.SMTP_TLS || 'none',
    SMTP_FROM: configured.SMTP_FROM || 'Elsadat Local <no-reply@elsadat.local>',
    SMTP_PRODUCT_NAME: configured.SMTP_PRODUCT_NAME || 'Elsadat Real Estate Local',
    PRIVATE_STORAGE_LOCAL_ROOT: configured.PRIVATE_STORAGE_LOCAL_ROOT || path.join(localRoot, 'private-uploads')
  });
  await mkdir(runtime.PRIVATE_STORAGE_LOCAL_ROOT, { recursive: true });

  await status('starting', { stage: 'mail', ...urls });
  start('mail', process.execPath, ['scripts/native-local-mail.mjs'], runtime);
  await waitFor(`${urls.mailUrl}/health`, 30_000);

  await status('starting', { stage: 'api', ...urls });
  start('api', process.execPath, ['apps/api/dist/server.js'], runtime);
  await waitFor(`${urls.apiUrl}/ready`);

  if (configured.LOCAL_AUTO_SEED !== 'false') {
    await status('starting', { stage: 'seed', ...urls });
    await runSeed(runtime);
  }

  if (configured.LOCAL_AUTO_BOOTSTRAP_ADMIN !== 'false') {
    await status('starting', { stage: 'admin-bootstrap', ...urls });
    await runAdminBootstrap(runtime, configured);
  }

  await status('starting', { stage: 'web', ...urls });
  start('web', process.execPath, ['apps/web/server.mjs', '--mode', 'production'], runtime);
  await waitFor(`${urls.webUrl}/health`);

  await status('starting', { stage: 'proxy', ...urls });
  start('proxy', process.execPath, ['scripts/native-local-proxy.mjs'], runtime);
  await waitFor(`${urls.proxyUrl}/health`);

  const initial = await checkRuntime(urls, configured.MONGODB_URI);
  if (!initial.ready) throw new Error('LOCAL_RUNTIME_NOT_READY');
  await status('ready', { ...urls, checks: initial.checks });
  process.stdout.write('LOCAL_SUPERVISOR_READY\n');
  monitorTimer = globalThis.setInterval(() => { void monitor(urls, configured.MONGODB_URI); }, 2_000);
} catch (error) {
  await fail(error instanceof Error ? error.message.replace(/[^A-Za-z0-9_]+/gu, '_') : 'UNKNOWN');
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
