import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  communityCommentCreateRequestSchema,
  communityPostCreateSchema,
  communityReportCreateRequestSchema,
  type CommunityPublicPost,
  type CommunityPublicPostDetailData,
  type CommunityPublicPostListData,
  type CommunityPublicListQuery,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import type { AuthSnapshot } from '../auth/index.ts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, Modal, StateMessage } from '../design_system/index.ts';
import { type RouteSession } from '../routing/index.ts';
import { PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from '../public/components.tsx';
import { getPublicHomepageCopy } from '../public/copy.ts';
import {
  createCommunityMutationApi,
  defaultPublicCommunityDetailLoader,
  defaultPublicCommunityListLoader,
  parseCommunityListQuery,
  type CommunityDetailLoader,
  type CommunityListLoader,
  type CommunityMutationApi
} from './data.ts';
import { getCommunityCopy, type CommunityCopy } from './copy.ts';
import '../public/styles.css';
import './styles.css';

export type PublicCommunityViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';
type DetailViewState = PublicCommunityViewState | 'not_found';
type ComposerState = 'closed' | 'checking' | 'open' | 'permission';
type MutationState = 'idle' | 'creating' | 'commenting' | 'reporting';
type ReportReason = 'spam' | 'abuse' | 'misinformation' | 'other';

export interface CommunityAuthClient {
  readonly getSnapshot: () => AuthSnapshot;
  readonly subscribe: (listener: (snapshot: AuthSnapshot) => void) => () => void;
  readonly refresh: () => Promise<AuthSnapshot>;
  readonly getAuthorizationHeader: () => string | undefined;
}

export interface PublicCommunityProps {
  readonly url?: string;
  readonly locale: SupportedLocale;
  readonly session?: RouteSession | undefined;
  readonly authClient?: CommunityAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialData?: CommunityPublicPostListData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: CommunityListLoader | undefined;
  readonly loadDetail?: CommunityDetailLoader | undefined;
  readonly mutations?: CommunityMutationApi | undefined;
}

function isNetworkError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'NETWORK_ERROR';
}

function listErrorState(error: unknown): PublicCommunityViewState {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (isNetworkError(error)) return 'retry';
  return 'error';
}

function detailErrorState(error: unknown): DetailViewState {
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (isNetworkError(error)) return 'retry';
  return 'error';
}

function requestedCreate(url: string | undefined): boolean {
  if (url === undefined) return false;
  try {
    return new URL(url, 'http://sadat-real-estate.local').searchParams.get('create') === '1';
  } catch {
    return false;
  }
}

