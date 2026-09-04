import { expect, test } from '@playwright/test';

function localeForProject(): 'ar' | 'en' {
  const projectName = test.info().project.name;
  if (projectName.endsWith('-en')) return 'en';
  return 'ar';
}

function communityListFixture() {
  return {
    data: {
      items: [{
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        title: 'Published community question',
        body: 'A safe public community post for browser verification.',
        category: 'question',
        likeCount: 0,
        dislikeCount: 0,
        createdAt: '2026-08-01T10:00:00+00:00',
        commentCount: 0
      }],
      page: 1,
      limit: 20,
      total: 1
    },
    meta: { requestId: 'e2e-community-list' }
  };
}

function authRefreshFixture() {
  return {
    data: {
      accessToken: 'header.payload.signature',
      tokenType: 'Bearer',
      expiresInSeconds: 3_600,
      user: {
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        roleType: 'seeker',
        status: 'verified'
      }
    },
    meta: { requestId: 'e2e-community-auth' }
  };
}

async function routeCommunityApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/public/community/posts**', async route => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(communityListFixture()) });
  });
  await page.route('**/api/v1/auth/refresh', async route => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authRefreshFixture()) });
  });
}

test('community feed and create-post surface match the approved responsive public route', async ({ page }) => {
  const locale = localeForProject();
  await routeCommunityApi(page);
  const response = await page.goto(`/community?lang=${encodeURIComponent(locale)}`);

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'public-community');
  const community = page.locator('[data-page="public-community"]');
  await expect(community).toBeVisible();
  await expect(community.locator('.public-homepage__header')).toBeVisible();
  await expect(community.locator('[data-post-id]')).toHaveCount(1);
  await expect(page.locator('main#main-content main')).toHaveCount(0);
  await expect(page).toHaveScreenshot(`public-community-${locale}.png`, { fullPage: true });

  const openButton = community.getByRole('button', { name: /Create|إنشاء|انشر|بوست|创建/ });
  await expect(openButton).toHaveCSS('background-color', 'rgb(209, 160, 68)');
  await openButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel(/Post title|عنوان المشاركة|عنوان البوست|帖子标题/)).toBeVisible();
  await expect(page.getByLabel(/Post body|نص المشاركة|محتوى البوست|帖子内容/)).toBeVisible();
  await expect(page.locator('.ui-modal__footer')).toBeVisible();
  await expect(page).toHaveScreenshot(`public-community-create-${locale}.png`, { fullPage: true });
});

test('community controls are labeled and keyboard-accessible across approved locales', async ({ page }) => {
  const locale = localeForProject();
  await routeCommunityApi(page);
  await page.goto(`/community?lang=${encodeURIComponent(locale)}`);

  const community = page.locator('[data-page="public-community"]');
  await expect(community.locator('.public-homepage__nav')).toHaveAttribute('aria-label', /.+/);
  await expect(community.locator('button').filter({ hasText: /Create|إنشاء|انشر|بوست|创建/ })).toBeVisible();
  await expect(community.locator('[role="note"]')).toBeVisible();
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('main#main-content main')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('.a11y-skip-link')).toBeFocused();
});
