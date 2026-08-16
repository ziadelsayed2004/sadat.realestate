import { fireEvent, screen, waitFor } from '@testing-library/react';
import { publicHomepageDataSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../src/features/contracts/index.ts';
import { PublicHomepage } from '../src/features/public/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const homepageData = publicHomepageDataSchema.parse({
  sections: [{
    key: 'hero',
    title: { ar: 'عقارات منشورة', en: 'Published homes', 'zh-CN': '已发布房产' },
    body: { en: 'Content supplied by the public homepage contract.' },
    order: 0
  }],
  properties: [{
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    slug: 'published-home',
    kind: 'property',
    name: { en: 'Published home' },
    transactionType: 'sale',
    area: { value: 120, unit: 'sqm' },
    layout: { bedrooms: 3, bathrooms: 2 },
    price: { amount: 1_250_000, currency: 'EGP' }
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
  properties: [],
  developers: [],
  content: [],
  banners: []
});

describe('public homepage', () => {
  it.each(['ar', 'en', 'zh-CN'] as const)('renders the contract projection for %s', (locale) => {
    const result = renderWithLocale(<PublicHomepage locale={locale} initialData={homepageData} />, { locale });

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    const heroTitle = locale === 'ar' ? 'عقارات منشورة' : locale === 'zh-CN' ? '已发布房产' : 'Published homes';
    expect(screen.getByRole('heading', { name: heroTitle, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Published home' })).toHaveAttribute('href', '/properties/published-home');
    expect(screen.getByRole('link', { name: 'Approved builder' })).toHaveAttribute('href', '/developers/approved-builder');
    expect(screen.getByText('Published article body.')).toBeInTheDocument();
    const brandLabel = locale === 'ar' ? 'عقارات السادات' : locale === 'zh-CN' ? '萨达特房地产' : 'Sadat Real Estate';
    expect(screen.getByRole('img', { name: brandLabel })).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('providerId');
    expect(result.container.textContent).not.toContain('audit');
  });

  it('renders a truthful empty state and can retry the implemented loader', async () => {
    const load = vi.fn().mockResolvedValue(homepageData);
    renderWithLocale(<PublicHomepage locale="en" initialData={emptyData} load={load} />, { locale: 'en' });

    expect(screen.getByRole('status', { name: 'No published data yet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Published homes', level: 1 })).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(1);
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