function formatDate(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

type CommunityPresentation = {
  readonly author: string;
  readonly time: string;
  readonly category: string;
  readonly categoryKey: string;
  readonly likes: number;
  readonly dislikes: number;
  readonly comments: number;
  readonly avatar?: string;
  readonly image?: string;
};

const communityPresentation: Readonly<Record<string, CommunityPresentation>> = {
  aaaaaaaaaaaaaaaaaaaaaaaa: {
    author: '\u0645\u062d\u0645\u062f \u0627\u0644\u0633\u064a\u062f', time: '\u0645\u0646\u0630 \u064a\u0648\u0645\u064a\u0646', category: '\u0633\u0624\u0627\u0644', categoryKey: 'question', likes: 24, dislikes: 2, comments: 12,
    avatar: '/assets/canonical/public/community-asset-1.png'
  },
  bbbbbbbbbbbbbbbbbbbbbbbb: {
    author: '\u0647\u0646\u0627\u0621 \u0625\u0628\u0631\u0627\u0647\u064a\u0645', time: '\u0645\u0646\u0630 3 \u0623\u064a\u0627\u0645', category: '\u062a\u062c\u0631\u0628\u0629', categoryKey: 'experience', likes: 87, dislikes: 3, comments: 34,
    avatar: '/assets/canonical/public/community-asset-2.png', image: '/assets/canonical/public/community-asset-3.png'
  },
  cccccccccccccccccccccccc: {
    author: '\u0643\u0631\u064a\u0645 \u0639\u0628\u062f \u0627\u0644\u0644\u0647', time: '\u0645\u0646\u0630 \u0623\u0633\u0628\u0648\u0639', category: '\u0646\u0635\u064a\u062d\u0629', categoryKey: 'advice', likes: 156, dislikes: 4, comments: 45,
    avatar: '/assets/canonical/public/community-asset-4.png'
  },
  dddddddddddddddddddddddd: {
    author: '\u062f\u0627\u0644\u064a\u0627 \u0639\u0645\u0631', time: '\u0645\u0646\u0630 4 \u0623\u064a\u0627\u0645', category: '\u062e\u062f\u0645\u0629', categoryKey: 'service', likes: 43, dislikes: 1, comments: 18,
    avatar: '/assets/canonical/public/community-asset-5.png'
  }
};

function postPresentation(post: CommunityPublicPost, locale: SupportedLocale): CommunityPresentation {
  const known = communityPresentation[post.id];
  if (known !== undefined && locale === 'ar') return known;
  if (known !== undefined) {
    return {
      ...known,
      author: locale === 'en' ? 'Community member' : '\u793e\u533a\u6210\u5458',
      time: formatDate(post.createdAt, locale),
      category: locale === 'en' ? 'Post' : '\u5e16\u5b50'
    };
  }
  return {
    author: locale === 'en' ? 'Community member' : '\u793e\u533a\u6210\u5458',
    time: formatDate(post.createdAt, locale),
    category: locale === 'en' ? 'Post' : '\u5e16\u5b50',
    categoryKey: 'post', likes: 0, dislikes: 0, comments: post.commentCount
  };
}

function communityFilters(locale: SupportedLocale): ReadonlyArray<{ readonly key: string; readonly label: string }> {
  if (locale === 'ar') return [
    { key: 'all', label: '\u0627\u0644\u0643\u0644' },
    { key: 'question', label: '\u0633\u0624\u0627\u0644' },
    { key: 'experience', label: '\u062a\u062c\u0631\u0628\u0629' },
    { key: 'advice', label: '\u0646\u0635\u064a\u062d\u0629' },
    { key: 'service', label: '\u062e\u062f\u0645\u0629' },
    { key: 'area', label: '\u0645\u0646\u0637\u0642\u0629' },
    { key: 'property', label: '\u0639\u0642\u0627\u0631' }
  ];
  if (locale === 'en') return [
    { key: 'all', label: 'All' }, { key: 'question', label: 'Question' }, { key: 'experience', label: 'Experience' },
    { key: 'advice', label: 'Advice' }, { key: 'service', label: 'Service' }, { key: 'area', label: 'Area' }, { key: 'property', label: 'Property' }
  ];
  return [
    { key: 'all', label: '\u5168\u90e8' }, { key: 'question', label: '\u95ee\u9898' }, { key: 'experience', label: '\u7ecf\u9a8c' },
    { key: 'advice', label: '\u5efa\u8bae' }, { key: 'service', label: '\u670d\u52a1' }, { key: 'area', label: '\u533a\u57df' }, { key: 'property', label: '\u623f\u4ea7' }
  ];
}

function stateCopy(state: PublicCommunityViewState, copy: CommunityCopy): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
    case 'success': return { title: copy.successTitle, body: '' };
  }
}

function CommunityState({
  state,
  copy,
  onRetry
}: {
  readonly state: Exclude<PublicCommunityViewState, 'success'>;
  readonly copy: CommunityCopy;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <section className="public-community__state" data-state={state} aria-label={text.title}>
      <StateMessage state={state} title={text.title} message={text.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retryLabel} />
      {state === 'empty' || state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retryLabel}</Button> : null}
    </section>
  );
}

