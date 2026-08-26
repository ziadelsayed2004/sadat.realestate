# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seeker-registration.spec.ts >> seeker registration role, form, and success states have responsive visual baselines
- Location: tests\e2e\seeker-registration.spec.ts:159:1

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  Expected an image 393px by 1155px, received 393px by 997px. 27311 pixels (ratio 0.07 of all image pixels) are different.

  Snapshot: seeker-registration-role-ar.png

Call log:
  - Expect "toHaveScreenshot(seeker-registration-role-ar.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - Expected an image 393px by 1155px, received 393px by 997px. 27311 pixels (ratio 0.07 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - Expected an image 393px by 1155px, received 393px by 997px. 27311 pixels (ratio 0.07 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "عقارات السادات" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "عقارات السادات" [ref=e6]
      - text: ›
  - main [ref=e7]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic "الخطوة 1" [ref=e11]: "1"
        - heading "ما هدفك من استخدام عقارات السادات؟" [level=1] [ref=e14]
        - paragraph [ref=e15]: اختر نوع الاستخدام المناسب لك، ويمكنك استكمال بيانات حسابك في الخطوة التالية.
      - generic [ref=e16]:
        - generic "نوع الحساب" [ref=e17]:
          - button "أبحث عن عقار استكشف الوحدات، احفظ العقارات المناسبة، وأرسل طلبات الاستفسار والمعاينة." [ref=e18] [cursor=pointer]:
            - generic [ref=e23]: أبحث عن عقار
            - generic [ref=e24]: استكشف الوحدات، احفظ العقارات المناسبة، وأرسل طلبات الاستفسار والمعاينة.
          - link "أريد عرض عقارات أضف وحداتك وتابع طلبات العملاء بعد مراجعة واعتماد حسابك. مقدم عقار" [ref=e25] [cursor=pointer]:
            - /url: /auth/register/provider/type
            - generic [ref=e31]: أريد عرض عقارات
            - generic [ref=e32]: أضف وحداتك وتابع طلبات العملاء بعد مراجعة واعتماد حسابك.
            - generic [ref=e33]: مقدم عقار
        - generic [ref=e35]:
          - button "متابعة" [disabled] [ref=e36]
          - paragraph [ref=e38]:
            - link "› العودة إلى تسجيل الدخول" [ref=e39] [cursor=pointer]:
              - /url: /auth/login
