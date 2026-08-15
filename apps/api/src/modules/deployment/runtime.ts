import {
  deploymentManifestSchema,
  type DeploymentManifest
} from '@sadat-real-estate/contracts';

export const DEPLOYMENT_MANIFEST: DeploymentManifest = Object.freeze(deploymentManifestSchema.parse({
  nodeMajor: 24,
  nonRootUser: 'node',
  healthPath: '/health',
  readinessPath: '/ready',
  shutdownGraceMs: 10_000,
  imageStages: ['dependencies', 'build', 'runtime'],
  composeServices: ['api', 'mongo', 'mongo-init']
}));

export function validateDeploymentManifest(input: unknown): DeploymentManifest {
  return deploymentManifestSchema.parse(input);
}

export interface ShutdownCoordinatorDependencies {
  stopServer(): Promise<void>;
  disconnectDatabase(): Promise<void>;
  onExitCode?(code: 0 | 1): void;
}

export interface ShutdownCoordinatorOptions {
  graceMs?: number;
}

export interface ShutdownResult {
  status: 'stopped' | 'failed' | 'timed_out';
  code: 0 | 1;
}

const SHUTDOWN_TIMEOUT_MESSAGE = 'shutdown grace period expired';

function withTimeout(work: Promise<void>, graceMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(SHUTDOWN_TIMEOUT_MESSAGE)), graceMs);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function createGracefulShutdown(
  dependencies: ShutdownCoordinatorDependencies,
  options: ShutdownCoordinatorOptions = {}
): () => Promise<ShutdownResult> {
  const graceMs = options.graceMs ?? DEPLOYMENT_MANIFEST.shutdownGraceMs;
  if (!Number.isSafeInteger(graceMs) || graceMs <= 0 || graceMs > 120_000) throw new Error('Shutdown grace period is invalid');
  let inFlight: Promise<ShutdownResult> | undefined;
  return () => {
    inFlight ??= (async () => {
      try {
        await withTimeout((async () => {
          await dependencies.stopServer();
          await dependencies.disconnectDatabase();
        })(), graceMs);
        const result: ShutdownResult = { status: 'stopped', code: 0 };
        dependencies.onExitCode?.(result.code);
        return result;
      } catch (error) {
        const result: ShutdownResult = {
          status: error instanceof Error && error.message === SHUTDOWN_TIMEOUT_MESSAGE ? 'timed_out' : 'failed',
          code: 1
        };
        dependencies.onExitCode?.(result.code);
        return result;
      }
    })();
    return inFlight;
  };
}