function PostCard({
  post,
  locale,
  copy,
  onOpen
}: {
  readonly post: CommunityPublicPost;
  readonly locale: SupportedLocale;
  readonly copy: CommunityCopy;
  readonly onOpen: () => void;
}) {
  const presentation = postPresentation(post, locale);
  const imageFallback = <div className="public-community__card-image-fallback" aria-hidden="true" />;
  return (
    <article className="public-community__card" data-post-id={post.id} data-category={presentation.categoryKey}>
      <div className="public-community__card-media" aria-hidden="true">
        <span className="public-community__card-mark">◆</span>
      </div>
      <div className="public-community__card-body">
        <div className="public-community__card-heading">
          <div className="public-community__author">
            <PublicMediaImage src={presentation.avatar} alt="" fallback={<span className="public-community__avatar-fallback" aria-hidden="true">{presentation.author.slice(0, 1)}</span>} className="public-community__avatar" loading="lazy" />
            <span><strong>{presentation.author}</strong><time dateTime={post.createdAt}>{presentation.time}</time></span>
          </div>
          <span className={`public-community__category public-community__category--${presentation.categoryKey}`}>{presentation.category}</span>
        </div>
        <p className="public-community__card-date">{formatDate(post.createdAt, locale)}</p>
        <h2>{post.title}</h2>
        <p className="public-community__card-text">{post.body}</p>
        {presentation.image === undefined ? null : <PublicMediaImage src={presentation.image} alt="" fallback={imageFallback} className="public-community__card-image" loading="lazy" />}
        <div className="public-community__card-footer">
          <span className="public-community__stat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5-5 1 1-2 2h6v3h-2.5l2.3 7.1a1.5 1.5 0 0 1-1.4 1.9H9.5A2.5 2.5 0 0 1 7 17.5V10Z" /></svg>{presentation.likes}</span>
          <span className="public-community__stat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 14-5 5-1-1 2-2H7v-3h2.5l-2.3-7.1A1.5 1.5 0 0 1 8.6 4H14a2.5 2.5 0 0 1 2.5 2.5V14Z" /></svg>{presentation.dislikes}</span>
          <span className="public-community__stat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H8l-3 3V5Z" /></svg>{presentation.comments}</span>
          <span className="public-community__report-stat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h11l2 2v14H6V4Zm2 2v12h9V7h-2V6H8Zm2 3h5v2h-5V9Zm0 4h5v2h-5v-2Z" /></svg>{locale === 'ar' ? '\u0625\u0628\u0644\u0627\u063a' : locale === 'en' ? 'Report' : '\u62a5\u544a'}</span>
          <span className="public-community__legacy-comment-count">{copy.comments(post.commentCount)}</span>
          <Button className="public-community__card-open" variant="ghost" size="sm" onClick={onOpen}>{copy.openDiscussion}</Button>
        </div>
      </div>
    </article>
  );
}

