import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommunityCategoryManager } from '../src/features/admin_community/category-manager.tsx';
import { useCommunityCategories } from '../src/features/community/categories.ts';

afterEach(() => vi.unstubAllGlobals());
const key = 'custom_' + 'c'.repeat(24);
const initial = [{ key: 'question', label: { ar: 'سؤال', en: 'Question' } }, { key, label: { ar: 'أخبار المدينة', en: 'City news' } }];
const envelope = (items: unknown) => new Response(JSON.stringify({ data: { items }, meta: { requestId: 'category-test' } }), { headers: { 'Content-Type': 'application/json' } });
function Choices() { const items = useCommunityCategories('en'); return <output data-testid="choices">{items?.map(item => item.label).join(', ')}</output>; }

it.each(['ar', 'en'] as const)('deletes the selected category after a reason and updates every mounted category list in %s', async locale => {
  let items = [...initial]; const deletes: { url: string; json: unknown; authorization: unknown }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (options?.method === 'DELETE') {
      deletes.push({ url: String(url), json: JSON.parse(options.body), authorization: new Headers(options.headers).get('authorization') });
      items = items.filter(item => item.key !== key);
    }
    return envelope(items);
  }));
  render(<><CommunityCategoryManager locale={locale} authClient={{ getAuthorizationHeader: () => 'Bearer admin-category-test' }} /><Choices /></>);
  fireEvent.click(screen.getByText(locale === 'ar' ? 'تصنيفات المجتمع — إضافة وحذف التصنيفات' : 'Community categories — add and delete categories'));
  const remove = await screen.findByRole('button', { name: locale === 'ar' ? 'حذف أخبار المدينة' : 'Delete City news' });
  fireEvent.click(remove);
  expect(deletes).toHaveLength(0);
  fireEvent.change(screen.getByLabelText(locale === 'ar' ? 'سبب حذف التصنيف' : 'Category deletion reason'), { target: { value: 'Remove obsolete choice' } });
  fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'تأكيد حذف التصنيف' : 'Confirm category deletion' }));
  await waitFor(() => expect(remove).not.toBeInTheDocument());
  expect(deletes).toEqual([{ url: expect.stringContaining(`/admin/community/categories/${key}`), json: { reason: 'Remove obsolete choice', confirm: true }, authorization: 'Bearer admin-category-test' }]);
  expect(screen.getByTestId('choices')).toHaveTextContent('Question');
  expect(screen.getByTestId('choices')).not.toHaveTextContent('City news');
  expect(screen.getByText(locale === 'ar' ? /المنشورات القديمة محفوظة/ : /Existing posts are preserved/)).toBeInTheDocument();
});

it('keeps the category and deletion reason on failure and supports cancelling without a request', async () => {
  const fetcher = vi.fn(async (_url, options) => options?.method === 'DELETE' ? new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Denied', messageKey: 'errors.forbidden', requestId: 'denied' } }), { status: 403, headers: { 'Content-Type': 'application/json' } }) : envelope(initial));
  vi.stubGlobal('fetch', fetcher);
  render(<CommunityCategoryManager locale="en" authClient={{ getAuthorizationHeader: () => 'Bearer admin' }} />);
  fireEvent.click(screen.getByText('Community categories — add and delete categories'));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Question' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(fetcher.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Delete Question' }));
  fireEvent.change(screen.getByLabelText('Category deletion reason'), { target: { value: 'Remove unused default' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm category deletion' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('permission'));
  expect(screen.getByLabelText('Category deletion reason')).toHaveValue('Remove unused default');
  expect(screen.getByRole('button', { name: 'Delete Question' })).toBeInTheDocument();
});
