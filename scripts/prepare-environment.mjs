import { randomBytes } from 'node:crypto';
import { access, chmod, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];

if (mode !== 'local' && mode !== 'production') {
  process.stderr.write('Usage: node scripts/prepare-environment.mjs local|production\n');
  process.exitCode = 1;
} else {
  const target = path.join(repositoryRoot, `.env.${mode}`);
  try {
    await access(target);
    process.stderr.write(`Refusing to overwrite existing ${path.basename(target)}\n`);
    process.exitCode = 1;
  } catch {
    const example = await readFile(`${target}.example`, 'utf8');
    let content = example;
    if (mode === 'production') {
      const rootPassword = randomBytes(27).toString('base64url');
      const appPassword = randomBytes(27).toString('base64url');
      content = content
        .replace('REPLACE_WITH_BASE64URL_32_BYTE_SECRET', randomBytes(48).toString('base64url'))
        .replace('REPLACE_WITH_DIFFERENT_BASE64URL_32_BYTE_SECRET', randomBytes(48).toString('base64url'))
        .replaceAll('REPLACE_WITH_URL_SAFE_ROOT_PASSWORD', rootPassword)
        .replaceAll('REPLACE_WITH_URL_SAFE_APP_PASSWORD', appPassword)
        .replace('REPLACE_WITH_LONG_BASE64_REPLICA_KEY', randomBytes(384).toString('base64'));
    }
    await writeFile(target, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await chmod(target, 0o600);
    process.stdout.write(`ENVIRONMENT_FILE_CREATED ${path.basename(target)} mode=0600\n`);
    if (mode === 'production') {
      process.stdout.write('ACTION_REQUIRED Replace SMTP_PASSWORD with the Hostinger mailbox password, then run npm run production:preflight.\n');
    }
  }
}
