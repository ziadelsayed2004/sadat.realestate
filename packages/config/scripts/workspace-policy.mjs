import fs from 'node:fs';
import path from 'node:path';

export const EXPECTED_WORKSPACES = [
  ['apps/api', '@sadat-real-estate/api'],
  ['apps/web', '@sadat-real-estate/web'],
  ['packages/contracts', '@sadat-real-estate/contracts'],
  ['packages/ui', '@sadat-real-estate/ui'],
  ['packages/config', '@sadat-real-estate/config']
];

export const EXPECTED_API_DEPENDENCIES = {
  dependencies: { '@sadat-real-estate/contracts': '0.0.0', express: '5.2.1', helmet: '8.3.0', mongoose: '9.9.2' },
  devDependencies: {
    '@types/express': '5.0.6',
    '@types/node': '24.13.3',
    tsx: '4.23.12',
    typescript: '7.0.2'
  },
  peerDependencies: {}
};

export const EXPECTED_CONTRACTS_DEPENDENCIES = {
  dependencies: { zod: '4.4.3' },
  devDependencies: {},
  peerDependencies: {}
};

export function loadWorkspaceGraph(rootDir) {
  const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
  const rootPackage = read('package.json');
  const workspacePackages = {};
  for (const [workspacePath] of EXPECTED_WORKSPACES) {
    const manifestPath = path.join(rootDir, workspacePath, 'package.json');
    if (fs.existsSync(manifestPath)) {
      workspacePackages[workspacePath] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
  }
  const lockfilePath = path.join(rootDir, 'package-lock.json');
  const lockfile = fs.existsSync(lockfilePath) ? read('package-lock.json') : null;
  const tsconfig = read('tsconfig.base.json');
  return { rootPackage, workspacePackages, lockfile, tsconfig };
}

function hasOwn(value, key) {
  return value !== null && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key);
}

function normalizedMap(value) {
  return JSON.stringify(Object.fromEntries(Object.entries(value ?? {}).sort(([left], [right]) => left.localeCompare(right))));
}

export function validateWorkspaceGraph(graph) {
  const issues = [];
  const { rootPackage, workspacePackages, lockfile, tsconfig } = graph;

  if (!rootPackage || typeof rootPackage !== 'object') {
    return ['root package.json could not be loaded'];
  }
  if (rootPackage.private !== true) issues.push('root package must be private');
  if (rootPackage.packageManager !== 'npm@11.6.4') issues.push('root packageManager must be npm@11.6.4');
  if (rootPackage.engines?.node !== '>=24 <25') issues.push('root Node engine must be >=24 <25');
  if (rootPackage.engines?.npm !== '>=11 <12') issues.push('root npm engine must be >=11 <12');

  const configuredWorkspaces = Array.isArray(rootPackage.workspaces) ? rootPackage.workspaces : [];
  const expectedPaths = EXPECTED_WORKSPACES.map(([workspacePath]) => workspacePath);
  if (JSON.stringify(configuredWorkspaces) !== JSON.stringify(expectedPaths)) {
    issues.push(`workspaces must exactly equal ${JSON.stringify(expectedPaths)}`);
  }

  const names = new Set();
  for (const [workspacePath, expectedName] of EXPECTED_WORKSPACES) {
    const manifest = workspacePackages?.[workspacePath];
    if (!manifest) {
      issues.push(`missing workspace manifest: ${workspacePath}/package.json`);
      continue;
    }
    if (manifest.name !== expectedName) issues.push(`${workspacePath} must be named ${expectedName}`);
    if (names.has(manifest.name)) issues.push(`duplicate workspace package name: ${manifest.name}`);
    names.add(manifest.name);
    if (manifest.private !== true) issues.push(`${workspacePath} must be private`);
    if (manifest.type !== 'module') issues.push(`${workspacePath} must use type module`);
    const expectedDependencies = workspacePath === 'apps/api'
      ? EXPECTED_API_DEPENDENCIES
      : workspacePath === 'packages/contracts'
        ? EXPECTED_CONTRACTS_DEPENDENCIES
        : { dependencies: {}, devDependencies: {}, peerDependencies: {} };
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (normalizedMap(manifest[section]) !== normalizedMap(expectedDependencies[section])) {
        issues.push(`${workspacePath} ${section} do not match the approved foundation dependency set`);
      }
    }
  }

  if (!lockfile || typeof lockfile !== 'object') {
    issues.push('package-lock.json is required');
  } else {
    if (lockfile.lockfileVersion !== 3) issues.push('package-lock.json lockfileVersion must be 3');
    const rootLock = lockfile.packages?.[''];
    if (!rootLock) {
      issues.push('package-lock.json must contain the root package entry');
    } else if (JSON.stringify(rootLock.workspaces) !== JSON.stringify(expectedPaths)) {
      issues.push('package-lock.json root workspaces do not match package.json');
    }
    for (const [workspacePath] of EXPECTED_WORKSPACES) {
      if (!lockfile.packages?.[workspacePath]) issues.push(`package-lock.json missing workspace entry: ${workspacePath}`);
    }
    const apiLock = lockfile.packages?.['apps/api'];
    const apiManifest = workspacePackages?.['apps/api'];
    for (const section of ['dependencies', 'devDependencies']) {
      if (normalizedMap(apiLock?.[section]) !== normalizedMap(apiManifest?.[section])) {
        issues.push(`package-lock.json apps/api ${section} do not match apps/api/package.json`);
      }
    }
  }

  const compilerOptions = tsconfig?.compilerOptions;
  if (!compilerOptions || compilerOptions.strict !== true) issues.push('tsconfig.base.json must enable strict mode');
  if (compilerOptions?.module !== 'NodeNext') issues.push('tsconfig.base.json module must be NodeNext');
  if (compilerOptions?.moduleResolution !== 'NodeNext') issues.push('tsconfig.base.json moduleResolution must be NodeNext');
  if (compilerOptions?.noEmit !== true) issues.push('tsconfig.base.json noEmit must be true');

  return issues;
}
