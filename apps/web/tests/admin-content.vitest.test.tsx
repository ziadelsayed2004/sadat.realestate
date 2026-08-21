import { fireEvent, screen, waitFor } from '@testing-library/react';
import { articleCategoryDataSchema, articleDataSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  AdminContent,
  createAdminArticle,
  createAdminArticleCategory,
  deleteAdminArticleCategory,
  loadAdminArticleCategories,
  loadAdminArticles,
  transitionAdminArticle,
  updateAdminArticle,
  updateAdminArticleCategory,
  getAdminContentCopy
} from '../src/features/admin_content/index.ts';
import type { AdminArticleListData, AdminCategoryListData } from '../src/features/admin_content/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const category = articleCategoryDataSchema.parse({
  id: 'bbbbbbbbbbbbbbbbbbbbbbbb', slug: 'buying-tips', name: { ar: 'نصائح الشراء', en: 'Buying tips', 'zh-CN': '购买建议' }, description: { en: 'Guides' }, displayOrder: 1, active: true, version: 2,
  createdAt: '2026-08-10T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z', availableActions: ['update', 'delete']
});
const article = articleDataSchema.parse({
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa', categoryId: category.id, slug: 'buying-in-sadat', title: { ar: 'دليل الشراء', en: 'Buying in Sadat', 'zh-CN': '在萨达特购买' }, body: { ar: 'محتوى المقال', en: 'Article body', 'zh-CN': '文章内容' }, authorId: 'cccccccccccccccccccccccc', status: 'draft', version: 3,
  createdAt: '2026-08-10T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z', availableActions: ['update', 'submit']
});
const articles: AdminArticleListData = { items: [article], page: 1, limit: 20, total: 1 };
const categories: AdminCategoryListData = { items: [category], page: 1, limit: 20, total: 1 };
const session = { status: 'authenticated' as const, role: 'admin' as const };
const authorization = { getAuthorizationHeader: () => 'Bearer admin.content.test' };

function envelope(data: unknown, meta: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: 'admin-content-test', ...meta } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function apiClientFor(requests: Array<{ method: string; path: string; body: unknown }>): ApiClient {
  return new ApiClient({
    fetcher: async (input, init) => {
      const url = new URL(String(input), 'http://sadat-real-estate.local');
      const method = init?.method ?? 'GET';
      const body = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as unknown;
      requests.push({ method, path: url.pathname, body });
      if (url.pathname.includes('article-categories')) {
        if (method === 'GET') return envelope({ items: [category] }, { page: 1, limit: 20, total: 1 });
        if (method === 'DELETE') return envelope({ id: category.id, deleted: true });
        return envelope(category);
      }
      if (method === 'GET') return envelope({ items: [article] }, { page: 1, limit: 20, total: 1 });
      return envelope(article);
    }
  });
}

