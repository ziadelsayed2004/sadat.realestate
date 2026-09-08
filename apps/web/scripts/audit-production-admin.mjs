import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

const baseUrl = 'https://elsadatrealestate.com';
const outputDirectory = path.resolve(process.env.ADMIN_AUDIT_OUTPUT ?? 'test-results/production-admin-audit');
const sidebarSource = readFileSync(new URL('../src/features/admin/overview.tsx', import.meta.url), 'utf8');
const routes = [...sidebarSource.matchAll(/sidebarItem\('([^']+)', '([^']+)'/gu)].map(([, name, route]) => [`${route}?lang=ar`, name]);


async function readCredentials() {
  const lines = createInterface({ input: process.stdin, terminal: false });
  const input = JSON.parse(await lines.question(''));
  lines.close();
  if (typeof input.email !== 'string' || typeof input.password !== 'string') {
    throw new Error('Missing production audit credentials.');
  }
  return input;
}

async function inspectRoute(page, route, name, device) {
  const failures = [];
  const httpErrors = [];
  const httpErrorTasks = [];
  const onRequestFailed = request => failures.push({
    method: request.method(),
    resourceType: request.resourceType(),
    url: new URL(request.url()).pathname,
    error: request.failure()?.errorText ?? 'unknown',
  });
  page.on('requestfailed', onRequestFailed);
  const onResponse = response => {
    if (response.status() >= 400) {
      httpErrorTasks.push(response.text().catch(() => '').then(body => {
        httpErrors.push({
          method: response.request().method(),
          resourceType: response.request().resourceType(),
          status: response.status(),
          path: `${new URL(response.url()).pathname}${new URL(response.url()).search}`,
          body: body.slice(0, 600),
        });
      }));
    }
  };
  page.on('response', onResponse);

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForTimeout(700);
  const details = await page.evaluate(() => {
    const root = document.querySelector('[data-screen-id]');
    const state = document.querySelector('[data-state]');
    const access = document.querySelector('[data-access]');
    const heading = document.querySelector('h1');
    const visibleInteractive = [...document.querySelectorAll('button, a[href], input, select, textarea')]
      .filter(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      }).length;
    return {
      screenId: root?.getAttribute('data-screen-id') ?? null,
      state: state?.getAttribute('data-state') ?? root?.getAttribute('data-state') ?? null,
      access: access?.getAttribute('data-access') ?? null,
      heading: heading?.textContent?.trim().slice(0, 160) ?? null,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      screenWidth: window.screen.width,
      clientWidth: document.documentElement.clientWidth,
      overflowPixels: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      visibleInteractive,
    };
  });

  const screenshot = path.join(outputDirectory, `${device}-${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await Promise.all(httpErrorTasks);
  page.off('requestfailed', onRequestFailed);
  page.off('response', onResponse);
  return {
    device,
    route,
    status: response?.status() ?? null,
    finalPath: new URL(page.url()).pathname,
    ...details,
    requestFailures: failures,
    httpErrors,
    screenshot,
  };
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const credentials = await readCredentials();
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: 'ar-EG',
    });
    const loginPage = await desktop.newPage();
    loginPage.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 400));
    });
    await loginPage.goto(`${baseUrl}/auth/login?lang=ar`, { waitUntil: 'networkidle', timeout: 45_000 });
    await loginPage.locator('#auth-login-email').fill(credentials.email);
    await loginPage.locator('#auth-login-password').fill(credentials.password);
    await Promise.all([
      loginPage.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => undefined),
      loginPage.locator('.auth-form button[type="submit"]').click(),
    ]);
    await loginPage.waitForTimeout(1_000);
    credentials.email = '';
    credentials.password = '';

    const login = await loginPage.evaluate(() => ({
      finalPath: location.pathname,
      screenId: document.querySelector('[data-screen-id]')?.getAttribute('data-screen-id') ?? null,
      access: document.querySelector('[data-access]')?.getAttribute('data-access') ?? null,
      error: document.querySelector('[role="alert"], .auth-form__error')?.textContent?.trim().slice(0, 240) ?? null,
    }));

    const desktopResults = [];
    for (const [route, name] of routes) {
      desktopResults.push(await inspectRoute(loginPage, route, name, 'desktop'));
    }

    const storageState = await desktop.storageState();
    const mobile = await browser.newContext({
      ...devices['Pixel 5'],
      locale: 'ar-EG',
      storageState,
    });
    const mobilePage = await mobile.newPage();
    const mobileResults = [];
    for (const [route, name] of routes) {
      mobileResults.push(await inspectRoute(mobilePage, route, name, 'mobile'));
    }
    await mobile.close();

    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      login,
      desktop: desktopResults,
      mobile: mobileResults,
      consoleErrors: [...new Set(consoleErrors)],
    };
    await writeFile(path.join(outputDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(JSON.stringify({
      ok: login.screenId === 'ADM-01' && !login.error && [...desktopResults, ...mobileResults].every(result => result.status === 200 && !result.access && result.httpErrors.length === 0 && result.viewportWidth === (result.device === 'mobile' ? 393 : 1440)),
      login,
      desktop: desktopResults.map(({ screenshot: _screenshot, ...result }) => result),
      mobile: mobileResults.map(({ screenshot: _screenshot, ...result }) => result),
      consoleErrors: report.consoleErrors,
      report: path.join(outputDirectory, 'report.json'),
    }));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
