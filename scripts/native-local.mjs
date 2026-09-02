import { closeSync, existsSync, openSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { repositoryRoot, resolvedEnvironment } from './environment-file.mjs';
import {
  ensureWritable,
  loadLocalConfig,
  localRoot,
  logFile,
  npmVersion,
  ownerMarker,
  pidAlive,
  portAvailable,
  probeHttp,
  probeMongo,
  readStatus,
  removeStatus,
  rotateLog,
  safeMongoSummary,
  sleep
} from './local-runtime.mjs';

const command = process.argv[2];
const supervisorFile = path.join(repositoryRoot, 'scripts/native-local-supervisor.mjs');

function npmCommand() { return process.platform === 'win32' ? 'npm.cmd' : 'npm'; }

async function run(program, args, environment = process.env) {
  return new Promise((resolve, reject) => {
    const isWindowsNpmShim = process.platform === 'win32' && program.toLowerCase().endsWith('npm.cmd');
    const executable = isWindowsNpmShim ? process.execPath : program;
    const executableArgs = isWindowsNpmShim
      ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), ...args]
      : args;
    const child = spawn(executable, executableArgs, {
      cwd: repositoryRoot,
      env: environment,
      stdio: 'inherit',
      windowsHide: true,
      shell: false
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${path.basename(program)}_EXIT_${code}`)));
  });
}

function nodeVersionSupported() { return Number(process.versions.node.split('.')[0]) === 24; }

function requiredPorts(config) {
  return [
    ['LOCAL_HTTP_PORT', config.LOCAL_HTTP_PORT],
    ['LOCAL_MAIL_UI_PORT', config.LOCAL_MAIL_UI_PORT],
    ['LOCAL_SMTP_PORT', config.LOCAL_SMTP_PORT],
    ['API_PORT', config.API_PORT],
    ['WEB_PORT', config.WEB_PORT]
  ];
}

async function assertPortsAvailable(config) {
  for (const [key, value] of requiredPorts(config)) {
    if (!await portAvailable(Number(value))) throw new Error(`Port ${value} for ${key} is already in use`);
  }
}

function tailLog() {
  if (!existsSync(logFile)) return '(no local log yet)';
  return readFileSync(logFile, 'utf8').split(/\r?\n/u).slice(-160).join('\n');
}

async function doctor({ checkPorts = true } = {}) {
  const config = await loadLocalConfig();
  if (!nodeVersionSupported()) throw new Error(`Node ${process.versions.node} is unsupported; install Node.js 24.x`);
  const npm = await npmVersion();
  if (Number(npm.split('.')[0]) !== 11) throw new Error(`npm ${npm} is unsupported; install npm 11.x`);
  if (!existsSync(path.join(repositoryRoot, 'node_modules'))) throw new Error('Dependencies are missing; run npm ci');
  await ensureWritable(localRoot);
  const mongoTarget = safeMongoSummary(config.MONGODB_URI);
  if (!await probeMongo(config.MONGODB_URI)) throw new Error(`MongoDB is unreachable at ${mongoTarget.host}:${mongoTarget.port}`);
  let portState = 'available';
  if (checkPorts) {
    const current = await readStatus();
    const repositoryRuntime = current?.owner === ownerMarker && pidAlive(current.pid)
      ? await checkRuntime(current)
      : undefined;
    if (repositoryRuntime?.ready) portState = 'owned-by-running-project';
    else await assertPortsAvailable(config);
  }
  process.stdout.write(`LOCAL_DOCTOR_OK node=${process.versions.node} npm=${npm} mongo=${mongoTarget.host}:${mongoTarget.port} ports=${portState} dependencies=ready\n`);
  return config;
}

async function checkRuntime(status) {
  if (!status || status.owner !== ownerMarker || !pidAlive(status.pid)) {
    return { state: 'stopped', ready: false, checks: { supervisor: 'not_running' } };
  }
  const [health, readiness, web, proxy] = await Promise.all([
    probeHttp(`${status.apiUrl}/health`),
    probeHttp(`${status.apiUrl}/ready`),
    probeHttp(`${status.webUrl}/health`),
    probeHttp(`${status.proxyUrl}/health`)
  ]);
  const mongodb = readiness.body?.checks?.mongodb === 'ready' ? 'ready' : 'not_ready';
  const ready = health.ok && readiness.ok && web.ok && proxy.ok && mongodb === 'ready';
  return {
    state: ready ? 'ready' : status.state === 'failed' ? 'failed' : 'degraded',
    ready,
    checks: {
      supervisor: 'running',
      apiHealth: health.ok ? 'ready' : 'not_ready',
      apiReadiness: readiness.ok ? 'ready' : 'not_ready',
      mongodb,
      web: web.ok ? 'ready' : 'not_ready',
      proxy: proxy.ok ? 'ready' : 'not_ready'
    },
    statusCode: { apiHealth: health.status, apiReadiness: readiness.status, web: web.status, proxy: proxy.status }
  };
}

async function up() {
  const previous = await readStatus();
  if (previous?.owner === ownerMarker && pidAlive(previous.pid)) {
    const live = await checkRuntime(previous);
    if (live.ready) {
      process.stdout.write(`LOCAL_ALREADY_RUNNING ${previous.webUrl}\n`);
      return;
    }
    throw new Error('A repository-owned supervisor is running but degraded; run npm run local:down before restarting');
  }
  if (previous) await removeStatus();
  const config = await doctor();
  await mkdir(localRoot, { recursive: true });
  await rotateLog();
  process.stdout.write('LOCAL_BUILD_START\n');
  await run(npmCommand(), ['run', 'build']);
  const output = openSync(logFile, 'a');
  const child = spawn(process.execPath, [supervisorFile], {
    cwd: repositoryRoot,
    env: resolvedEnvironment(config),
    detached: true,
    windowsHide: true,
    stdio: ['ignore', output, output]
  });
  child.unref();
  closeSync(output);
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const current = await readStatus();
    if (current?.state === 'ready') {
      process.stdout.write(`LOCAL_UP_OK\nSITE ${current.webUrl}\nMAIL ${current.mailUrl}\nAPI ${current.apiUrl}\n`);
      return;
    }
    if (current?.state === 'failed' || (!pidAlive(child.pid) && current?.state !== 'ready')) {
      throw new Error(`Local runtime failed. Run npm run local:logs\n${tailLog()}`);
    }
    await sleep(1_000);
  }
  throw new Error(`Local startup timed out. Run npm run local:logs\n${tailLog()}`);
}

async function down() {
  const current = await readStatus();
  if (!current || current.owner !== ownerMarker || !pidAlive(current.pid)) {
    await removeStatus();
    process.stdout.write('LOCAL_ALREADY_STOPPED\n');
    return;
  }
  if (process.platform === 'win32') await run('taskkill', ['/PID', String(current.pid), '/T', '/F']);
  else {
    try { process.kill(-current.pid, 'SIGTERM'); } catch { process.kill(current.pid, 'SIGTERM'); }
  }
  const deadline = Date.now() + 20_000;
  while (pidAlive(current.pid) && Date.now() < deadline) await sleep(250);
  await removeStatus();
  process.stdout.write('LOCAL_DOWN_OK\n');
}

async function seed() {
  const config = await doctor({ checkPorts: false });
  const current = await readStatus();
  const live = await checkRuntime(current);
  if (!current || !live.ready) throw new Error('The local runtime is not ready; run npm run local:up first');
  const environment = resolvedEnvironment(config, {
    APP_ENV: 'local',
    API_HOST: '127.0.0.1',
    API_PORT: config.API_PORT,
    MONGODB_URI: config.MONGODB_URI
  });
  await run(process.execPath, ['apps/api/dist/modules/database/run-seed.js'], environment);
  process.stdout.write('LOCAL_SEED_OK synthetic=true idempotent=true\n');
}

async function status() {
  const current = await readStatus();
  if (!current) {
    process.stdout.write('LOCAL_STATUS stopped ready=false\n');
    process.exitCode = 1;
    return;
  }
  const live = await checkRuntime(current);
  process.stdout.write(`LOCAL_STATUS ${live.state} ready=${live.ready} pid=${current.pid} site=${current.webUrl || '-'} checks=${JSON.stringify(live.checks)}\n`);
  if (!live.ready) process.exitCode = 1;
}

try {
  if (command === 'doctor' || command === 'check') await doctor();
  else if (command === 'prepare') await run(npmCommand(), ['run', 'local:prepare']);
  else if (command === 'up') await up();
  else if (command === 'down') await down();
  else if (command === 'seed') await seed();
  else if (command === 'logs') process.stdout.write(`${tailLog()}\n`);
  else if (command === 'status') await status();
  else throw new Error('Usage: node scripts/native-local.mjs doctor|prepare|up|down|seed|logs|status');
} catch (error) {
  process.stderr.write(`LOCAL_COMMAND_FAILED ${error instanceof Error ? error.message : 'UNKNOWN'}\n`);
  process.exitCode = 1;
}
