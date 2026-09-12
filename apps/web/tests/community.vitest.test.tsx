import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  communityPublicPostDetailDataSchema,
  communityPublicPostListDataSchema
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '../src/features/contracts/index.ts';
import {
  PublicCommunity,
  getCommunityCopy,
  loadPublicCommunity,
  type CommunityMutationApi
} from '../src/features/community/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const post = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  title: 'A published community question',
  body: 'A safe public community post body.',
  category: 'question' as const,
  likeCount: 24,
  dislikeCount: 2,
  createdAt: '2026-08-01T10:00:00+00:00',
  commentCount: 1
};

const listData = communityPublicPostListDataSchema.parse({ items: [post], page: 1, limit: 20, total: 1 });
const detailData = communityPublicPostDetailDataSchema.parse({
  post,
  comments: [{
    id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    postId: post.id,
    body: 'A visible public comment.',
    depth: 0,
    createdAt: '2026-08-02T10:00:00+00:00'
  }]
});

describe('public community feed and post creation', () => {
  it.each(['ar', 'en'] as const)('uses API presentation and category for real and legacy IDs in %s', locale => {
    const items = ['1234567890abcdef12345678', 'aaaaaaaaaaaaaaaaaaaaaaaa'].map((id, index) => ({
      ...post, id, title: `API post ${index}`, category: 'advice' as const,
      authorName: { ar: 'كاتب من البيانات', en: 'API author' },
      likeCount: 7, dislikeCount: 3, commentCount: 5,
    }));
    const result = renderWithLocale(<PublicCommunity locale={locale} initialData={{ items, total: 2, page: 1, limit: 20 }} />, { locale });
    for (const card of result.container.querySelectorAll('.public-community__card')) {
      expect(card).toHaveAttribute('data-category', 'advice');
      expect(card.querySelector('.public-community__author strong')).toHaveTextContent(locale === 'ar' ? 'كاتب من البيانات' : 'API author');
      expect(Array.from(card.querySelectorAll('.public-community__stat')).map(item => item.textContent)).toEqual(['7', '3', '5']);
      expect(card.querySelector('time')).toHaveAttribute('dateTime', post.createdAt);
    }
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'نصيحة' : 'Advice' }));
    expect(result.container.querySelectorAll('.public-community__card')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: locale === 'ar' ? 'سؤال' : 'Question' }));
    expect(result.container.querySelectorAll('.public-community__card')).toHaveLength(0);
    const empty = screen.getByRole('region', { name: getCommunityCopy(locale).emptyTitle });
    expect(empty).toBeInTheDocument();
    fireEvent.click(within(empty).getByRole('button', { name: getCommunityCopy(locale).retryLabel }));
    expect(result.container.querySelectorAll('.public-community__card')).toHaveLength(2);
  });

  it('loads the implemented versioned public route and keeps the safe projection', async () => {
    let requestInput = '';
    const client = new ApiClient({
      fetcher: async input => {
        requestInput = String(input);
        return new Response(JSON.stringify({ data: listData, meta: { requestId: 'community-request' } }), { status: 200 });
      }
    });

    await expect(loadPublicCommunity({ apiClient: client, query: { page: 1, limit: 20 } })).resolves.toEqual(listData);
    expect(requestInput).toBe('/api/v1/public/community/posts?page=1&limit=20');
    expect(JSON.stringify(listData)).not.toContain('authorId');
    expect(JSON.stringify(listData)).not.toContain('status');
  });

  it.each(['ar', 'en',] as const)('renders the public projection and direction for %s', locale => {
    const result = renderWithLocale(<PublicCommunity locale={locale} initialData={listData} />, { locale });
    const copy = getCommunityCopy(locale);

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: post.title, level: 2 })).toBeInTheDocument();
    expect(result.container.textContent).not.toContain('authorId');
    expect(result.container.textContent).not.toContain('internal');
  });

  it('shows empty and retry states without production fallback content', async () => {
    const copy = getCommunityCopy('en');
    const load = vi.fn()
      .mockRejectedValueOnce(new ApiClientError('offline', { code: 'NETWORK_ERROR' }))
      .mockResolvedValue(listData);
    renderWithLocale(<PublicCommunity locale="en" load={load} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('region', { name: copy.retryTitle })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('heading', { name: post.title, level: 2 })).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);

    renderWithLocale(<PublicCommunity locale="en" initialData={{ items: [], page: 1, limit: 20, total: 0 }} />, { locale: 'en' });
    expect(screen.getByRole('region', { name: copy.emptyTitle })).toBeInTheDocument();
  });

  it('returns an out-of-range empty page to page one without document navigation', async () => {
    const copy = getCommunityCopy('en');
    const load = vi.fn().mockResolvedValue(listData);
    renderWithLocale(
      <PublicCommunity locale="en" url="/community?page=9" initialData={{ items: [], page: 9, limit: 20, total: 1 }} load={load} />,
      { locale: 'en' }
    );
    fireEvent.click(within(screen.getByRole('region', { name: copy.emptyTitle })).getByRole('button', { name: copy.retryLabel }));
    await waitFor(() => expect(screen.getByRole('heading', { name: post.title, level: 2 })).toBeInTheDocument());
    expect(load).toHaveBeenCalledWith({ page: 1, limit: 20 }, expect.any(AbortSignal));
  });

  it('keeps create-post access behind authentication and submits the real mutation contract', async () => {
    const mutations: CommunityMutationApi = {
      createPost: vi.fn().mockResolvedValue(undefined),
      createComment: vi.fn().mockResolvedValue({ ...detailData.comments[0]!, id: 'cccccccccccccccccccccccc', body: 'A useful reply' }),
      react: vi.fn().mockResolvedValue({ postId: post.id, reaction: 'like', likeCount: 25, dislikeCount: 2 }),
      reportPost: vi.fn().mockResolvedValue(undefined)
    };
    const copy = getCommunityCopy('en');
    const anonymousResult = renderWithLocale(<PublicCommunity locale="en" url="/community?create=1" initialData={listData} mutations={mutations} />, { locale: 'en' });
    expect(screen.getByRole('dialog', { name: copy.authenticationRequired })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.signIn })).toHaveAttribute('href', '/auth/login');
    anonymousResult.unmount();

    renderWithLocale(
      <PublicCommunity locale="en" session={{ status: 'authenticated', role: 'seeker' }} initialData={listData} load={vi.fn().mockResolvedValue(listData)} mutations={mutations} />,
      { locale: 'en' }
    );
    const openCreateButton = screen.getAllByRole('button', { name: copy.createPost })[0];
    if (openCreateButton === undefined) throw new Error('Create-post opener is missing.');
    fireEvent.click(openCreateButton);
    fireEvent.change(screen.getByLabelText('Post category'), { target: { value: 'advice' } });
    fireEvent.change(screen.getByLabelText(copy.postTitle), { target: { value: 'A new post' } });
    fireEvent.change(screen.getByLabelText(copy.postBody), { target: { value: 'A new body' } });
    const submitButton = screen.getByRole('button', { name: copy.publishPost });
    fireEvent.click(submitButton);
    await waitFor(() => expect(mutations.createPost).toHaveBeenCalledWith({ title: 'A new post', body: 'A new body', category: 'advice' }));
  });

  it('loads details and submits comment and report mutations without exposing private fields', async () => {
    const mutations: CommunityMutationApi = {
      createPost: vi.fn().mockResolvedValue(undefined),
      createComment: vi.fn().mockResolvedValue({ ...detailData.comments[0]!, id: 'cccccccccccccccccccccccc', body: 'A useful reply' }),
      react: vi.fn().mockResolvedValue({ postId: post.id, reaction: 'like', likeCount: 25, dislikeCount: 2 }),
      reportPost: vi.fn().mockResolvedValue(undefined)
    };
    const copy = getCommunityCopy('en');
    renderWithLocale(
      <PublicCommunity
        locale="en"
        session={{ status: 'authenticated', role: 'seeker' }}
        initialData={listData}
        loadDetail={vi.fn().mockResolvedValue(detailData)}
        mutations={mutations}
      />,
      { locale: 'en' }
    );
    fireEvent.click(screen.getByRole('button', { name: copy.openDiscussion }));
    await waitFor(() => expect(screen.getByText('A visible public comment.')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(copy.commentLabel), { target: { value: 'A useful reply' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitComment }));
    await waitFor(() => expect(mutations.createComment).toHaveBeenCalledWith(post.id, { body: 'A useful reply' }));

    await waitFor(() => expect(screen.getByRole('button', { name: copy.reportPost })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.reportPost }));
    fireEvent.change(screen.getByLabelText(copy.reportDetails), { target: { value: 'This needs review' } });
    fireEvent.click(screen.getByRole('button', { name: copy.submitReport }));
    await waitFor(() => expect(mutations.reportPost).toHaveBeenCalledWith(post.id, { reason: 'other', details: 'This needs review' }));
    expect(screen.getByText('A visible public comment.')).toBeInTheDocument();
    expect(screen.queryByText('authorId')).not.toBeInTheDocument();
  });

  it('opens comments from their visible control and updates a persisted reaction result', async () => {
    const copy = getCommunityCopy('en');
    const mutations: CommunityMutationApi = {
      createPost: vi.fn().mockResolvedValue(undefined),
      createComment: vi.fn().mockResolvedValue({ ...detailData.comments[0]!, id: 'cccccccccccccccccccccccc' }),
      react: vi.fn().mockResolvedValue({ postId: post.id, reaction: 'like', likeCount: 25, dislikeCount: 2 }),
      reportPost: vi.fn().mockResolvedValue(undefined)
    };
    renderWithLocale(
      <PublicCommunity locale="en" session={{ status: 'authenticated', role: 'seeker' }} initialData={listData} loadDetail={vi.fn().mockResolvedValue(detailData)} mutations={mutations} />,
      { locale: 'en' }
    );

    fireEvent.click(screen.getByRole('button', { name: copy.comments(1) }));
    await waitFor(() => expect(screen.getByText('A visible public comment.')).toBeInTheDocument());
    const like = screen.getByRole('button', { name: `${copy.like} (24)` });
    fireEvent.click(like);
    await waitFor(() => expect(mutations.react).toHaveBeenCalledWith(post.id, 'like'));
    expect(screen.getByRole('button', { name: `${copy.like} (25)` })).toHaveAttribute('aria-pressed', 'true');
  });
});
