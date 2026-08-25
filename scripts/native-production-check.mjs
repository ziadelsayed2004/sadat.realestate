import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { repositoryRoot } from './environment-file.mjs';

const requiredFiles = [
  'deploy/nginx/elsadatrealestate.conf',
  'deploy/systemd/elsadat-api.service',
  'deploy/systemd/elsadat-web.service',
  'deploy/systemd/elsadat-backup.service',
  'deploy/systemd/elsadat-backup.timer',
  'deploy/systemd/elsadat-healthcheck.service',
  'deploy/systemd/elsadat-healthcheck.timer',
  'deploy/native/install-ubuntu.sh',
  'deploy/native/deploy-release.sh',
  'deploy/native/healthcheck.sh',
  'deploy/native/backup.sh',
  'deploy/native/restore.sh'
];

function runPreflight() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/production-preflight.mjs'], {
      cwd: repositoryRoot, env: process.env, stdio: 'inherit', windowsHide: true
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`PRODUCTION_PREFLIGHT_EXIT_${code}`)));
  });
}

try {
  for (const file of requiredFiles) await access(path.join(repositoryRoot, file));
  const nginx = await readFile(path.join(repositoryRoot, requiredFiles[0]), 'utf8');
  if (!nginx.includes('127.0.0.1:3000') || !nginx.includes('127.0.0.1:4173')) {
    throw new Error('NGINX_LOOPBACK_UPSTREAMS_MISSING');
  }
  await runPreflight();
  process.stdout.write(`NATIVE_PRODUCTION_CONFIG_OK artifacts=${requiredFiles.length}\n`);
} catch (error) {
  process.stderr.write(`NATIVE_PRODUCTION_CONFIG_FAILED ${error instanceof Error ? error.message : 'UNKNOWN'}\n`);
  process.exitCode = 1;
}
