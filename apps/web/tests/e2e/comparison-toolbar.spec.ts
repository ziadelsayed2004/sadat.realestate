import { expect, test } from '@playwright/test';
import { PUBLIC_PROPERTY_COMPARISON_FIELDS } from '@sadat-real-estate/contracts';

test('comparison toolbar keeps names and actions readable and supports removal and clearing', async ({ page }) => {
  const locale = test.info().project.name.endsWith('-en') ? 'en' : 'ar';
  const ids = ['aaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb'];
  await page.route('**/api/v1/public/properties/compare', async route => {
    const selected = route.request().postDataJSON().propertyIds as string[];
    await route.fulfill({ json: { data: {
      items: selected.map((id, index) => ({ id, slug: `toolbar-${id}`, kind: 'property', transactionType: 'sale',
        name: { ar: `شقة فاخرة في الحي الأول بمدينة السادات ${index}`, en: `Luxury apartment in the First District of Sadat City ${index}` },
        imageUrl: '/assets/canonical/public/listing-property-rental.png', price: { amount: 1900000, currency: 'EGP' } })),
      fields: PUBLIC_PROPERTY_COMPARISON_FIELDS
    }, meta: { requestId: 'toolbar' } } });
  });
  await page.goto(`/compare?lang=${locale}&propertyIds=${ids[0]}&propertyIds=${ids[1]}`);
  const toolbar = page.locator('.public-property-comparison__sticky-actions');
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator('.public-property-comparison__sticky-item')).toHaveCount(2);
  const assertLayout = async () => {
    const geometry = await toolbar.evaluate(element => {
      const bar = element.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        contained: [...element.querySelectorAll('button, .public-property-comparison__sticky-item > span')].every(child => {
          const box = child.getBoundingClientRect();
          return box.width >= 20 && box.height > 0 && box.left >= bar.left && box.right <= bar.right && box.bottom <= bar.bottom;
        }),
        names: [...element.querySelectorAll('.public-property-comparison__sticky-item > span')].every(child => getComputedStyle(child).whiteSpace === 'nowrap'),
        wrappingButtons: [...element.querySelectorAll(':scope > button')].some(child => getComputedStyle(child).whiteSpace !== 'nowrap')
      };
    });
    expect(geometry).toEqual({ overflow: false, contained: true, names: true, wrappingButtons: false });
  };
  await assertLayout();
  await toolbar.screenshot({ path: test.info().outputPath('comparison-toolbar.png') });
  if (test.info().project.name.startsWith('mobile')) {
    await page.setViewportSize({ width: 320, height: 740 });
    await assertLayout();
  }
  await toolbar.getByRole('button', { name: locale === 'ar' ? 'عرض المقارنة' : 'View comparison', exact: true }).click();
  await expect.poll(() => page.locator('.public-property-comparison__details').evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(150);
  await toolbar.locator('.public-property-comparison__sticky-item button').first().click();
  await expect(toolbar.locator('.public-property-comparison__sticky-item')).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp(`propertyIds=${ids[1]}$`));
  await toolbar.getByRole('button', { name: locale === 'ar' ? 'مسح الكل' : 'Clear all', exact: true }).click();
  await expect(toolbar).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/compare\\?lang=${locale}$`));
});
