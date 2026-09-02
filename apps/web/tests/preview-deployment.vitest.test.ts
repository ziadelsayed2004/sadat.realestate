import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { server } from '../src/features/testing/msw/server.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const webRoot = path.join(repositoryRoot, 'apps', 'web');
const apiRoot = path.join(repositoryRoot, 'apps', 'api');
const rootPackagePath = path.join(repositoryRoot, 'package.json');
const webPackagePath = path.join(webRoot, 'package.json');
const apiPackagePath = path.join(apiRoot, 'package.json');

interface PackageManifest {
  readonly scripts?: Record<string, string>;
}

function readText(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

async function unusedPort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => resolve());
  });
  const address = probe.address();
  if (address === null || typeof address === 'string') {
    await new Promise<void>(resolve => probe.close(() => resolve()));
    throw new Error('Unable to allocate a local preview port.');
  }
  const port = address.port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  return port;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}

async function waitForPreviewServer(child: ChildProcess, url: string): Promise<void> {
  const output: string[] = [];
  child.stdout?.on('data', chunk => output.push(String(chunk)));
  child.stderr?.on('data', chunk => output.push(String(chunk)));
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Preview server exited before readiness: ${output.join('')}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      await response.arrayBuffer();
      return;
    } catch {
      await delay(50);
    }
  }
  throw new Error(`Preview server did not become ready: ${output.join('')}`);
}

async function stopPreviewServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise<void>(resolve => child.once('exit', () => resolve())),
    delay(3_000)
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

describe('secure preview build and deployment', () => {
  it('keeps API, Web client, SSR, and native release surfaces explicit and secret-free', () => {
    const rootPackage = readJson<PackageManifest>(rootPackagePath);
    const webPackage = readJson<PackageManifest>(webPackagePath);
    const apiPackage = readJson<PackageManifest>(apiPackagePath);
    const apiService = readText(path.join(repositoryRoot, 'deploy/systemd/elsadat-api.service'));
    const nginx = readText(path.join(repositoryRoot, 'deploy/nginx/elsadatrealestate.conf'));

    expect(rootPackage.scripts?.build).toContain('build --workspace apps/api');
    expect(rootPackage.scripts?.build).toContain('build --workspace apps/web');
    expect(webPackage.scripts?.build).toContain('build:client');
    expect(webPackage.scripts?.build).toContain('build:server');
    expect(webPackage.scripts?.start).toBe('node server.mjs --mode production');
    expect(apiPackage.scripts?.build).toBe('tsc -p tsconfig.json');
    expect(apiPackage.scripts?.start).toBe('node dist/server.js');

    expect(apiService).toMatch(/User=elsadat/u);
    expect(apiService).toMatch(/NoNewPrivileges=true/u);
    expect(apiService).toMatch(/ExecStart=\/usr\/bin\/node apps\/api\/dist\/server\.js/u);
    expect(apiService).not.toMatch(/AUTH_ACCESS_TOKEN_SECRET\s*=/u);
    expect(nginx).toMatch(/proxy_pass http:\/\/127\.0\.0\.1:3000;/u);
    expect(nginx).toMatch(/proxy_pass http:\/\/127\.0\.0\.1:4173;/u);
    expect(nginx).not.toMatch(/SMTP_PASSWORD|AUTH_ACCESS_TOKEN_SECRET/u);
  });

  it('serves the built SSR shell, locale direction, crawler documents, and static assets from a preview-safe process', async () => {
    const clientIndexPath = path.join(webRoot, 'dist', 'client', 'index.html');
    const serverEntryPath = path.join(webRoot, 'dist', 'server', 'entry-server.js');
    expect(existsSync(clientIndexPath)).toBe(true);
    expect(existsSync(serverEntryPath)).toBe(true);

    const port = await unusedPort();
    const origin = `http://127.0.0.1:${port}`;
    const child = spawn(process.execPath, ['server.mjs', '--mode', 'production'], {
      cwd: webRoot,
      env: {
        ...process.env,
        APP_ENV: 'preview',
        NODE_ENV: 'production',
        WEB_HOST: '127.0.0.1',
        WEB_PORT: String(port),
        WEB_PUBLIC_ORIGIN: origin
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    server.close();
    try {
      await waitForPreviewServer(child, `${origin}/robots.txt`);

      const arabic = await fetch(`${origin}/?lang=ar`);
      const arabicBody = await arabic.text();
      expect(arabic.status).toBe(200);
      expect(arabicBody).toMatch(/<html lang="ar" dir="rtl">/u);
      expect(arabic.headers.get('content-security-policy')).toContain("default-src 'self'");
      expect(arabic.headers.get('x-content-type-options')).toBe('nosniff');
      expect(arabic.headers.get('cache-control')).toBe('no-store');

      const english = await fetch(`${origin}/?lang=en`);
      const englishBody = await english.text();
      expect(english.status).toBe(200);
      expect(englishBody).toMatch(/<html lang="en" dir="ltr">/u);

      const robots = await fetch(`${origin}/robots.txt`);
      const robotsBody = await robots.text();
      expect(robots.status).toBe(200);
      expect(robots.headers.get('content-type')).toContain('text/plain');
      expect(robotsBody).toContain(`${origin}/sitemap.xml`);

      const sitemap = await fetch(`${origin}/sitemap.xml`);
      const sitemapBody = await sitemap.text();
      expect(sitemap.status).toBe(200);
      expect(sitemap.headers.get('content-type')).toContain('application/xml');
      expect(sitemapBody).toContain('<urlset');
      expect(sitemapBody).toContain(origin);

      const assetMatch = readText(clientIndexPath).match(/(?:src|href)="(\/assets\/[^"]+)"/u);
      expect(assetMatch?.[1]).toBeDefined();
      const asset = await fetch(`${origin}${assetMatch?.[1] ?? ''}`);
      expect(asset.status).toBe(200);

      const missing = await fetch(`${origin}/preview-not-found`);
      await missing.text();
      expect(missing.status).toBe(404);
      expect(missing.headers.get('x-frame-options')).toBe('DENY');
    } finally {
      await stopPreviewServer(child);
      server.listen({ onUnhandledRequest: 'error' });
    }
  }, 30_000);

  it('keeps the development CSP compatible with Vite hydration and HMR', async () => {
    const port = await unusedPort();
    const origin = `http://127.0.0.1:${port}`;
    const child = spawn(process.execPath, ['server.mjs', '--mode', 'development'], {
      cwd: webRoot,
      env: {
        ...process.env,
        WEB_HOST: '127.0.0.1',
        WEB_PORT: String(port),
        WEB_DISABLE_HMR: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    server.close();
    try {
      await waitForPreviewServer(child, `${origin}/`);
      const response = await fetch(`${origin}/`);
      const csp = response.headers.get('content-security-policy') ?? '';
      expect(response.status).toBe(200);
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).toContain("connect-src 'self' ws: wss:");
    } finally {
      await stopPreviewServer(child);
      server.listen({ onUnhandledRequest: 'error' });
    }
  }, 60_000);
});
