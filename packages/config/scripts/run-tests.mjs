import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const unsupported = args.filter((arg) => arg !== '--runInBand');
if (unsupported.length > 0) {
  console.error(`Unsupported test arguments: ${unsupported.join(', ')}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', 'packages/config/tests/workspace-policy.test.mjs'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

const npmExecPath = process.env.npm_execpath;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const apiArgs = npmExecPath
  ? [npmExecPath, 'test', '--workspace', 'apps/api']
  : ['test', '--workspace', 'apps/api'];
const apiResult = spawnSync(npmExecPath ? process.execPath : npmCommand, apiArgs, { stdio: 'inherit' });
process.exit(apiResult.status ?? 1);