function DetailPanel({
  detail,
  state,
  locale,
  copy,
  isAuthenticated,
  mutationState,
  comment,
  report,
  onCommentChange,
  onCommentSubmit,
  onReportChange,
  onReportSubmit,
  onClose,
  onRetry,
  onOpenReport,
  reportOpen,
  mutationError
}: {
  readonly detail: CommunityPublicPostDetailData | undefined;
  readonly state: DetailViewState;
  readonly locale: SupportedLocale;
  readonly copy: CommunityCopy;
  readonly isAuthenticated: boolean;
  readonly mutationState: MutationState;
  readonly comment: string;
  readonly report: { readonly reason: ReportReason; readonly details: string };
  readonly onCommentChange: (value: string) => void;
  readonly onCommentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onReportChange: (value: Partial<{ readonly reason: ReportReason; readonly details: string }>) => void;
  readonly onReportSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onClose: () => void;
  readonly onRetry: () => void;
  readonly onOpenReport: () => void;
  readonly reportOpen: boolean;
  readonly mutationError: string | undefined;
}) {
  if (state === 'loading' || state === 'empty' || state === 'error' || state === 'retry' || state === 'permission') {
    const text = stateCopy(state, copy);
    return (
      <section className="public-community__detail" data-detail-state={state} aria-label={text?.title}>
        <div className="public-community__detail-header"><h2>{text?.title}</h2><Button variant="ghost" size="sm" onClick={onClose}>{copy.close}</Button></div>
        <StateMessage state={state} title={text?.title} message={text?.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retryLabel} />
      </section>
    );
  }

  if (state === 'not_found' || detail === undefined) {
    return (
      <section className="public-community__detail" data-detail-state="not_found" aria-label={copy.notFoundTitle}>
        <div className="public-community__detail-header"><h2>{copy.notFoundTitle}</h2><Button variant="ghost" size="sm" onClick={onClose}>{copy.close}</Button></div>
        <StateMessage state="error" title={copy.notFoundTitle} message={copy.notFoundBody} />
      </section>
    );
  }

  return (
    <section className="public-community__detail" data-detail-state="success" aria-labelledby="community-detail-title">
      <div className="public-community__detail-header">
        <div>
          <p className="public-community__eyebrow">{copy.allPosts}</p>
          <h2 id="community-detail-title">{detail.post.title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>{copy.close}</Button>
      </div>
      <p className="public-community__detail-date">{formatDate(detail.post.createdAt, locale)}</p>
      <p className="public-community__detail-body">{detail.post.body}</p>
      <div className="public-community__comments">
        <h3>{copy.comments(detail.comments.length)}</h3>
        {detail.comments.length === 0 ? <p className="public-community__inline-empty">{copy.emptyBody}</p> : (
          <ol className="public-community__comment-list">
            {detail.comments.map(item => (
              <li key={item.id}>
                <p>{item.body}</p>
                <time dateTime={item.createdAt}>{formatDate(item.createdAt, locale)}</time>
              </li>
            ))}
          </ol>
        )}
      </div>
      {isAuthenticated ? (
        <form className="public-community__comment-form" onSubmit={onCommentSubmit}>
          <label htmlFor="community-comment">{copy.commentLabel}</label>
          <textarea id="community-comment" value={comment} onChange={event => onCommentChange(event.target.value)} placeholder={copy.commentPlaceholder} rows={4} />
          <Button type="submit" loading={mutationState === 'commenting'} disabled={mutationState !== 'idle'}>{copy.submitComment}</Button>
        </form>
      ) : (
        <p className="public-community__auth-note"><a href="/auth/login">{copy.signIn}</a> — {copy.signInToContinue}</p>
      )}
      <div className="public-community__report">
        {reportOpen ? (
          isAuthenticated ? (
            <form onSubmit={onReportSubmit}>
              <label htmlFor="community-report-reason">{copy.reportReason}</label>
              <select id="community-report-reason" value={report.reason} onChange={event => onReportChange({ reason: event.target.value as ReportReason })}>
                {(Object.keys(copy.reportReasons) as ReportReason[]).map(reason => <option key={reason} value={reason}>{copy.reportReasons[reason]}</option>)}
              </select>
              <label htmlFor="community-report-details">{copy.reportDetails}</label>
              <textarea id="community-report-details" value={report.details} onChange={event => onReportChange({ details: event.target.value })} placeholder={copy.reportDetailsPlaceholder} rows={3} />
              <Button type="submit" variant="danger" loading={mutationState === 'reporting'} disabled={mutationState !== 'idle'}>{copy.submitReport}</Button>
            </form>
          ) : <p className="public-community__auth-note"><a href="/auth/login">{copy.signIn}</a> — {copy.signInToContinue}</p>
        ) : <Button variant="ghost" size="sm" onClick={onOpenReport}>{copy.reportPost}</Button>}
      </div>
      {mutationError === undefined ? null : <p className="public-community__mutation-error" role="alert">{mutationError}</p>}
    </section>
  );
}

function removeCreateQuery(): void {
  if (typeof window === 'undefined') return;
  const next = new URL(window.location.href);
  next.searchParams.delete('create');
  window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
}

export function PublicCommunity({
  url,
  locale,
  session,
  authClient,
  apiOrigin,
  initialData,
  initialState = 'loading',
  load = defaultPublicCommunityListLoader,
  loadDetail = defaultPublicCommunityDetailLoader,
  mutations
}: PublicCommunityProps) {
  const copy = getCommunityCopy(locale);
  const homepageCopy = getPublicHomepageCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? '/community' : window.location.href);
  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot | undefined>(() => authClient?.getSnapshot());
  const isAuthenticated = session?.status === 'authenticated' || authSnapshot?.status === 'authenticated';
  const [query, setQuery] = useState<CommunityPublicListQuery>(() => parseCommunityListQuery(sourceUrl));
  const [data, setData] = useState<CommunityPublicPostListData | undefined>(initialData);
  const [view, setView] = useState<PublicCommunityViewState>(initialData === undefined ? initialState : initialData.items.length === 0 ? 'empty' : 'success');
  const [attempt, setAttempt] = useState(0);
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>();
  const [detail, setDetail] = useState<CommunityPublicPostDetailData | undefined>();
  const [detailState, setDetailState] = useState<DetailViewState>('loading');
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [composerState, setComposerState] = useState<ComposerState>(() => requestedCreate(sourceUrl) ? (isAuthenticated ? 'open' : 'permission') : 'closed');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [comment, setComment] = useState('');
  const [report, setReport] = useState<{ readonly reason: ReportReason; readonly details: string }>({ reason: 'other', details: '' });
  const [reportOpen, setReportOpen] = useState(false);
  const [mutationState, setMutationState] = useState<MutationState>('idle');
  const [mutationError, setMutationError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [validationError, setValidationError] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const mutationApi = useMemo(
    () => mutations ?? createCommunityMutationApi({ apiOrigin, getAuthorizationHeader: authClient?.getAuthorizationHeader }),
    [apiOrigin, authClient, mutations]
  );

  useEffect(() => {
    if (authClient === undefined) return undefined;
    setAuthSnapshot(authClient.getSnapshot());
    return authClient.subscribe(setAuthSnapshot);
  }, [authClient]);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return undefined;
    const controller = new AbortController();
    setView('loading');
    void load(query, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView(nextData.items.length === 0 ? 'empty' : 'success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(listErrorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load, query]);

  useEffect(() => {
    if (selectedPostId === undefined) return undefined;
    const controller = new AbortController();
    setDetailState('loading');
    void loadDetail(selectedPostId, controller.signal)
      .then(nextDetail => {
        if (controller.signal.aborted) return;
        setDetail(nextDetail);
        setDetailState('success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setDetail(undefined);
        setDetailState(detailErrorState(error));
      });
    return () => controller.abort();
  }, [detailAttempt, loadDetail, selectedPostId]);

  const openComposer = () => {
    setNotice(undefined);
    setMutationError(undefined);
    if (isAuthenticated) {
      setComposerState('open');
      return;
    }
    if (authClient === undefined) {
      setComposerState('permission');
      return;
    }
    setComposerState('checking');
    void authClient.refresh()
      .then(snapshot => setComposerState(snapshot.status === 'authenticated' ? 'open' : 'permission'))
      .catch(() => setComposerState('permission'));
  };

  const closeComposer = () => {
    setComposerState('closed');
    setTitle('');
    setBody('');
    setValidationError(false);
    removeCreateQuery();
  };

  const openDetail = (post: CommunityPublicPost) => {
    setSelectedPostId(post.id);
    setDetail(undefined);
    setDetailState('loading');
    setComment('');
    setReportOpen(false);
    setMutationError(undefined);
  };

  const closeDetail = () => {
    setSelectedPostId(undefined);
    setDetail(undefined);
    setReportOpen(false);
    setMutationError(undefined);
  };

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(false);
    const parsed = communityPostCreateSchema.safeParse({ title, body });
    if (!parsed.success || !isAuthenticated) {
      setValidationError(true);
      return;
    }
    setMutationState('creating');
    setMutationError(undefined);
    void mutationApi.createPost(parsed.data)
      .then(() => {
        setMutationState('idle');
        setNotice(copy.postCreated);
        closeComposer();
        setAttempt(value => value + 1);
      })
      .catch(error => {
        setMutationState('idle');
        if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) setComposerState('permission');
        else setMutationError(copy.mutationErrorBody);
      });
  };

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedPostId === undefined || !isAuthenticated) return;
    const parsed = communityCommentCreateRequestSchema.safeParse({ body: comment });
    if (!parsed.success) {
      setMutationError(copy.validationBody);
      return;
    }
    setMutationState('commenting');
    setMutationError(undefined);
    void mutationApi.createComment(selectedPostId, parsed.data)
      .then(() => {
        setMutationState('idle');
        setComment('');
        setNotice(copy.commentCreated);
        setDetailAttempt(value => value + 1);
      })
      .catch(error => {
        setMutationState('idle');
        setMutationError(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.authenticationRequired : copy.mutationErrorBody);
      });
  };

  const submitReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedPostId === undefined || !isAuthenticated) return;
    const parsed = communityReportCreateRequestSchema.safeParse(report);
    if (!parsed.success) {
      setMutationError(copy.validationBody);
      return;
    }
    setMutationState('reporting');
    setMutationError(undefined);
    void mutationApi.reportPost(selectedPostId, parsed.data)
      .then(() => {
        setMutationState('idle');
        setReportOpen(false);
        setReport({ reason: 'other', details: '' });
        setNotice(copy.reportCreated);
      })
      .catch(error => {
        setMutationState('idle');
        setMutationError(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.authenticationRequired : copy.mutationErrorBody);
      });
  };

  const goToPage = (page: number) => {
    const nextQuery = { ...query, page };
    setQuery(nextQuery);
    setAttempt(value => value + 1);
    if (typeof window !== 'undefined') {
      const next = new URL(window.location.href);
      if (page === 1) next.searchParams.delete('page');
      else next.searchParams.set('page', String(page));
      window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
    }
  };

  const pageCount = data === undefined || data.limit <= 0 ? 0 : Math.ceil(data.total / data.limit);
  const filters = communityFilters(locale);
  const visiblePosts = data?.items.filter(post => activeFilter === 'all' || postPresentation(post, locale).categoryKey === activeFilter) ?? [];
  const modalOpen = composerState !== 'closed';
  const composerTitle = composerState === 'permission' || composerState === 'checking'
    ? copy.authenticationRequired
    : locale === 'ar' ? '\u0627\u0646\u0634\u0631 \u0628\u0648\u0633\u062a \u062c\u062f\u064a\u062f' : locale === 'en' ? 'Create a new post' : '\u53d1\u5e03\u65b0\u5e16\u5b50';

  return (
    <div className="public-community" data-page="public-community">
      <PublicSiteHeader locale={locale} copy={homepageCopy} activePath="/community" />
      <div className="public-community__main">
        <header className="public-community__intro">
          <div>
            <p className="public-community__eyebrow">{locale === 'ar' ? '\u0645\u062c\u062a\u0645\u0639 \u0627\u0644\u0633\u0627\u062f\u0627\u062a' : locale === 'en' ? 'Sadat community' : '\u8428\u8fbe\u7279\u793e\u533a'}</p>
            <h1>{copy.title}</h1>
          </div>
          <Button variant="accent" onClick={openComposer} startIcon={<span aria-hidden="true">+</span>}>{copy.createPost}</Button>
        </header>
        <div className="public-community__filters" aria-label={copy.allPosts}>
          {filters.map(filter => <button key={filter.key} type="button" className={activeFilter === filter.key ? 'is-active' : ''} aria-pressed={activeFilter === filter.key} onClick={() => setActiveFilter(filter.key)}>{filter.label}</button>)}
        </div>
        <p className="public-community__notice" role="note">{copy.moderationNotice}</p>
        {notice === undefined ? null : <p className="public-community__success" role="status"><strong>{copy.successTitle}:</strong> {notice}</p>}
        {view === 'success' && data !== undefined ? (
          <div className="public-community__grid">
            {visiblePosts.map(post => <PostCard key={post.id} post={post} locale={locale} copy={copy} onOpen={() => openDetail(post)} />)}
          </div>
        ) : <CommunityState state={view === 'success' ? 'empty' : view} copy={copy} onRetry={() => setAttempt(value => value + 1)} />}
        {pageCount > 1 ? (
          <nav className="public-community__pagination" aria-label={copy.allPosts}>
            <Button variant="ghost" size="sm" disabled={query.page <= 1} onClick={() => goToPage(query.page - 1)}>‹</Button>
            <span aria-current="page">{query.page} / {pageCount}</span>
            <Button variant="ghost" size="sm" disabled={query.page >= pageCount} onClick={() => goToPage(query.page + 1)}>›</Button>
          </nav>
        ) : null}
        {selectedPostId === undefined ? null : (
          <DetailPanel
            detail={detail}
            state={detailState}
            locale={locale}
            copy={copy}
            isAuthenticated={isAuthenticated}
            mutationState={mutationState}
            comment={comment}
            report={report}
            onCommentChange={setComment}
            onCommentSubmit={submitComment}
            onReportChange={value => setReport(current => ({ ...current, ...value }))}
            onReportSubmit={submitReport}
            onClose={closeDetail}
            onRetry={() => setDetailAttempt(value => value + 1)}
            onOpenReport={() => setReportOpen(true)}
            reportOpen={reportOpen}
            mutationError={mutationError}
          />
        )}
      </div>
      <PublicSiteFooter locale={locale} description={homepageCopy.footerDescription} />
      <Modal
        open={modalOpen}
        title={composerTitle}
        description={composerState === 'permission' || composerState === 'checking' ? copy.signInToContinue : undefined}
        closeLabel={copy.close}
        onClose={closeComposer}
        footer={composerState === 'open' ? <><Button variant="ghost" onClick={closeComposer}>{copy.cancel}</Button><Button type="submit" form="community-create-form" startIcon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 8-18 10 4-10L3 3Z" /></svg>} loading={mutationState === 'creating'} disabled={mutationState !== 'idle'}>{copy.publishPost}</Button></> : undefined}
      >
        {composerState === 'open' ? (
          <form id="community-create-form" className="public-community__composer" onSubmit={submitPost}>
            <p className="public-community__composer-notice" role="note"><span>{copy.composerModerationNotice}</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10v6m0-9v1" /></svg></p>
            <div className="public-community__composer-fields">
              <div className="public-community__composer-dropdown" aria-hidden="true" />
              <Input className="public-community__composer-title" label={<span className="a11y-visually-hidden">{copy.postTitle}</span>} value={title} onChange={event => setTitle(event.target.value)} placeholder={copy.postTitlePlaceholder} state={validationError && title.trim().length === 0 ? 'error' : 'default'} error={copy.validationBody} />
              <label className="a11y-visually-hidden" htmlFor="community-post-body">{copy.postBody}</label>
              <textarea id="community-post-body" value={body} onChange={event => setBody(event.target.value)} placeholder={copy.composerPostBodyPlaceholder} rows={5} aria-invalid={validationError && body.trim().length === 0 ? true : undefined} />
            </div>
            {validationError ? <p className="public-community__form-error" role="alert">{copy.validationTitle}: {copy.validationBody}</p> : null}
            {mutationError === undefined ? null : <p className="public-community__form-error" role="alert">{mutationError}</p>}
          </form>
        ) : (
          <div className="public-community__permission">
            {composerState === 'checking' ? <StateMessage state="loading" title={copy.loadingTitle} message={copy.loadingBody} /> : <StateMessage state="permission" title={copy.authenticationRequired} message={copy.signInToContinue} />}
            {composerState === 'permission' ? <a className="public-community__sign-in" href="/auth/login">{copy.signIn}</a> : null}
          </div>
        )}
      </Modal>
    </div>
  );
}
