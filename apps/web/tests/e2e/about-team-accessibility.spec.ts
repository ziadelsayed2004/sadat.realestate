import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

async function routeAboutTeamApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/public/about', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { items: [{ key: 'mission', title: { en: 'Our mission' }, body: { en: 'A published mission.' }, order: 0 }] },
        meta: { requestId: 'a11y-about' }
      })
    });
  });
  await page.route('**/api/v1/public/team', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { items: [{ key: 'leader', title: { en: 'Platform lead' }, name: { en: 'Published team member' }, role: { en: 'Platform lead' }, bio: { en: 'A public biography.' }, order: 0 }] },
        meta: { requestId: 'a11y-team' }
      })
    });
  });
}

test('public About exposes landmarks, labeled navigation, headings, and keyboard focus', async ({ page }) => {
  const locale = localeForProject();
  await routeAboutTeamApi(page);
  await page.goto(`/about?lang=${encodeURIComponent(locale)}`);

  const about = page.locator('[data-page="public-about"]');
  await expect(about).toHaveAttribute('data-about-state', 'success');
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(about.locator('.public-homepage__nav')).toHaveAttribute('aria-label', /.+/);
  await expect(about.locator('h1')).toBeVisible();
  await expect(about.locator('.public-about__block h2')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.locator('.a11y-skip-link')).toBeFocused();
});

test('public Team exposes labeled content and a non-deceptive media fallback', async ({ page }) => {
  const locale = localeForProject();
  await routeAboutTeamApi(page);
  await page.goto(`/team?lang=${encodeURIComponent(locale)}`);

  const team = page.locator('[data-page="public-team"]');
  await expect(team).toHaveAttribute('data-team-state', 'success');
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(team.locator('.public-homepage__nav')).toHaveAttribute('aria-label', /.+/);
  await expect(team.locator('h1')).toBeVisible();
  await expect(team.locator('.public-team__card h2')).toHaveCount(1);
  await expect(team.locator('[data-state="missing_image"]')).toHaveAttribute('aria-label', /.+/);
  await expect(team.locator('img[src*="photoAssetId"]')).toHaveCount(0);
});