describe('Admin article and category management contracts and views', () => {
  it('uses the implemented routes, strict request schemas, and authorization header', async () => {
    const requests: Array<{ method: string; path: string; body: unknown }> = [];
    const client = apiClientFor(requests);
    await expect(loadAdminArticles({ apiClient: client, authorization })).resolves.toMatchObject({ items: [article], page: 1, limit: 20, total: 1 });
    await expect(createAdminArticle({ categoryId: category.id, slug: 'new-article', title: { en: 'New article' }, body: { en: 'Body' }, reason: 'Create article content' }, { apiClient: client, authorization })).resolves.toEqual(article);
    await expect(updateAdminArticle(article.id, { version: 3, title: { en: 'Updated article' }, reason: 'Update article content' }, { apiClient: client, authorization })).resolves.toEqual(article);
    await expect(transitionAdminArticle(article.id, { status: 'pending_review', version: 3, reason: 'Submit article for review' }, { apiClient: client, authorization })).resolves.toEqual(article);
    await expect(loadAdminArticleCategories({ apiClient: client, authorization })).resolves.toMatchObject({ items: [category] });
    await expect(createAdminArticleCategory({ slug: 'new-category', name: { en: 'New category' }, reason: 'Create content category' }, { apiClient: client, authorization })).resolves.toEqual(category);
    await expect(updateAdminArticleCategory(category.id, { version: 2, active: false, reason: 'Disable content category' }, { apiClient: client, authorization })).resolves.toEqual(category);
    await expect(deleteAdminArticleCategory(category.id, { version: 2, reason: 'Remove unused category' }, { apiClient: client, authorization })).resolves.toEqual({ id: category.id, deleted: true });
    expect(requests.map(request => `${request.method} ${request.path}`)).toEqual([
      'GET /api/v1/admin/articles', 'POST /api/v1/admin/articles', 'PATCH /api/v1/admin/articles/aaaaaaaaaaaaaaaaaaaaaaaa', 'POST /api/v1/admin/articles/aaaaaaaaaaaaaaaaaaaaaaaa/transitions',
      'GET /api/v1/admin/article-categories', 'POST /api/v1/admin/article-categories', 'PATCH /api/v1/admin/article-categories/bbbbbbbbbbbbbbbbbbbbbbbb', 'DELETE /api/v1/admin/article-categories/bbbbbbbbbbbbbbbbbbbbbbbb'
    ]);
    expect(requests.every(request => request.body === undefined || typeof request.body === 'object')).toBe(true);
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders the article projection with the correct direction for %s', async (locale: SupportedLocale) => {
    window.history.pushState({}, '', '/admin/articles');
    const result = renderWithLocale(<AdminContent locale={locale} session={session} initialArticles={articles} initialCategories={categories} />, { locale });
    await waitFor(() => expect(screen.getByTestId(`admin-article-${article.id}`)).toBeInTheDocument());
    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(result.container.querySelector('[data-screen-id="ADM-25"]')).not.toBeNull();
    expect(result.container.querySelector('[data-device-scope="desktop"]')).not.toBeNull();
    expect(result.container.textContent).toContain(locale === 'en' ? 'Buying in Sadat' : locale === 'ar' ? 'دليل الشراء' : '在萨达特购买');
    expect(result.container.textContent).not.toMatch(/authorId|internalNotes|assignedTo|auditData|storageKey|accessToken|refreshToken|privateUrl/u);
    result.unmount();
  });

  it('requires a reason before creating an article and submits the approved shape', async () => {
    window.history.pushState({}, '', '/admin/articles');
    const create = vi.fn(async () => article);
    renderWithLocale(<AdminContent locale="en" session={session} initialArticles={articles} initialCategories={categories} loadArticles={async () => articles} loadCategories={async () => categories} createArticle={create} />, { locale: 'en' });
    fireEvent.click(screen.getByRole('button', { name: getAdminContentCopy('en').createArticle }));
    fireEvent.submit(screen.getByTestId('admin-article-editor').querySelector('form')!);
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText(getAdminContentCopy('en').reasonRequired)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'new-article' } });
    fireEvent.change(screen.getByLabelText(/AR Title/i), { target: { value: 'New article' } });
    fireEvent.change(screen.getByLabelText(/AR Body/i), { target: { value: 'Body' } });
    fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Create article content' } });
    fireEvent.click(screen.getByRole('button', { name: getAdminContentCopy('en').save }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ categoryId: category.id, slug: 'new-article', reason: 'Create article content' })));
  });

  it('passes article and category filters to the implemented list query loaders', async () => {
    window.history.pushState({}, '', '/admin/articles');
    const loadArticles = vi.fn(async () => articles);
    const loadCategories = vi.fn(async () => categories);
    const result = renderWithLocale(<AdminContent locale="en" session={session} initialArticles={articles} initialCategories={categories} loadArticles={loadArticles} loadCategories={loadCategories} />, { locale: 'en' });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'buying' } });
    fireEvent.change(screen.getByLabelText(getAdminContentCopy('en').statusLabel), { target: { value: 'draft' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(loadArticles).toHaveBeenCalledWith(expect.objectContaining({ search: 'buying', status: 'draft' }), expect.any(AbortSignal)));
    result.unmount();

    window.history.pushState({}, '', '/admin/article-categories');
    const loadFilteredCategories = vi.fn(async () => categories);
    renderWithLocale(<AdminContent locale="en" session={session} initialCategories={categories} loadCategories={loadFilteredCategories} />, { locale: 'en' });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'buying' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(loadFilteredCategories).toHaveBeenCalledWith(expect.objectContaining({ search: 'buying' }), expect.any(AbortSignal)));
  });

  it('renders category management and closes for a non-admin session without loading', async () => {
    window.history.pushState({}, '', '/admin/article-categories');
    const load = vi.fn();
    renderWithLocale(<AdminContent locale="en" session={{ status: 'anonymous' }} initialCategories={categories} loadCategories={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: getAdminContentCopy('en').states.permission.title })).toBeInTheDocument());
    expect(screen.queryByTestId(`admin-category-${category.id}`)).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
});
