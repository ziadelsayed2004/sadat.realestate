import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { publicHomepageDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../src/features/contracts/index.ts';
import { PublicHomepage } from '../src/features/public/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { parsePublicPropertySearchQuery } from '../src/features/public/listing-data.ts';

const homepageData = publicHomepageDataSchema.parse({
  sections: [{
    key: 'hero',
    title: { ar: 'عقارات منشورة', en: 'Published homes',},
    body: { en: 'Content supplied by the public homepage contract.' },
    order: 0
  }],
  categories: [],
  metrics: [],
  properties: [{
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    slug: 'published-home',
    kind: 'property',
    name: { en: 'Published home' },
    transactionType: 'sale',
    area: { value: 120, unit: 'sqm' },
    layout: { bedrooms: 3, bathrooms: 2 },
    price: { amount: 1_250_000, currency: 'EGP' },
    sourceName: { en: 'Professional Development Company' },
    sourceType: 'developer_company',
    sourceImageUrl: 'https://example.com/developer-logo.png',
    publicCode: 'SDT-0567',
    installmentAvailable: true,
    featured: true
  }],
  developers: [{
    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    slug: 'approved-builder',
    name: { en: 'Approved builder' },
    description: { en: 'Published developer description.' }
  }],
  content: [{
    key: 'published_article',
    type: 'article',
    title: { en: 'Published article' },
    body: { en: 'Published article body.' },
    order: 0
  }],
  banners: [{
    key: 'hero_banner',
    title: { en: 'Published banner' },
    imageUrl: 'https://example.com/hero.jpg',
    targetUrl: 'https://example.com/published',
    order: 0
  }]
});

const emptyData = publicHomepageDataSchema.parse({
  sections: [],
  categories: [],
  metrics: [],
  properties: [],
  developers: [],
  content: [],
  banners: []
});

describe('public homepage', () => {
  it.each(['ar', 'en'] as const)('makes only the promotion CTA a link and repairs the seeded project destination in %s', locale => {
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [...homepageData.banners, { key: 'city_banner', title: { en: 'Elite Compound' }, targetUrl: '/properties/demo-open-view-apartment', order: 1 }] });
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={data} />, { locale });
    const card = result.container.querySelector('.public-homepage__banner-card')!;
    expect(card.querySelectorAll('a')).toHaveLength(1);
    expect(card.querySelector('a')).toHaveAttribute('href', `/developers/as-real-estate-development?lang=${locale}#project-elite-compound`);
    expect(card.querySelector('h2')?.closest('a')).toBeNull();
    expect(card.querySelector('.public-homepage__banner-media-wrapper')?.closest('a')).toBeNull();
  });
  it.each(['/developers/approved-builder?source=ad#developer-projects', 'https://example.com/campaign?source=ad'])('preserves administrator-selected promotional destinations: %s', targetUrl => {
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [...homepageData.banners, { key: 'city_banner', title: { en: 'Custom promotion' }, targetUrl, order: 1 }] });
    const result = renderWithLocale(<PublicHomepage locale="ar" initialData={data} />, { locale: 'ar' });
    const expected = targetUrl.startsWith('/') ? '/developers/approved-builder?source=ad&lang=ar#developer-projects' : targetUrl;
    expect(result.container.querySelector('.public-homepage__banner-cta')).toHaveAttribute('href', expected);
  });
  it.each(['ar', 'en'] as const)('displays the managed banner title over its image instead of the old homepage heading in %s', locale => {
    const title = { ar: 'حبيبة مجدي مديرة المبيعات', en: 'Habiba Magdy sales manager' };
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [{ key: 'banner_aaaaaaaaaaaaaaaaaaaaaaaa', title, body: { ar: 'نص الإعلان المعدل', en: 'Edited advertisement description' }, altText: { en: 'Description of the banner image' }, imageUrl: 'https://example.com/new-banner.jpg', order: 0 }] });
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={data} />, { locale });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title[locale]);
    expect(screen.getByText(locale === 'ar' ? 'نص الإعلان المعدل' : 'Edited advertisement description')).toBeInTheDocument();
    expect(result.container.querySelector('.public-homepage__hero-media img')).toHaveAttribute('src', 'https://example.com/new-banner.jpg');
    expect(result.container.querySelector('.public-homepage__hero-media img')).toHaveAttribute('alt', 'Description of the banner image');
  });

  it('refreshes timed banners without replacing the search form, and retains the page if background refresh fails', async () => {
    vi.useFakeTimers();
    const title = 'A scheduled banner';
    const load = vi.fn().mockResolvedValueOnce({ ...homepageData, banners: [{ key: 'banner_aaaaaaaaaaaaaaaaaaaaaaaa', title: { en: title }, imageUrl: 'https://example.com/timed.jpg', order: 0 }] })
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce({ ...homepageData, banners: [] });
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={homepageData} load={load} />, { locale: 'en' });
    try {
      fireEvent.click(screen.getByRole('tab', { name: 'For rent' }));
      const searchForm = result.container.querySelector('.public-homepage__hero form');
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
      expect(result.container.querySelector('.public-homepage__hero form')).toBe(searchForm);
      expect(result.container.querySelector('input[name="transactionType"]')).toHaveValue('rent');
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
      expect(result.container.querySelector('[data-homepage-state]')).toHaveAttribute('data-homepage-state', 'success');
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Published homes');
      expect(result.container.querySelector('.public-homepage__hero form')).toBe(searchForm);
      expect(result.container.querySelector('input[name="transactionType"]')).toHaveValue('rent');
    } finally { result.unmount(); vi.useRealTimers(); }
  });
  it.each(['ar', 'en'] as const)('renders the contract projection for %s', (locale) => {
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={homepageData} />, { locale });

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    const heroTitle = locale === 'ar' ? 'عقارات منشورة' : 'Published homes';
    expect(screen.getByRole('heading', { name: heroTitle, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Published home' })).toHaveAttribute('href', '/properties/published-home');
    expect(screen.queryByRole('link', { name: 'Approved builder' })).not.toBeInTheDocument();
    expect(screen.getByText('Published article body.')).toBeInTheDocument();
    const brandLabel = locale === 'ar' ? 'عقارات السادات' : 'Sadat Real Estate';
    expect(screen.getByRole('img', { name: brandLabel })).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('providerId');
    expect(result.container.textContent).not.toContain('audit');
  });

  it.each(['ar', 'en'] as const)('renders the shared three-row Figma footer and locale-safe links for %s', locale => {
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={homepageData} />, { locale });
    const footer = result.container.querySelector('.public-site-footer');

    expect(footer?.querySelector(':scope > .public-site-footer__main')).not.toBeNull();
    expect(footer?.querySelector(':scope > .public-site-footer__follow > .public-site-footer__follow-inner')).not.toBeNull();
    expect(footer?.querySelector(':scope > .public-site-footer__bottom')).toHaveTextContent('2026');
    expect(footer?.querySelector(`a[href="/properties?lang=${locale}"]`)).not.toBeNull();
    expect(footer?.querySelector(`a[href="/community?lang=${locale}"]`)).not.toBeNull();
    expect(footer?.querySelector('.public-site-footer__mobile-description')).toHaveTextContent(locale === 'ar' ? 'بيعاً وإيجاراً' : 'sales and rentals');
    expect(footer?.querySelector('.public-site-footer__mobile-policy')).toHaveTextContent(locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy policy');
  });

  it('submits the selected transaction type and renders the data-backed all-properties card', () => {
    const data = publicHomepageDataSchema.parse({
      ...homepageData,
      totalPropertyCount: 93,
      categories: [{
        id: 'cccccccccccccccccccccccc',
        slug: 'villa',
        name: { en: 'Villa' },
        propertyCount: 7,
        order: 0
      }],
      metrics: [{
        key: 'housing_units',
        title: { en: 'Housing units' },
        value: 1200,
        order: 0
      }]
    });
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={data} />, { locale: 'en' });

    const transactionInput = result.container.querySelector<HTMLInputElement>('input[name="transactionType"]');
    expect(transactionInput).toHaveValue('sale');
    fireEvent.click(screen.getByRole('tab', { name: 'For rent' }));
    expect(transactionInput).toHaveValue('rent');
    expect(result.container.querySelector('.public-homepage__category-card--all')).toHaveAttribute('href', '/properties');
    expect(result.container.querySelector('.public-homepage__category-card--all')).toHaveTextContent('93 properties');
    const categories = result.container.querySelectorAll('.public-homepage__category-card:not(.public-homepage__category-card--all)');
    expect(categories).toHaveLength(1);
    expect(categories[0]).toHaveTextContent('7 properties');
    expect(categories[0]).toHaveAttribute('href', '/properties?propertyTypeId=cccccccccccccccccccccccc');
  });

  it('keeps homepage property metadata clean and aligns the developer identity', () => {
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={homepageData} />, { locale: 'en' });
    const card = result.container.querySelector('.public-homepage__property-card');

    expect(card?.querySelector('.ui-property-card__badges')).toBeNull();
    expect(card).not.toHaveTextContent('SDT-0567');
    expect(card).not.toHaveTextContent('Installment');
    expect(card?.querySelector('.public-homepage__source-logo > img')).toHaveAttribute('src', 'https://example.com/developer-logo.png');
    expect(card?.querySelector('.public-homepage__source-copy')).toHaveTextContent('Professional Development Company');
  });

  it('shows the comparison action on the homepage as soon as a property is selected', () => {
    window.localStorage.removeItem('sadat-property-comparison');
    renderWithLocale(<PublicHomepage locale="en" initialData={homepageData} />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: 'Add to compare' }));
    expect(screen.getByText('1 properties selected')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare now' })).toHaveAttribute('href', '/compare?lang=en&propertyIds=aaaaaaaaaaaaaaaaaaaaaaaa');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('link', { name: 'Compare now' })).not.toBeInTheDocument();
  });

  it('renders the hero district control from active admin-managed locations', () => {
    const data = publicHomepageDataSchema.parse({
      ...homepageData,
      locations: [
        { id: 'dddddddddddddddddddddddd', kind: 'location', slug: 'sadat-city', name: { en: 'Sadat City' }, order: 1 },
        { id: 'eeeeeeeeeeeeeeeeeeeeeeee', kind: 'neighborhood', slug: 'first-district', name: { en: 'First District' }, parentLocationId: 'dddddddddddddddddddddddd', order: 2 }
      ]
    });
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={data} />, { locale: 'en' });
    const locationSelect = result.container.querySelector<HTMLSelectElement>('select[name="locationId"]');

    expect(locationSelect).toHaveValue('');
    expect(locationSelect?.querySelector('option[value="eeeeeeeeeeeeeeeeeeeeeeee"]')).toHaveTextContent('First District — Sadat City');
    fireEvent.change(locationSelect!, { target: { value: 'eeeeeeeeeeeeeeeeeeeeeeee' } });
    expect(locationSelect).toHaveValue('eeeeeeeeeeeeeeeeeeeeeeee');
    expect(result.container.querySelector('input#public-homepage-search')).toHaveAttribute('name', 'search');
  });

  it('renders a truthful empty state and can retry the implemented loader', async () => {
    const load = vi.fn().mockResolvedValue(homepageData);
    renderWithLocale(<PublicHomepage locale="en" initialData={emptyData} load={load} />, { locale: 'en' });

    expect(screen.getByRole('status', { name: 'No published data yet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Published homes', level: 1 })).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps price optional and switches from purchase prices to a cleared rental budget', () => {
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={homepageData} />, { locale: 'en' });
    const form = result.container.querySelector<HTMLFormElement>('.public-homepage__search')!;
    expect(new FormData(form).has('minPrice')).toBe(false);
    expect(new FormData(form).has('maxPrice')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Price range: Price' }));
    expect(screen.getByRole('slider', { name: 'Maximum price — EGP' })).toHaveAttribute('max', '10000000');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minimum price (Optional)' }), { target: { value: '1000000' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum price (Optional)' }), { target: { value: '3000000' } });
    fireEvent.click(screen.getByRole('tab', { name: 'For rent' }));
    expect(new FormData(form).has('minPrice')).toBe(false);
    expect(new FormData(form).has('maxPrice')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Price range: Price' }));
    expect(screen.getByRole('slider', { name: 'Maximum price — EGP' })).toHaveAttribute('max', '100000');
  });

  it('submits both price endpoints to the listing query and supports manually entered budgets above the slider scale', () => {
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={homepageData} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('tab', { name: 'For rent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Price range: Price' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minimum price (Optional)' }), { target: { value: '5000' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum price (Optional)' }), { target: { value: '150000' } });
    expect(screen.getByRole('slider', { name: 'Maximum price — EGP' })).toHaveAttribute('max', '150000');
    const form = result.container.querySelector<HTMLFormElement>('.public-homepage__search')!;
    const params = new URLSearchParams([...new FormData(form).entries()].map(([key, value]) => [key, String(value)]));
    expect(parsePublicPropertySearchQuery(`/properties?${params}`)).toMatchObject({ transactionType: 'rent', minPrice: 5000, maxPrice: 150000 });
    fireEvent.click(screen.getByRole('button', { name: 'Clear price' }));
    expect(new FormData(form).has('minPrice')).toBe(false);
    expect(new FormData(form).has('maxPrice')).toBe(false);
  });

  it('prevents reversed and negative budgets and allows a single optional endpoint', () => {
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={homepageData} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: 'Price range: Price' }));
    const min = screen.getByRole('spinbutton', { name: 'Minimum price (Optional)' });
    const max = screen.getByRole('spinbutton', { name: 'Maximum price (Optional)' });
    fireEvent.change(min, { target: { value: '20000' } });
    fireEvent.change(max, { target: { value: '5000' } });
    expect(screen.getByRole('alert')).toHaveTextContent('minimum no higher than');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    const form = result.container.querySelector<HTMLFormElement>('.public-homepage__search')!;
    expect(form.querySelector('button[type="submit"]')).toBeDisabled();
    expect(fireEvent.submit(form)).toBe(false);
    fireEvent.change(max, { target: { value: '' } });
    expect(form.querySelector('button[type="submit"]')).not.toBeDisabled();
    expect(new FormData(form).get('minPrice')).toBe('20000');
    expect(new FormData(form).has('maxPrice')).toBe(false);
    fireEvent.change(min, { target: { value: '-1' } });
    expect(form.querySelector('button[type="submit"]')).toBeDisabled();
  });

  it('opens a mobile navigation panel with locale and account actions', () => {
    const result = renderWithLocale(<PublicHomepage locale="ar" initialData={emptyData} />, { locale: 'ar' });
    const mobileActions = result.container.querySelector('.public-homepage__mobile-actions');
    expect(mobileActions).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'فتح القائمة' }));
    expect(screen.getByRole('button', { name: 'إغلاق القائمة' })).toHaveAttribute('aria-expanded', 'true');
    expect(mobileActions).toHaveAttribute('aria-hidden', 'false');
    expect(mobileActions?.querySelector('a[href="/auth/login?lang=ar"]')).not.toBeNull();
    expect(mobileActions?.querySelector('a[href="/auth/register?lang=ar"]')).not.toBeNull();
    expect(mobileActions?.querySelector('[data-custom-locale-switcher="true"]')).not.toBeNull();
    expect(result.container.querySelector('.public-homepage__menu-backdrop.is-open')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
    expect(result.container.querySelector('.public-homepage__nav')).not.toHaveClass('is-open');
  });

  it('replaces anonymous actions with the authenticated customer account link', () => {
    const result = renderWithLocale(
      <PublicHomepage locale="en" authenticatedRole="seeker" initialData={emptyData} />,
      { locale: 'en' }
    );

    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create account' })).not.toBeInTheDocument();
    expect(result.container.querySelector('.public-homepage__actions a[href="/seeker?lang=en"]')).toHaveTextContent('My account');
  });

  it('renders loading and success states while reading the homepage contract', async () => {
    let resolve: (value: typeof homepageData) => void = () => undefined;
    const pending = new Promise<typeof homepageData>(value => {
      resolve = value;
    });
    const load = vi.fn(() => pending);
    renderWithLocale(<PublicHomepage locale="en" load={load} />, { locale: 'en' });

    expect(screen.getByRole('status', { name: 'Loading the homepage' })).toBeInTheDocument();
    resolve(homepageData);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Published homes', level: 1 })).toBeInTheDocument());
  });

  it('exposes retry for a network failure and recovers without a mock route', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(homepageData);
    renderWithLocale(<PublicHomepage locale="en" load={load} />, { locale: 'en' });

    await waitFor(() => expect(screen.getByRole('status', { name: 'The content service is unavailable' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Published homes', level: 1 })).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('renders a permission-safe state for a forbidden public response', async () => {
    const load = vi.fn().mockRejectedValue(new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }));
    renderWithLocale(<PublicHomepage locale="en" load={load} />, { locale: 'en' });

    await waitFor(() => expect(screen.getByRole('alert', { name: 'This content is unavailable' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Return to the public homepage' })).toHaveAttribute('href', '/');
  });
});
