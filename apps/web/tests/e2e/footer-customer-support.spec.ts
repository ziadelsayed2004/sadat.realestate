import { expect, test } from '@playwright/test';
import { routePublicHomepageApi } from './public-fixtures';

test('footer contact opens configured WhatsApp and offers a localized complaint without overflow', async ({ page }) => {
  const ar = test.info().project.name.endsWith('-ar');
  await routePublicHomepageApi(page);
  await page.route('**/api/v1/public/bootstrap', route => route.fulfill({ json: {
    data: { defaultLocale: 'ar', supportedLocales: ['ar', 'en'], directions: { ar: 'rtl', en: 'ltr' }, display: {}, contact: {
      phone: '+201098765432', whatsappNumber: '+201012345678', address: { ar: 'مدينة السادات، مصر', en: 'Sadat City, Egypt' },
      workingHours: { ar: 'نعمل على مدار 24 ساعة يوميًا، لنمنحك إمكانية استكشاف العقارات والتواصل معنا في أي وقت يناسبك.', en: 'Available 24 hours a day to explore properties and get in touch at a time that suits you.' }
    } }, meta: { requestId: 'footer-support' }
  } }));
  await page.goto(`/?lang=${ar ? 'ar' : 'en'}`);
  const support = page.getByRole('group', { name: ar ? 'خدمة العملاء' : 'Customer service' });
  const complaint = support.getByRole('link', { name: ar ? 'إرسال شكوى' : 'Send a complaint' });
  await expect(complaint).toBeVisible();
  await complaint.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  const contact = support.getByRole('link', { name: ar ? 'اتصل بنا' : 'Contact us' });
  await expect(contact).toHaveAttribute('href', 'https://wa.me/201012345678');
  await expect(contact).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: '+201098765432', exact: true })).toHaveAttribute('href', 'tel:+201098765432');
  await page.context().route('https://wa.me/**', route => route.fulfill({ contentType: 'text/html', body: '<p>WhatsApp destination</p>' }));
  const popupPromise = page.waitForEvent('popup');
  await contact.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://wa.me/201012345678');
  await popup.close();
  const link = new URL((await complaint.getAttribute('href'))!);
  expect(link.origin).toBe('https://wa.me'); expect(link.pathname).toBe('/201012345678');
  expect(link.searchParams.get('text')).toContain(ar ? 'أود تقديم شكوى' : 'submit a complaint');
  await expect(complaint).toHaveAttribute('target', '_blank');
  const hours = page.getByRole('region', { name: ar ? 'ساعات العمل' : 'Working hours' });
  await expect(hours).toBeVisible();
  expect(await hours.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const main = element.previousElementSibling!.getBoundingClientRect();
    const follow = element.nextElementSibling!.getBoundingClientRect();
    return bounds.top >= main.bottom - 1 && bounds.bottom <= follow.top + 1 && element.scrollWidth <= element.clientWidth + 1 && bounds.left >= 0 && bounds.right <= innerWidth;
  })).toBe(true);
  const geometry = await support.evaluate(element => {
    const footer = element.closest('footer')!; const main = footer.querySelector('.public-site-footer__main')!;
    const social = footer.querySelector('.public-site-footer__follow')!;
    const mainBounds = main.getBoundingClientRect();
    const children = Array.from(main.children).map(child => child.getBoundingClientRect());
    return {
      fits: element.scrollWidth <= element.clientWidth + 1,
      mainFits: children.every(rect => rect.left >= mainBounds.left - 1 && rect.right <= mainBounds.right + 1 && rect.bottom <= mainBounds.bottom + 1),
      followBelow: social.getBoundingClientRect().top >= Math.max(...children.map(rect => rect.bottom)) - 1,
      documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      complaintHeight: element.querySelectorAll('a')[1]!.getBoundingClientRect().height
    };
  });
  expect(geometry.fits).toBe(true); expect(geometry.mainFits).toBe(true); expect(geometry.followBelow).toBe(true);
  expect(geometry.documentFits).toBe(true); expect(geometry.complaintHeight).toBeGreaterThanOrEqual(44);
  await page.locator('footer').screenshot({ path: test.info().outputPath('footer-customer-support.png'), animations: 'disabled', style: '.a11y-skip-link{visibility:hidden}' });
});
