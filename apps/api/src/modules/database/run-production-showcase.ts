import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function runProductionShowcase(): Promise<number> {
  throw new Error('PRODUCTION_SHOWCASE_DISABLED');
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && fileURLToPath(import.meta.url) === path.resolve(entrypoint));
}

if (isEntrypoint()) {
  runProductionShowcase().then(applied => {
    process.stdout.write(`PRODUCTION_SHOWCASE_READY applied=${applied}\n`);
  }).catch(() => {
    process.stderr.write('Production showcase failed safely; no connection details were emitted.\n');
    process.exitCode = 1;
  });
}