```

# Test source

```ts
  64  |       status: 201,
  65  |       contentType: 'application/json',
  66  |       body: JSON.stringify({
  67  |         data: {
  68  |           outcome: 'registered',
  69  |           session: {
  70  |             accessToken: 'header.payload.signature',
  71  |             tokenType: 'Bearer',
  72  |             expiresInSeconds: 900,
  73  |             user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'seeker', status: 'verified' }
  74  |           }
  75  |         },
  76  |         ...successMeta('e2e-seeker-registration-create')
  77  |       })
  78  |     });
  79  |   });
  80  | }
  81  | 
  82  | async function hideSkipLink(page: import('@playwright/test').Page): Promise<void> {
  83  |   await page.locator('.a11y-skip-link').evaluate((element) => {
  84  |     (element as HTMLElement).style.visibility = 'hidden';
  85  |   });
  86  | }
  87  | 
  88  | async function chooseSeeker(page: import('@playwright/test').Page): Promise<void> {
  89  |   await page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first().click();
  90  |   await expect(page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first()).toHaveAttribute('aria-pressed', 'true');
  91  |   await page.getByRole('button', { name: /continue|متابعة|继续/iu }).click();
  92  |   await expect(page).toHaveURL(/\/auth\/verify-phone\?purpose=registration&roleType=seeker$/u);
  93  | }
  94  | 
  95  | async function completeVerification(page: import('@playwright/test').Page, locale: 'ar' | 'en' | 'zh-CN'): Promise<void> {
  96  |   await page.locator('#auth-otp-email').fill('seeker@example.com');
  97  |   await page.getByLabel(/phone number|رقم الهاتف|手机号/iu).fill('+20 100 000 0000');
  98  |   await page.getByRole('button', { name: /send code|إرسال الرمز|发送验证码/iu }).click();
  99  |   await expect(page.locator('[data-screen-id="AUTH-05"]')).toBeVisible();
  100 | 
  101 |   const digits = page.locator('.auth-otp__digit');
  102 |   await expect(digits).toHaveCount(6);
  103 |   for (let position = 0; position < 6; position += 1) {
  104 |     await digits.nth(position).fill(String(position + 1));
  105 |   }
  106 |   await page.getByRole('button', { name: /verify code|تأكيد الرمز|验证验证码/iu }).click();
  107 |   await expect(page.locator('[data-screen-id="AUTH-03"]')).toBeVisible();
  108 |   await expect(page).toHaveURL(/\/auth\/register\/seeker$/u);
  109 |   await expect(page.getByLabel(/verified phone|رقم الهاتف المؤكد|已验证手机号/iu)).toHaveValue('+201000000000');
  110 |   await expect(page.locator('#auth-registration-email')).toHaveValue('seeker@example.com');
  111 |   await expect(page.locator('body')).not.toContainText(VERIFICATION_TOKEN);
  112 |   await expect(page.locator('body')).not.toContainText('verificationToken');
  113 |   await expect(page).toHaveTitle(/.+/u);
  114 |   void locale;
  115 | }
  116 | 
  117 | test('seeker registration follows the verified OTP authority through the implemented API and reaches truthful success', async ({ page }) => {
  118 |   const locale = localeForProject();
  119 |   await routeRegistrationApi(page);
  120 |   await page.goto(`/auth/register?lang=${encodeURIComponent(locale)}`);
  121 |   await expect(page.locator('html')).toHaveAttribute('lang', locale);
  122 |   await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  123 |   await expect(page.locator('[data-screen-id="AUTH-02"]')).toBeVisible();
  124 | 
  125 |   await chooseSeeker(page);
  126 |   await completeVerification(page, locale);
  127 | 
  128 |   await page.getByLabel(/first name|الاسم الأول|名字/iu).fill('Mona');
  129 |   await page.getByLabel(/last name|اسم العائلة|姓氏/iu).fill('Hassan');
  130 |   await page.getByRole('button', { name: /create account|إنشاء الحساب|创建账号/iu }).click();
  131 |   await expect(page.locator('[data-screen-id="AUTH-06"]')).toBeVisible();
  132 |   await expect(page).toHaveURL(/\/auth\/register\/seeker\/success$/u);
  133 |   await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  134 |   await expect(page.locator('body')).not.toContainText(VERIFICATION_TOKEN);
  135 |   await expect(page.locator('body')).not.toContainText('verificationToken');
  136 |   await expect(page.url()).not.toContain(VERIFICATION_TOKEN);
  137 | });
  138 | 
  139 | test('seeker registration controls support keyboard focus and accessible form labels', async ({ page }) => {
  140 |   const locale = localeForProject();
  141 |   await routeRegistrationApi(page);
  142 |   await page.goto(`/auth/register?lang=${encodeURIComponent(locale)}`);
  143 |   await expect(page.locator('[data-screen-id="AUTH-02"]')).toBeVisible();
  144 | 
  145 |   const seekerCard = page.locator('[data-screen-id="AUTH-02"] .auth-role-card').first();
  146 |   await seekerCard.focus();
  147 |   await expect(seekerCard).toBeFocused();
  148 |   await page.keyboard.press('Enter');
  149 |   await expect(seekerCard).toHaveAttribute('aria-pressed', 'true');
  150 |   await page.getByRole('button', { name: /continue|متابعة|继续/iu }).focus();
  151 |   await page.keyboard.press('Enter');
  152 |   await expect(page.getByLabel(/phone number|رقم الهاتف|手机号/iu)).toHaveAttribute('autocomplete', 'tel');
  153 | 
  154 |   await completeVerification(page, locale);
  155 |   await expect(page.getByLabel(/first name|الاسم الأول|名字/iu)).toHaveAttribute('autocomplete', 'given-name');
  156 |   await expect(page.getByLabel(/last name|اسم العائلة|姓氏/iu)).toHaveAttribute('autocomplete', 'family-name');
  157 | });
  158 | 
  159 | test('seeker registration role, form, and success states have responsive visual baselines', async ({ page }) => {
  160 |   const locale = localeForProject();
  161 |   await routeRegistrationApi(page);
  162 |   await page.goto(`/auth/register?lang=${encodeURIComponent(locale)}`);
  163 |   await hideSkipLink(page);
> 164 |   await expect(page).toHaveScreenshot(`seeker-registration-role-${locale}.png`, { fullPage: true });
      |                      ^ Error: expect(page).toHaveScreenshot(expected) failed
  165 | 
  166 |   await chooseSeeker(page);
  167 |   await completeVerification(page, locale);
  168 |   await hideSkipLink(page);
  169 |   await expect(page).toHaveScreenshot(`seeker-registration-form-${locale}.png`, { fullPage: true });
  170 | 
  171 |   await page.getByLabel(/first name|الاسم الأول|名字/iu).fill('Mona');
  172 |   await page.getByLabel(/last name|اسم العائلة|姓氏/iu).fill('Hassan');
  173 |   await page.getByRole('button', { name: /create account|إنشاء الحساب|创建账号/iu }).click();
  174 |   await expect(page.locator('[data-screen-id="AUTH-06"]')).toBeVisible();
  175 |   await hideSkipLink(page);
  176 |   await expect(page).toHaveScreenshot(`seeker-registration-success-${locale}.png`, { fullPage: true });
  177 | });
  178 | 
```