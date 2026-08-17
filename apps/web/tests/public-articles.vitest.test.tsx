import { fireEvent, screen, waitFor } from '@testing-library/react';
import { articlePublicListDataSchema, articlePublicSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  PublicArticleDetails,
  PublicArticles,
  getPublicArticlesCopy,
  loadPublicArticleCategories,
  parsePublicArticleListQuery,
  publicArticleListUrl,
  publicArticleUrl,
  type PublicArticleCategoryOption
} from '../src/features/content/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const articleListData = articlePublicListDataSchema.parse([
  {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    slug: 'buying-in-sadat',
    title: { en: 'Buying in Sadat City', ar: 'Buying in Sadat City' },
    body: { en: 'A practical guide to published homes and the questions buyers should ask before booking.', ar: 'A practical guide to published homes.' },
    seoTitle: { en: 'Buying in Sadat City' },
    seoDescription: { en: 'A practical buying guide.' },
    publishedAt: '2026-08-01T10:00:00+00:00'
  },
  {
    id: 'cccccccccccccccccccccccc',
    categoryId: 'dddddddddddddddddddddddd',
    slug: 'rental-tips',
    title: { en: 'Rental tips' },
    body: { en: 'A short rental checklist.' },
    publishedAt: '2026-07-20T10:00:00+00:00'
  }
]);

const article = articlePublicSchema.parse(articleListData[0]);
const categories: readonly PublicArticleCategoryOption[] = [
  { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: { en: 'Buying tips' } },
  { id: 'dddddddddddddddddddddddd', name: { en: 'Rental tips' } }
];

describe('public article listing and details', () => {
  it('parses the bounded query and keeps category/page controls on the public route', () => {
    const query = parsePublicArticleListQuery('/articles?categoryId=bbbbbbbbbbbbbbbbbbbbbbbb&page=2&limit=40&%24where=true', 'en');

    expect(query).toMatchObject({ locale: 'en', categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb', page: 2, limit: 40 });
    expect(publicArticleListUrl(query)).toBe('/articles?categoryId=bbbbbbbbbbbbbbbbbbbbbbbb&page=2&limit=40');
    expect(publicArticleUrl(article.slug)).toBe('/articles/buying-in-sadat');
  });

  it('loads active category metadata through the versioned public API contract', async () => {
    let requestInput = '';
    const client = new ApiClient({
      fetcher: async (input) => {
        requestInput = String(input);
        return new Response(JSON.stringify({
          data: [{ id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'buying-tips', name: { en: 'Buying tips' } }],
          meta: { requestId: 'article-category-request' }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    });

    await expect(loadPublicArticleCategories({ locale: 'en', apiClient: client })).resolves.toEqual([
      { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'buying-tips', name: { en: 'Buying tips' } }
    ]);
    expect(requestInput).toBe('/api/v1/public/article-categories?locale=en');
  });

  it('uses fetched or embedded safe category metadata without blocking article results', async () => {
    const loadCategories = vi.fn().mockResolvedValue(categories);
    renderWithLocale(
      <PublicArticles locale="en" initialData={articleListData} loadCategories={loadCategories} />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Buying tips' })).toBeInTheDocument());
    expect(loadCategories).toHaveBeenCalledWith('en', expect.any(AbortSignal));

    const embedded = articlePublicSchema.parse({
      ...article,
      category: {
        id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        slug: 'buying-tips',
        name: { en: 'Embedded buying tips' }
      }
    });
    renderWithLocale(
      <PublicArticleDetails locale="en" url="/articles/buying-in-sadat" initialData={embedded} />,
      { locale: 'en' }
    );
    expect(screen.getByText('Embedded buying tips')).toBeInTheDocument();
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders the public projection and locale direction for %s', locale => {
    const result = renderWithLocale(<PublicArticles locale={locale} initialData={articleListData} categories={categories} />, { locale });
    const copy = getPublicArticlesCopy(locale);

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buying in Sadat City' })).toHaveAttribute('href', '/articles/buying-in-sadat');
    expect(screen.getAllByText('Buying tips').length).toBeGreaterThan(0);
    expect(result.container.querySelector('[data-state="missing_image"]')).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('authorId');
    expect(result.container.textContent).not.toContain('coverAssetId');
  });

  it('filters the current published projection and retries network failures', async () => {
    window.history.replaceState({}, '', '/articles');
    const load = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }))
      .mockResolvedValue(articleListData);
    const copy = getPublicArticlesCopy('en');
    renderWithLocale(<PublicArticles locale="en" categories={categories} load={load} />, { locale: 'en' });

    await waitFor(() => expect(screen.getByRole('status', { name: copy.retryTitle })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Buying in Sadat City' })).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'rental' } });
    expect(screen.queryByRole('link', { name: 'Buying in Sadat City' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rental tips' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Buying tips' }));
    await waitFor(() => expect(load).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'bbbbbbbbbbbbbbbbbbbbbbbb', page: 1 }), expect.any(AbortSignal)));
    expect(window.location.search).toContain('categoryId=bbbbbbbbbbbbbbbbbbbbbbbb');
  });

  it('keeps forbidden listing and missing detail responses safe', async () => {
    const copy = getPublicArticlesCopy('en');
    const permissionLoad = vi.fn().mockRejectedValue(new ApiClientError('forbidden', { code: 'HTTP_ERROR', status: 403 }));
    renderWithLocale(<PublicArticles locale="en" load={permissionLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('alert', { name: copy.permissionTitle })).toBeInTheDocument());

    const notFoundLoad = vi.fn().mockRejectedValue(new ApiClientError('missing', { code: 'HTTP_ERROR', status: 404 }));
    renderWithLocale(<PublicArticleDetails locale="en" url="/articles/missing-article" load={notFoundLoad} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.notFoundTitle, level: 1 })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: copy.notFoundLink })).toHaveAttribute('href', '/articles');
  });

  it('renders details, related content, and an explicit unavailable-image state', () => {
    const result = renderWithLocale(<PublicArticleDetails locale="en" url="/articles/buying-in-sadat" initialData={article} relatedArticles={articleListData} categories={categories} />, { locale: 'en' });

    expect(screen.getByRole('heading', { name: 'Buying in Sadat City', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Article content', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Related articles', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rental tips' })).toHaveAttribute('href', '/articles/rental-tips');
    expect(result.container.querySelector('[data-state="missing_image"]')).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('authorId');
  });
});
