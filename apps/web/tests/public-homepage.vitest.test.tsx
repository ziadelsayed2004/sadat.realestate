import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { publicHomepageDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../src/features/contracts/index.ts';
import { PublicHomepage } from '../src/features/public/index.ts';
import { PublicMediaImage } from '../src/features/public/components.tsx';
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
  it('links root categories to their category filter and leaves types linked to their type filter', () => {
    const data = { ...homepageData, categories: [
      { id: 'c'.repeat(24), kind: 'category' as const, slug: 'soso', name: { en: 'soso' }, propertyCount: 0, order: 71 },
      { id: 'd'.repeat(24), slug: 'type', name: { en: 'Specific type' }, propertyCount: 1, order: 72 }
    ] };
    renderWithLocale(<PublicHomepage locale="en" initialData={data} />, { locale: 'en' });
    expect(screen.getByRole('link', { name: /soso/ })).toHaveAttribute('href', `/properties?propertyCategoryId=${'c'.repeat(24)}&lang=en`);
    expect(screen.getByRole('link', { name: /Specific type/ })).toHaveAttribute('href', `/properties?propertyTypeId=${'d'.repeat(24)}&lang=en`);
    expect(screen.getByRole('button', { name: 'Next categories' })).toHaveAttribute('aria-controls', 'homepage-category-rail');
  });

  it.each([
    ['/?notice=ad-request-sent&lang=en', 'Track my requests'],
    ['/?providerApplication=submitted&lang=en', 'Track application status']
  ])('dismisses the confirmation after exactly ten seconds for %s', (url, action) => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', url);
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={homepageData} />, { locale: 'en' });
    try {
      expect(screen.getByRole('link', { name: action })).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(9999); });
      expect(screen.getByRole('link', { name: action })).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(1); });
      expect(screen.queryByRole('link', { name: action })).not.toBeInTheDocument();
    } finally { result.unmount(); vi.useRealTimers(); window.history.replaceState({}, '', '/'); }
  });

  it('separates success text, tracking action and dismiss control', async () => {
    window.history.replaceState({}, '', '/?notice=ad-request-sent&lang=ar');
    const result = renderWithLocale(<PublicHomepage locale="ar" initialData={homepageData} />, { locale: 'ar' });
    const action = await screen.findByRole('link', { name: 'متابعة طلباتي' });
    expect(action.closest('.ui-toast__action')).toBeInTheDocument();
    expect(result.container.querySelector('.ui-toast__content > p')).not.toContainElement(action);
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق رسالة النجاح' }));
    expect(screen.queryByRole('link', { name: 'متابعة طلباتي' })).not.toBeInTheDocument();
  });

  it('keeps a featured promotion out of the hero when there is no managed hero banner', () => {
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [{ key: 'featured_aaaaaaaaaaaaaaaaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbb', presentation: 'featured', title: { en: 'Featured promotion only' }, imageUrl: '/featured-only.jpg', targetUrl: '/properties', order: 0 }] });
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={data} />, { locale: 'en' });
    expect(result.container.querySelector('.public-homepage__banner-card img')).toHaveAttribute('src', '/featured-only.jpg');
    expect(result.container.querySelector('.public-homepage__hero-media img[src="/featured-only.jpg"]')).toBeNull();
    expect(result.container.querySelector('.public-homepage__hero h1')).toHaveTextContent('Published homes');
  });
  it.each(['ar', 'en'] as const)('uses the administrator introduction above the hero heading in %s', locale => {
    const eyebrow = { ar: 'عنوان مقدمة من الإدارة', en: 'Administrator introduction' };
    const data = publicHomepageDataSchema.parse({ ...homepageData, sections: homepageData.sections.map(section => ({ ...section, eyebrow })) });
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={data} />, { locale });
    expect(result.container.querySelector('.public-homepage__hero-heading .public-homepage__eyebrow')).toHaveTextContent(eyebrow[locale]);
  });
  it('requests bounded property previews while preserving external signed image URLs', () => {
    const src = `/api/v1/public/properties/${'a'.repeat(24)}/media/${'b'.repeat(24)}/content`;
    const result = renderWithLocale(<PublicMediaImage src={src} alt="Preview" fallback={null} />, { locale: 'en' });
    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('src', `${src}?width=960`);
    result.rerender(<PublicMediaImage src={`${src}?width=320&version=2`} previewWidth={1600} loading="eager" alt="Preview" fallback={null} />);
    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('src', `${src}?width=1600&version=2`);
    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('loading', 'eager');
    result.rerender(<PublicMediaImage src="https://example.com/image.jpg?signature=abc" alt="Preview" fallback={null} />);
    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('src', 'https://example.com/image.jpg?signature=abc');
  });
  it('does not keep a replacement image hidden after an earlier URL failed', () => {
    const result = renderWithLocale(<PublicMediaImage src="/unavailable.jpg" alt="Property" fallback={<span>Image unavailable</span>} />, { locale: 'en' });
    fireEvent.error(screen.getByRole('img', { name: 'Property' }));
    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    result.rerender(<PublicMediaImage src="/replacement.jpg" alt="Property" fallback={<span>Image unavailable</span>} />);
    expect(screen.getByRole('img', { name: 'Property' })).toHaveAttribute('src', '/replacement.jpg');
    expect(screen.queryByText('Image unavailable')).not.toBeInTheDocument();
  });
  it('gives new property types a default template and preserves supplied images', () => {
    const categories = [
      { id: 'c'.repeat(24), slug: 'new-type', name: { en: 'New type' }, propertyCount: 0, order: 100 },
      { id: 'd'.repeat(24), slug: 'custom-type', name: { en: 'Custom type' }, imageUrl: 'https://example.com/custom.jpg', propertyCount: 0, order: 101 }
    ];
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={publicHomepageDataSchema.parse({ ...homepageData, categories })} />, { locale: 'en' });
    const cards = result.container.querySelectorAll('.public-homepage__category-card:not(.public-homepage__category-card--all)');
    expect(cards[0]?.querySelector('img')).toHaveAttribute('src', '/assets/sadat-real-estate-logo.png');
    expect(cards[1]?.querySelector('img')).toHaveAttribute('src', 'https://example.com/custom.jpg');
    expect(screen.queryByRole('link', { name: /Sadat gate photo/ })).not.toBeInTheDocument();
  });
  it.each(['ar', 'en'] as const)('makes only the promotion CTA a link and preserves its selected owned project destination in %s', locale => {
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [...homepageData.banners, { key: 'featured_project', presentation: 'featured', title: { en: 'Published project' }, targetUrl: '/developers/approved-builder#project-owned-project', order: 1 }] });
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={data} />, { locale });
    const card = result.container.querySelector('.public-homepage__banner-card')!;
    expect(card.querySelectorAll('a')).toHaveLength(1);
    expect(card.querySelector('a')).toHaveAttribute('href', `/developers/approved-builder?lang=${locale}#project-owned-project`);
    expect(card.querySelector('h2')?.closest('a')).toBeNull();
    expect(card.querySelector('.public-homepage__banner-media-wrapper')?.closest('a')).toBeNull();
  });
  it.each(['/developers/approved-builder?source=ad#developer-projects', 'https://example.com/campaign?source=ad'])('preserves administrator-selected promotional destinations: %s', targetUrl => {
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [...homepageData.banners, { key: 'featured_custom', presentation: 'featured', title: { en: 'Custom promotion' }, targetUrl, order: 1 }] });
    const result = renderWithLocale(<PublicHomepage locale="ar" initialData={data} />, { locale: 'ar' });
    if (targetUrl.startsWith('/')) expect(result.container.querySelector('.public-homepage__banner-cta')).toHaveAttribute('href', '/developers/approved-builder?source=ad&lang=ar#developer-projects');
    else expect(result.container.querySelector('.public-homepage__banner-cta')).toBeNull();
  });
  it('rotates multiple featured cards on their timer, supports arrows and dots, and renders no demo replacement', async () => {
    vi.useFakeTimers();
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [{ key: 'featured_first', presentation: 'featured', title: { en: 'First card' }, order: 0, displaySeconds: 3 }, { key: 'featured_second', presentation: 'featured', title: { en: 'Second card' }, order: 1, displaySeconds: 6 }] });
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={data} load={async () => data} />, { locale: 'en' });
    try {
      expect(screen.getByRole('heading', { name: 'First card' })).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(9999));
      expect(screen.getByRole('heading', { name: 'First card' })).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByRole('heading', { name: 'Second card' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Previous banner' }));
      expect(screen.getByRole('heading', { name: 'First card' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Slide 2' }));
      expect(screen.getByRole('button', { name: 'Slide 2' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('heading', { name: 'Second card' })).toBeInTheDocument();
      fireEvent.mouseEnter(result.container.querySelector('#homepage-featured')!);
      fireEvent.focus(screen.getByRole('button', { name: 'Next banner' }));
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(screen.getByRole('heading', { name: 'First card' })).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(screen.getByRole('heading', { name: 'Second card' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Next banner' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next banner' }));
      expect(screen.getByRole('heading', { name: 'Second card' })).toBeInTheDocument();
    } finally { result.unmount(); vi.useRealTimers(); }
    const empty = renderWithLocale(<PublicHomepage locale="en" initialData={{ ...homepageData, banners: [] }} />, { locale: 'en' });
    expect(empty.container.querySelector('#homepage-featured')).toBeNull();
  });
  it('opens the exact published featured card selected by an administrative view link', async () => {
    const id = 'a'.repeat(24);
    window.history.replaceState({}, '', `/?lang=en&featuredAd=${id}#homepage-featured`);
    const data = { ...homepageData, banners: [{ key: 'featured_other', presentation: 'featured' as const, title: { en: 'Other card' }, order: 0 }, { key: `featured_${id}_${'b'.repeat(24)}`, presentation: 'featured' as const, title: { en: 'Selected saved card' }, order: 1 }] };
    renderWithLocale(<PublicHomepage locale="en" initialData={data} load={async () => data} />, { locale: 'en' });
    expect(await screen.findByRole('heading', { name: 'Selected saved card' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Other card' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Previous banner' }));
    expect(screen.getByRole('heading', { name: 'Other card' })).toBeVisible();
    window.history.replaceState({}, '', '/');
  });
  it('keeps the outgoing hero photograph for the transition and makes pagination keyboard accessible', async () => {
    vi.useFakeTimers();
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [
      { key: 'banner_first', title: { en: 'First hero' }, imageUrl: '/first.jpg', order: 0 },
      { key: 'banner_second', title: { en: 'Second hero' }, imageUrl: '/second.jpg', order: 1 }
    ] });
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={data} load={async () => data} />, { locale: 'en' });
    try {
      const images = result.container.querySelectorAll('.public-homepage__hero-image');
      images.forEach(image => fireEvent.load(image));
      const dot = screen.getByRole('button', { name: 'Image 2' });
      fireEvent.click(dot);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Second hero');
      expect(dot).toHaveAttribute('aria-pressed', 'true');
      expect(images[0]).toHaveAttribute('data-exiting');
      expect(images[0]).not.toHaveAttribute('hidden');
      await act(() => vi.advanceTimersByTimeAsync(650));
      expect(images[0]).toHaveAttribute('hidden');
      expect(images[1]).toHaveAttribute('data-active');
    } finally { result.unmount(); vi.useRealTimers(); }
  });
  it('keeps the featured timer running across background data refreshes and hides controls for one card', async () => {
    vi.useFakeTimers();
    const banners = [{ key: 'featured_first', presentation: 'featured' as const, title: { en: 'First card' }, order: 0 }, { key: 'featured_second', presentation: 'featured' as const, title: { en: 'Second card' }, order: 1 }];
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={{ ...homepageData, banners }} />, { locale: 'en' });
    try {
      await act(() => vi.advanceTimersByTimeAsync(5000));
      result.rerender(<PublicHomepage locale="en" initialData={{ ...homepageData, banners: [...banners] }} />);
      await act(() => vi.advanceTimersByTimeAsync(5000));
      expect(screen.getByRole('heading', { name: 'Second card' })).toBeInTheDocument();
    } finally { result.unmount(); vi.useRealTimers(); }
    const single = renderWithLocale(<PublicHomepage locale="en" initialData={{ ...homepageData, banners: banners.slice(0, 1) }} />, { locale: 'en' });
    expect(single.container.querySelector('#homepage-featured')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next banner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous banner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Banner selection' })).not.toBeInTheDocument();
  });
  it.each(['ar', 'en'] as const)('displays the managed banner title over its image instead of the old homepage heading in %s', locale => {
    const title = { ar: 'حبيبة مجدي مديرة المبيعات', en: 'Habiba Magdy sales manager' };
    const data = publicHomepageDataSchema.parse({ ...homepageData, banners: [{ key: 'banner_aaaaaaaaaaaaaaaaaaaaaaaa', title, body: { ar: 'نص الإعلان المعدل', en: 'Edited advertisement description' }, altText: { en: 'Description of the banner image' }, imageUrl: 'https://example.com/new-banner.jpg', order: 0 }] });
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={data} />, { locale });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title[locale]);
    expect(screen.getByText(locale === 'ar' ? 'نص الإعلان المعدل' : 'Edited advertisement description')).toBeInTheDocument();
    expect(result.container.querySelector('.public-homepage__hero')).toHaveClass('public-homepage__hero--advertisement');
    expect(result.container.querySelector('.public-homepage__hero-media img')).toHaveAttribute('src', 'https://example.com/new-banner.jpg');
    expect(result.container.querySelector('.public-homepage__hero-media img')).toHaveAttribute('alt', 'Description of the banner image');
  });

  it('refreshes timed banners without replacing the search form, and retains the page if background refresh fails', async () => {
    vi.useFakeTimers();
    const title = 'A scheduled banner';
    const category = { id: 'f'.repeat(24), slug: 'new-category', name: { en: 'Newly added category' }, propertyCount: 0, order: 100 };
    const load = vi.fn().mockResolvedValueOnce({ ...homepageData, categories: [category], banners: [{ key: 'banner_aaaaaaaaaaaaaaaaaaaaaaaa', title: { en: title }, imageUrl: 'https://example.com/timed.jpg', order: 0 }] })
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce({ ...homepageData, banners: [] });
    const result = renderWithLocale(<PublicHomepage locale="en" initialData={homepageData} load={load} />, { locale: 'en' });
    try {
      fireEvent.click(screen.getByRole('tab', { name: 'For rent' }));
      const searchForm = result.container.querySelector('.public-homepage__hero form');
      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
      expect(screen.getByRole('link', { name: /Newly added category/ })).toHaveAttribute('href', `/properties?propertyTypeId=${category.id}&lang=en`);
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
    expect(categories[0]).toHaveAttribute('href', '/properties?propertyTypeId=cccccccccccccccccccccccc&lang=en');
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

  it.each(['ar', 'en'] as const)('submits installment preferences without a kind selector from the homepage in %s', locale => {
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={homepageData} />, { locale });
    const form = result.container.querySelector<HTMLFormElement>('.public-homepage__search')!;
    expect(form.querySelector('input[name="kind"]')).toBeNull();
    fireEvent.click(form.querySelector('input[name="installmentAvailable"]')!);
    const params = new URLSearchParams([...new FormData(form).entries()].map(([key, value]) => [key, String(value)]));
    expect(params.get('lang')).toBe(locale);
    expect(parsePublicPropertySearchQuery(`/properties?${params}`)).toMatchObject({ installmentAvailable: true, transactionType: 'sale' });
    fireEvent.click(form.querySelector('input[name="installmentAvailable"]')!);
    expect(new FormData(form).has('installmentAvailable')).toBe(false);
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
