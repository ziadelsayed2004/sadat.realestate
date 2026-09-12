# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps\web\tests\e2e\auth.spec.ts >> auth controls expose keyboard focus and accessible labels
- Location: apps\web\tests\e2e\auth.spec.ts:229:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/auth/verify-email?lang=ar&purpose=registration&roleType=seeker", waiting until "load"

```

# Test source

```ts
  132 |         data: {
  133 |           accessToken: 'seeker.refresh.token',
  134 |           tokenType: 'Bearer',
  135 |           expiresInSeconds: 900,
  136 |           user: { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', roleType: 'seeker', status: 'verified' }
  137 |         },
  138 |         ...successMeta('e2e-seeker-refresh')
  139 |       })
  140 |     });
  141 |   });
  142 |   await page.route('**/api/v1/seeker/overview', async route => {
  143 |     expect(route.request().headers().authorization).toBe('Bearer seeker.refresh.token');
  144 |     await route.fulfill({
  145 |       status: 200,
  146 |       contentType: 'application/json',
  147 |       body: JSON.stringify({ data: { requests: 0, viewings: 0, savedProperties: 0, notifications: 0, unreadNotifications: 0 }, ...successMeta('e2e-seeker-overview') })
  148 |     });
  149 |   });
  150 |   await page.route('**/api/v1/me**', async route => {
  151 |     expect(route.request().headers().authorization).toBe('Bearer seeker.refresh.token');
  152 |     await route.fulfill({
  153 |       status: 200,
  154 |       contentType: 'application/json',
  155 |       body: JSON.stringify({ data: { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', roleType: 'seeker', status: 'verified', email: 'seeker@example.com', firstName: 'Seeker', lastName: 'Customer', locale }, ...successMeta('e2e-seeker-profile') })
  156 |     });
  157 |   });
  158 | 
  159 |   await page.goto(`/auth/login?lang=${encodeURIComponent(locale)}&roleType=seeker`);
  160 |   await page.locator('#auth-login-email').fill('seeker@example.com');
  161 |   await page.locator('#auth-login-password').fill('secret');
  162 |   await page.locator('[data-screen-id="AUTH-01"] button[type="submit"]').click();
  163 |   await page.waitForURL(url => url.pathname === '/seeker' && url.searchParams.get('lang') === locale);
  164 |   await expect(page.locator('[data-screen-id="SEK-01"]')).toBeVisible();
  165 |   await expect(page.locator('.seeker-dashboard__topbar-profile')).toContainText('Seeker Customer');
  166 | });
  167 | 
  168 | test('login screen renders approved locale, direction, responsive shell, and safe navigation', async ({ page }) => {
  169 |   const locale = localeForProject();
  170 |   await routeAuthApi(page);
  171 |   const response = await page.goto(`/auth/login?lang=${encodeURIComponent(locale)}&returnTo=${encodeURIComponent('/auth/verify-email?purpose=registration')}`);
  172 | 
  173 |   expect(response?.ok()).toBeTruthy();
  174 |   await expect(page.locator('html')).toHaveAttribute('lang', locale);
  175 |   await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  176 |   await expect(page.locator('.route-shell')).toHaveAttribute('data-route-id', 'auth');
  177 |   await expect(page.locator('[data-screen-id="AUTH-01"]')).toBeVisible();
  178 |   await expect(page.locator('#auth-login-email')).toHaveAttribute('autocomplete', 'email');
  179 |   await expect(page.locator('#auth-login-password')).toHaveAttribute('autocomplete', 'current-password');
  180 |   await expect(page.locator('.auth-card__logo')).toHaveAttribute('src', '/assets/sadat-real-estate-logo.png');
  181 | 
  182 |   await page.locator('#auth-login-email').fill('admin@example.com');
  183 |   await page.locator('#auth-login-password').fill('secret');
  184 |   await page.locator('[data-screen-id="AUTH-01"] button[type="submit"]').click();
  185 |   await expect(page).toHaveURL(/\/auth\/verify-email\?purpose=registration$/);
  186 |   await expect(page.locator('[data-screen-id="AUTH-04"]')).toBeVisible();
  187 |   await expect(page.locator('body')).not.toContainText('header.payload.signature');
  188 | });
  189 | 
  190 | test('email verification sends, cools down, focuses digits, and verifies without exposing authority', async ({ page }) => {
  191 |   const locale = localeForProject();
  192 |   await routeAuthApi(page);
  193 |   await page.goto(`/auth/verify-email?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker`);
  194 | 
  195 |   await page.locator('#auth-otp-email').fill('seeker@example.com');
  196 |   await page.locator('[data-screen-id="AUTH-04"] button[type="submit"]').click();
  197 |   await expect(page.locator('[data-screen-id="AUTH-05"]')).toBeVisible();
  198 |   await expect(page.locator('.auth-otp__digit').first()).toBeFocused();
  199 |   await expect(page.getByRole('button', { name: /30/ })).toBeDisabled();
  200 | 
  201 |   const digits = page.locator('.auth-otp__digit');
  202 |   await expect(digits).toHaveCount(6);
  203 |   for (let position = 0; position < 6; position += 1) {
  204 |     await digits.nth(position).fill(String(position + 1));
  205 |   }
  206 |   await page.locator('[data-screen-id="AUTH-05"] button[type="submit"]').click();
  207 |   await expect(page.locator('[data-screen-id="AUTH-05"] [data-state="success"]')).toBeVisible();
  208 |   await expect(page.locator('body')).toContainText(/verified|تم التحقق|验证/);
  209 |   await expect(page.locator('body')).not.toContainText('verificationToken');
  210 | });
  211 | 
  212 | test('legacy phone verification alias redirects in the browser without preserving phone identity', async ({ page }) => {
  213 |   const locale = localeForProject();
  214 |   await page.goto(`/auth/verify-phone?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker&phone=%2B201000000000`);
  215 |   await page.waitForURL(/\/auth\/verify-email\?/u);
  216 | 
  217 |   const redirectedUrl = new URL(page.url());
  218 |   expect(redirectedUrl.pathname).toBe('/auth/verify-email');
  219 |   expect(redirectedUrl.searchParams.get('lang')).toBe(locale);
  220 |   expect(redirectedUrl.searchParams.get('purpose')).toBe('registration');
  221 |   expect(redirectedUrl.searchParams.get('roleType')).toBe('seeker');
  222 |   await expect(page.locator('[data-screen-id="AUTH-04"]')).toBeVisible();
  223 |   await expect(page.locator('#auth-otp-email')).toBeVisible();
  224 |   await expect(page.locator('#auth-phone')).toHaveCount(0);
  225 |   await expect(page.url()).not.toContain('phone');
  226 |   await expect(page.locator('body')).not.toContainText('+201000000000');
  227 | });
  228 | 
  229 | test('auth controls expose keyboard focus and accessible labels', async ({ page }) => {
  230 |   const locale = localeForProject();
  231 |   await routeAuthApi(page);
> 232 |   await page.goto(`/auth/verify-email?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker`);
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  233 | 
  234 |   await page.keyboard.press('Tab');
  235 |   await expect(page.locator('.a11y-skip-link')).toBeFocused();
  236 |   await expect(page.locator('main#main-content')).toBeVisible();
  237 |   await expect(page.locator('#auth-otp-email')).toHaveAttribute('autocomplete', 'email');
  238 |   await expect(page.locator('#auth-role-type')).toHaveAttribute('name', 'roleType');
  239 |   await expect(page.locator('.auth-card__prompt a')).toHaveAttribute('href', '/auth/login');
  240 | });
  241 | 
  242 | test('auth login and OTP approved states have responsive visual baselines', async ({ page }) => {
  243 |   const locale = localeForProject();
  244 |   await routeAuthApi(page);
  245 |   await page.goto(`/auth/login?lang=${encodeURIComponent(locale)}`);
  246 |   await expect(page).toHaveScreenshot(`auth-login-${locale}.png`, { fullPage: true });
  247 | 
  248 |   await page.goto(`/auth/verify-email?lang=${encodeURIComponent(locale)}&purpose=registration&roleType=seeker`);
  249 |   await page.locator('#auth-otp-email').fill('seeker@example.com');
  250 |   await page.locator('[data-screen-id="AUTH-04"] button[type="submit"]').click();
  251 |   await expect(page.locator('[data-screen-id="AUTH-05"]')).toBeVisible();
  252 |   await page.locator('.auth-otp__digit').first().blur();
  253 |   await page.locator('.a11y-skip-link').evaluate((element) => {
  254 |     (element as HTMLElement).style.visibility = 'hidden';
  255 |   });
  256 |   await expect(page).toHaveScreenshot(`auth-otp-${locale}.png`, {
  257 |     fullPage: true,
  258 |     mask: [page.locator('.auth-otp__actions')]
  259 |   });
  260 | });
  261 | 
```