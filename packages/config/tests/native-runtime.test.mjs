import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('PORT_ALLOCATION_FAILED');
  await new Promise(resolve => server.close(resolve));
  return address.port;
}

async function waitFor(url, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: globalThis.AbortSignal.timeout(500) });
      if (response.ok) return response;
    } catch {
      // The child process may still be binding its loopback port.
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`READINESS_TIMEOUT ${url}`);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 2_000))
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function startScript(script, environment) {
  return spawn(process.execPath, [path.join(root, script)], {
    cwd: root,
    env: { ...process.env, ...environment },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
}

test('local and Production commands use only the checked-in native runtime', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const name of ['local:check', 'local:up', 'local:down', 'local:seed', 'production:config']) {
    assert.match(manifest.scripts[name], /native-/u);
  }
  for (const file of [
    'scripts/native-local.mjs',
    'deploy/nginx/elsadatrealestate.conf',
    'deploy/systemd/elsadat-api.service',
    'deploy/systemd/elsadat-web.service',
    'deploy/systemd/elsadat-healthcheck.service',
    'deploy/native/healthcheck.sh',
    'deploy/native/deploy-release.sh'
  ]) assert.equal(fs.existsSync(path.join(root, file)), true, file);

  const healthUnit = fs.readFileSync(path.join(root, 'deploy/systemd/elsadat-healthcheck.service'), 'utf8');
  const healthScript = fs.readFileSync(path.join(root, 'deploy/native/healthcheck.sh'), 'utf8');
  const localSupervisor = fs.readFileSync(path.join(root, 'scripts/native-local-supervisor.mjs'), 'utf8');
  const localEnvironment = fs.readFileSync(path.join(root, '.env.local.example'), 'utf8');
  assert.match(healthUnit, /deploy\/native\/healthcheck\.sh/u);
  assert.match(healthScript, /127\.0\.0\.1:3000\/ready/u);
  assert.match(healthScript, /127\.0\.0\.1:4173\/health/u);
  assert.match(localSupervisor, /apps\/api\/dist\/modules\/admin\/run-bootstrap\.js/u);
  assert.match(localEnvironment, /LOCAL_AUTO_BOOTSTRAP_ADMIN=false/u);
  assert.match(localEnvironment, /admin\.demo@example\.invalid/u);
  assert.match(localSupervisor, /idempotent bootstrap guard/u);
  assert.ok(
    localSupervisor.indexOf("stage: 'admin-bootstrap'") < localSupervisor.indexOf("stage: 'seed'"),
    'Admin bootstrap must run before synthetic admin fixtures are seeded'
  );
});

test('native local mail captures an OTP-shaped email without external delivery', { timeout: 10_000 }, async () => {
  const smtpPort = await unusedPort();
  const uiPort = await unusedPort();
  const child = startScript('scripts/native-local-mail.mjs', {
    LOCAL_SMTP_PORT: String(smtpPort),
    LOCAL_MAIL_UI_PORT: String(uiPort)
  });
  try {
    await waitFor(`http://127.0.0.1:${uiPort}/health`);
    await new Promise((resolve, reject) => {
      const socket = net.createConnection(smtpPort, '127.0.0.1');
      socket.setEncoding('utf8');
      let output = '';
      let sent = false;
      socket.once('error', reject);
      socket.on('data', chunk => {
        output += chunk;
        if (!sent && output.includes('220 elsadat-local')) {
          sent = true;
          socket.write('EHLO local\r\nMAIL FROM:<no-reply@elsadat.local>\r\nRCPT TO:<user@example.invalid>\r\nDATA\r\nSubject: OTP 123456\r\nTo: user@example.invalid\r\n\r\nCode 123456\r\n.\r\nQUIT\r\n');
        }
        if (output.includes('221 2.0.0 bye')) {
          socket.destroy();
          resolve();
        }
      });
    });
    const response = await waitFor(`http://127.0.0.1:${uiPort}/api/messages`);
    const payload = await response.json();
    assert.equal(payload.messages.length, 1);
    assert.equal(payload.messages[0].subject, 'OTP 123456');
    assert.match(payload.messages[0].raw, /Code 123456/u);
  } finally {
    await stop(child);
  }
});

test('native local proxy keeps API and Web on one browser origin', { timeout: 10_000 }, async () => {
  const apiPort = await unusedPort();
  const webPort = await unusedPort();
  const proxyPort = await unusedPort();
  const api = http.createServer((_request, response) => response.end(JSON.stringify({ upstream: 'api' })));
  const web = http.createServer((_request, response) => response.end(JSON.stringify({ status: 'ok', upstream: 'web' })));
  await new Promise((resolve, reject) => api.once('error', reject).listen(apiPort, '127.0.0.1', resolve));
  await new Promise((resolve, reject) => web.once('error', reject).listen(webPort, '127.0.0.1', resolve));
  const child = startScript('scripts/native-local-proxy.mjs', {
    API_PORT: String(apiPort), WEB_PORT: String(webPort), LOCAL_HTTP_PORT: String(proxyPort)
  });
  try {
    await waitFor(`http://127.0.0.1:${proxyPort}/health`);
    assert.deepEqual(await (await fetch(`http://127.0.0.1:${proxyPort}/api/v1/test`)).json(), { upstream: 'api' });
    assert.deepEqual(await (await fetch(`http://127.0.0.1:${proxyPort}/`)).json(), { status: 'ok', upstream: 'web' });
  } finally {
    await stop(child);
    await Promise.all([
      new Promise(resolve => api.close(resolve)),
      new Promise(resolve => web.close(resolve))
    ]);
  }
});
