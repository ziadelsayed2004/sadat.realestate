import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' | 'zh-CN' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-zh')) return 'zh-CN';
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function aboutFixture() {
  return {
    data: {
      items: [
        { key: 'about_intro', title: { ar: 'عن المنصة', en: 'About the platform', 'zh-CN': '关于平台' }, body: { ar: 'أنشأنا هذه المنصة لأن السوق العقاري في مدينة السادات يحتاج منصة متخصصة وموثوقة.', en: 'A specialized and trusted real-estate marketplace.', 'zh-CN': '专业且可信的房地产市场。' }, order: 0 },
        { key: 'trust', title: { ar: 'الثقة', en: 'Trust', 'zh-CN': '信任' }, body: { ar: 'مبدأ ثقة منشور', en: 'A published trust principle.', 'zh-CN': '已发布的信任原则。' }, order: 1 }
      ]
    },
    meta: { requestId: 'e2e-about' }
  };
}

function teamFixture() {
  return {
    data: {
      items: [{
        key: 'team_ahmed',
        title: { ar: 'قائد المنصة', en: 'Platform lead', 'zh-CN': '平台负责人' },
        name: { ar: 'عضو الفريق المنشور', en: 'Published team member', 'zh-CN': '已发布团队成员' },
        role: { ar: 'قائد المنصة', en: 'Platform lead', 'zh-CN': '平台负责人' },
        bio: { ar: 'نبذة عامة منشورة.', en: 'A public biography.', 'zh-CN': '已发布的公开简介。' },
        photoAssetId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        order: 0
      }]
    },
    meta: { requestId: 'e2e-team' }
  };
}

async function routeAboutTeamApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/public/about', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aboutFixture()) });
  });
  await page.route('**/api/v1/public/team', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(teamFixture()) });
  });
}

test('public About renders published CMS content across approved locales and devices', async ({ page }) => {
  const locale = localeForProject();
  await routeAboutTeamApi(page);
  const response = await page.goto(`/about?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-about');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-device-scope', 'desktop/tablet/mobile');
  const about = page.locator('[data-page="public-about"]');
  await expect(about).toHaveAttribute('data-about-state', 'success');
  await expect(about.locator('.public-about__hero-media')).toBeVisible();
  await expect(about.locator('h1')).toBeVisible();
  await expect(about.locator('.public-about__step')).toHaveCount(5);
  await expect(about.locator('.public-about__value')).toHaveCount(4);
  await expect(about.locator('.public-about__stat-grid article')).toHaveCount(4);
  await expect(page).toHaveScreenshot(`public-about-${locale}.png`, { fullPage: true });
});

test('public Team renders safe published projections across approved locales and devices', async ({ page }) => {
  const locale = localeForProject();
  await routeAboutTeamApi(page);
  const response = await page.goto(`/team?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-team');
  const team = page.locator('[data-page="public-team"]');
  await expect(team).toHaveAttribute('data-team-state', 'success');
  await expect(team.locator('.public-team__card')).toHaveCount(1);
  await expect(team.locator('[data-media-state="success"]')).toHaveCount(1);
  await expect(page).toHaveScreenshot(`public-team-${locale}.png`, { fullPage: true });
});
