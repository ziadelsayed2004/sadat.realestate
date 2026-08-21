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
import { PublicSiteHeader } from '../public/components.tsx';
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
  return (
    <article className="public-community__card" data-post-id={post.id}>
      <div className="public-community__card-media" aria-hidden="true">
        <span className="public-community__card-mark">◆</span>
      </div>
      <div className="public-community__card-body">
        <p className="public-community__card-date">{formatDate(post.createdAt, locale)}</p>
        <h2>{post.title}</h2>
        <p className="public-community__card-text">{post.body}</p>
        <div className="public-community__card-footer">
          <span>{copy.comments(post.commentCount)}</span>
          <Button variant="ghost" size="sm" onClick={onOpen}>{copy.openDiscussion}</Button>
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
  const modalOpen = composerState !== 'closed';
  const composerTitle = composerState === 'permission' || composerState === 'checking' ? copy.authenticationRequired : copy.createPost;

  return (
    <div className="public-community" data-page="public-community">
      <PublicSiteHeader locale={locale} copy={homepageCopy} activePath="/community" />
      <div className="public-community__main">
        <header className="public-community__intro">
          <div>
            <p className="public-community__eyebrow">{homepageCopy.brand}</p>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <Button variant="primary" onClick={openComposer}>{copy.createPost}</Button>
        </header>
        <p className="public-community__notice" role="note">{copy.moderationNotice}</p>
        {notice === undefined ? null : <p className="public-community__success" role="status"><strong>{copy.successTitle}:</strong> {notice}</p>}
        <div className="public-community__filters" aria-label={copy.allPosts}>
          <button type="button" className="is-active" aria-pressed="true" disabled>{copy.allPosts}</button>
        </div>
        <div className="public-community__toolbar">
          <p>{copy.publishedCount(data?.total ?? 0)}</p>
        </div>
        {view === 'success' && data !== undefined ? (
          <div className="public-community__grid">
            {data.items.map(post => <PostCard key={post.id} post={post} locale={locale} copy={copy} onOpen={() => openDetail(post)} />)}
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
      <Modal
        open={modalOpen}
        title={composerTitle}
        description={composerState === 'permission' || composerState === 'checking' ? copy.signInToContinue : copy.moderationNotice}
        closeLabel={copy.close}
        onClose={closeComposer}
        footer={composerState === 'open' ? <><Button variant="ghost" onClick={closeComposer}>{copy.cancel}</Button><Button type="submit" form="community-create-form" loading={mutationState === 'creating'} disabled={mutationState !== 'idle'}>{copy.createPost}</Button></> : undefined}
      >
        {composerState === 'open' ? (
          <form id="community-create-form" className="public-community__composer" onSubmit={submitPost}>
            <Input label={copy.postTitle} value={title} onChange={event => setTitle(event.target.value)} placeholder={copy.postTitlePlaceholder} state={validationError && title.trim().length === 0 ? 'error' : 'default'} error={copy.validationBody} />
            <label htmlFor="community-post-body">{copy.postBody}</label>
            <textarea id="community-post-body" value={body} onChange={event => setBody(event.target.value)} placeholder={copy.postBodyPlaceholder} rows={5} aria-invalid={validationError && body.trim().length === 0 ? true : undefined} />
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
