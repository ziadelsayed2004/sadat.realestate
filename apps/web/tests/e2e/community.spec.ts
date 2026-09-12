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
  const titleInput = page.locator('#community-create-form input').first();
  await titleInput.fill('Focus remains here');
  await expect(titleInput).toBeFocused();
  await expect(page.locator('.ui-modal__close')).not.toBeFocused();
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

test('anonymous community login modal stays inside a full viewport overlay', async ({ page }) => {
  await page.route('**/api/v1/public/community/posts**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(communityListFixture()) }));
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AUTHENTICATION_REQUIRED', messageKey: 'errors.authenticationRequired' } }) }));
  await page.goto(`/community?lang=${localeForProject()}`);
  const opener = page.locator('.public-community__intro button');
  await opener.click();
  const dialog = page.locator('.public-community__composer-modal--permission');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('a[href="/auth/login"]')).toBeVisible();
  const overlay = page.locator('.ui-modal-backdrop');
  await expect(overlay).toHaveCSS('position', 'fixed');
  await expect(overlay).toHaveCSS('max-width', 'none');
  await expect(overlay).toHaveCSS('margin-top', '0px');
  const viewport = page.viewportSize()!;
  const bounds = (await overlay.boundingBox())!;
  expect(Math.abs(bounds.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.width - viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.height - viewport.height)).toBeLessThanOrEqual(1);
  const modal = (await dialog.boundingBox())!;
  expect(modal.y).toBeGreaterThanOrEqual(0);
  expect(modal.y + modal.height).toBeLessThanOrEqual(viewport.height);
  expect(Math.abs(modal.x + modal.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.screenshot({ path: test.info().outputPath('community-login-modal.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.locator('.ui-modal__close').click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('community comments and reactions work responsively after authentication', async ({ page }) => {
  const locale = localeForProject();
  let likeCount = 0;
  let dislikeCount = 0;
  let commentCount = 0;
  await page.route('**/api/v1/public/community/posts**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === 'POST' && pathname.endsWith('/reactions')) {
      const requestBody = request.postDataJSON() as { reaction: 'like' | 'dislike' };
      if (requestBody.reaction === 'like') likeCount += 1;
      else dislikeCount += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { postId: 'aaaaaaaaaaaaaaaaaaaaaaaa', reaction: requestBody.reaction, likeCount, dislikeCount }, meta: { requestId: 'e2e-reaction' } }) });
      return;
    }
    if (request.method() === 'POST' && pathname.endsWith('/comments')) {
      commentCount += 1;
      const requestBody = request.postDataJSON() as { body: string };
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: { id: 'cccccccccccccccccccccccc', postId: 'aaaaaaaaaaaaaaaaaaaaaaaa', body: requestBody.body, depth: 0, createdAt: '2026-09-12T10:00:00+00:00' }, meta: { requestId: 'e2e-comment' } }) });
      return;
    }
    if (request.method() === 'GET' && pathname.endsWith('/aaaaaaaaaaaaaaaaaaaaaaaa')) {
      const fixture = communityListFixture().data.items[0]!;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { post: { ...fixture, commentCount }, comments: [] }, meta: { requestId: 'e2e-detail' } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(communityListFixture()) });
  });
  await page.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authRefreshFixture()) }));
  await page.goto(`/community?lang=${locale}`);

  await page.locator('.public-community__intro button').click();
  await expect(page.locator('#community-create-form')).toBeVisible();
  await page.locator('.ui-modal__close').click();

  const like = page.locator('.public-community__reaction').first();
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(like.locator('span')).toHaveText('1');

  await page.locator('.public-community__comment-action').click();
  const comment = page.locator('#community-comment');
  await expect(comment).toBeVisible();
  await comment.fill(locale === 'ar' ? 'تعليق مفيد للاختبار' : 'A useful test comment');
  await page.locator('.public-community__comment-form button[type="submit"]').click();
  await expect(page.locator('.public-community__comment-list')).toContainText(locale === 'ar' ? 'تعليق مفيد للاختبار' : 'A useful test comment');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('community-comments-and-reactions.png'), fullPage: true });
});
