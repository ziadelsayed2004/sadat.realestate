import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  communityAdminCommentListQuerySchema,
  communityAdminPostListQuerySchema,
  communityAdminReportListQuerySchema,
  communityReportResolveSchema,
  type CommunityAdminComment,
  type CommunityAdminCommentListData,
  type CommunityAdminCommentListQuery,
  type CommunityAdminPost,
  type CommunityAdminPostListData,
  type CommunityAdminPostListQuery,
  type CommunityAdminReport,
  type CommunityAdminReportListData,
  type CommunityAdminReportListQuery,
  type CommunityReportStatus,
  type CommunityReportResolve,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_COMMUNITY_COMMENTS_ROUTE,
  ADMIN_COMMUNITY_POSTS_SCREEN_ROUTE,
  ADMIN_COMMUNITY_REPORTS_ROUTE,
  createAdminCommunitySource,
  type AdminCommunityAuthorizationSource,
  type AdminCommunityCommentsLoader,
  type AdminCommunityPostsLoader,
  type AdminCommunityReportsLoader,
  type AdminCommunityReportResolver
} from './data.ts';
import { getAdminCommunityCopy, type AdminCommunityState, type AdminCommunityView } from './copy.ts';
import './styles.css';

export interface AdminCommunityProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminCommunityAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialPosts?: CommunityAdminPostListData | undefined;
  readonly initialComments?: CommunityAdminCommentListData | undefined;
  readonly initialReports?: CommunityAdminReportListData | undefined;
  readonly loadPosts?: AdminCommunityPostsLoader | undefined;
  readonly loadComments?: AdminCommunityCommentsLoader | undefined;
  readonly loadReports?: AdminCommunityReportsLoader | undefined;
  readonly resolveReport?: AdminCommunityReportResolver | undefined;
}

const postStatuses: readonly CommunityPostStatus[] = ['draft', 'published', 'hidden', 'removed'];
const commentStatuses: readonly CommunityCommentStatus[] = ['visible', 'hidden', 'removed'];
const reportStatuses: readonly CommunityReportStatus[] = ['open', 'in_review', 'resolved', 'dismissed'];
type CommunityPostStatus = CommunityAdminPost['status'];
type CommunityCommentStatus = CommunityAdminComment['status'];

function pathnameForView(): { readonly pathname: string; readonly view: AdminCommunityView } {
  if (typeof window === 'undefined') return { pathname: ADMIN_COMMUNITY_POSTS_SCREEN_ROUTE, view: 'posts' };
  const pathname = new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  if (pathname === ADMIN_COMMUNITY_COMMENTS_ROUTE) return { pathname, view: 'comments' };
  if (pathname === ADMIN_COMMUNITY_REPORTS_ROUTE) return { pathname, view: 'reports' };
  return { pathname: pathname === ADMIN_COMMUNITY_POSTS_SCREEN_ROUTE ? pathname : ADMIN_COMMUNITY_POSTS_SCREEN_ROUTE, view: 'posts' };
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function stateForError(error: unknown): Exclude<AdminCommunityState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForData(items: readonly unknown[]): AdminCommunityState {
  return items.length === 0 ? 'empty' : 'success';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return '—'; }
}

function labelValue(value: string, locale: SupportedLocale): string {
  return locale === 'ar' ? `معرّف ${value}` : locale === 'zh-CN' ? `编号 ${value}` : `ID ${value}`;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminCommunityState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminCommunityCopy(locale);
  const message = copy.states[state];
  return <section className="admin-community__state" data-state={state} aria-label={message.title}><StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />{state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}</section>;
}

function EmptyPanel({ locale }: { readonly locale: SupportedLocale }) {
  const copy = getAdminCommunityCopy(locale);
  return <section className="admin-community__state" data-state="empty" aria-label={copy.empty.title}><h2>{copy.empty.title}</h2><p>{copy.empty.body}</p></section>;
}

function StatusBadge({ label, tone = 'neutral' }: { readonly label: string; readonly tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className="admin-community__badge" data-tone={tone}>{label}</span>;
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'published' || status === 'visible' || status === 'resolved') return 'success';
  if (status === 'in_review' || status === 'hidden') return 'warning';
  if (status === 'removed' || status === 'dismissed') return 'danger';
  if (status === 'open') return 'info';
  return 'neutral';
}

function statusCount(data: { readonly items: readonly unknown[] } | undefined, status: string): number {
  return data?.items.filter(item => typeof item === 'object' && item !== null && 'status' in item && (item as { readonly status?: unknown }).status === status).length ?? 0;
}

function SummaryCards({ data, locale, view }: { readonly data: { readonly total: number; readonly items: readonly unknown[] } | undefined; readonly locale: SupportedLocale; readonly view: AdminCommunityView }) {
  if (data === undefined || view === 'comments') return null;
  const copy = getAdminCommunityCopy(locale);
  const labels = view === 'posts'
    ? (locale === 'ar' ? ['إجمالي المنشورات', copy.postStatus.published, copy.postStatus.hidden, copy.postStatus.removed] : locale === 'zh-CN' ? ['帖子总数', copy.postStatus.published, copy.postStatus.hidden, copy.postStatus.removed] : ['Total posts', copy.postStatus.published, copy.postStatus.hidden, copy.postStatus.removed])
    : (locale === 'ar' ? ['إجمالي البلاغات', copy.reportStatus.open, copy.reportStatus.in_review, copy.reportStatus.resolved] : locale === 'zh-CN' ? ['举报总数', copy.reportStatus.open, copy.reportStatus.in_review, copy.reportStatus.resolved] : ['Total reports', copy.reportStatus.open, copy.reportStatus.in_review, copy.reportStatus.resolved]);
  const statuses = view === 'posts' ? ['published', 'hidden', 'removed'] : ['open', 'in_review', 'resolved'];
  const values = [data.total, ...statuses.map(status => statusCount(data, status))];
  const colors = ['#1b2942', '#087b43', '#bf6500', '#b42318'];
  return <div className="admin-community__summary" aria-label={labels[0]}>{values.map((value, index) => <article key={labels[index]} className="admin-community__summary-card"><strong style={{ color: colors[index] }}>{new Intl.NumberFormat(locale).format(value)}</strong><span>{labels[index]}</span></article>)}</div>;
}

function StatusStrip({ view, locale, selected, onSelect }: { readonly view: AdminCommunityView; readonly locale: SupportedLocale; readonly selected: string; readonly onSelect: (status: string) => void }) {
  const copy = getAdminCommunityCopy(locale);
  const allLabel = locale === 'ar' ? 'الكل' : locale === 'zh-CN' ? '全部' : 'All';
  const statuses: readonly string[] = view === 'posts' ? postStatuses : view === 'comments' ? commentStatuses : reportStatuses;
  const label = (status: string): string => view === 'posts' ? copy.postStatus[status as CommunityPostStatus] : view === 'comments' ? copy.commentStatus[status as CommunityCommentStatus] : copy.reportStatus[status as CommunityReportStatus];
  const options = [['', allLabel] as const, ...statuses.map(status => [status, label(status)] as const)];
  return <div role="tablist" aria-label={`${copy.status} summary`} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, maxWidth: 1320, margin: '0 auto 12px', padding: 8, border: '1px solid #e3e5e7', borderRadius: 16, background: '#fff', boxShadow: '0 6px 16px #3232320d' }}>{options.map(([status, text]) => { const active = selected === status; return <button key={status || 'all'} type="button" role="tab" aria-selected={active} onClick={() => onSelect(status)} style={{ minHeight: 38, padding: '8px 16px', border: 0, borderRadius: 999, background: active ? '#155b4f' : 'transparent', color: active ? '#fff' : '#69768b', cursor: 'pointer', fontWeight: 800 }}>{text}</button>; })}</div>;
}

function Filters({ view, locale, onApply, onClear }: { readonly view: AdminCommunityView; readonly locale: SupportedLocale; readonly onApply: (input: Record<string, string>) => void; readonly onClear: () => void }) {
  const copy = getAdminCommunityCopy(locale);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [postId, setPostId] = useState('');
  const statuses = view === 'posts' ? postStatuses : view === 'comments' ? commentStatuses : reportStatuses;
  const statusLabel = (value: string) => view === 'posts' ? copy.postStatus[value as CommunityPostStatus] : view === 'comments' ? copy.commentStatus[value as CommunityCommentStatus] : copy.reportStatus[value as CommunityReportStatus];
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onApply({ ...(search.trim() === '' ? {} : { search: search.trim() }), ...(status === '' ? {} : { status }), ...(postId.trim() === '' ? {} : { postId: postId.trim() }) });
  }
  return <form className="admin-community__filters" role="search" aria-label={copy.search} onSubmit={submit}><label htmlFor="admin-community-search">{copy.search}<input id="admin-community-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} disabled={view === 'reports'} /></label>{view === 'comments' ? <label htmlFor="admin-community-post-id">{copy.postId}<input id="admin-community-post-id" value={postId} onChange={event => setPostId(event.target.value)} pattern="[a-f0-9]{24}" /></label> : null}<label htmlFor="admin-community-status">{copy.status}<select id="admin-community-status" value={status} onChange={event => setStatus(event.target.value)}><option value="">{copy.all}</option>{statuses.map(option => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></label><Button type="submit">{copy.apply}</Button><Button type="button" variant="secondary" onClick={() => { setSearch(''); setStatus(''); setPostId(''); onClear(); }}>{copy.clear}</Button></form>;
}

function Pagination({ locale, page, limit, total, onPage }: { readonly locale: SupportedLocale; readonly page: number; readonly limit: number; readonly total: number; readonly onPage: (page: number) => void }) {
  const copy = getAdminCommunityCopy(locale);
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  return <nav className="admin-community__pagination" aria-label={copy.pageLabel}><span>{copy.page(page, totalPages)}</span><div><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>{copy.previous}</Button><Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{copy.next}</Button></div></nav>;
}

function PostTable({ items, locale }: { readonly items: readonly CommunityAdminPost[]; readonly locale: SupportedLocale }) {
  const copy = getAdminCommunityCopy(locale);
  return <div className="admin-community__table-wrap"><table className="admin-community__table"><thead><tr><th>{copy.columns.title}</th><th>{copy.columns.author}</th><th>{copy.columns.status}</th><th>{copy.columns.comments}</th><th>{copy.columns.updated}</th><th>{copy.columns.actions}</th></tr></thead><tbody>{items.map(post => <tr key={post.id} data-testid={`admin-community-post-${post.id}`}><td><strong>{post.title}</strong><small>{post.body}</small></td><td><code>{labelValue(post.authorId, locale)}</code></td><td><StatusBadge label={copy.postStatus[post.status]} tone={statusTone(post.status)} /></td><td>{post.commentCount}</td><td>{dateLabel(post.updatedAt, locale)}</td><td><span className="admin-community__muted">{copy.noActions}</span></td></tr>)}</tbody></table></div>;
}

function CommentTable({ items, locale }: { readonly items: readonly CommunityAdminComment[]; readonly locale: SupportedLocale }) {
  const copy = getAdminCommunityCopy(locale);
  return <div className="admin-community__table-wrap"><table className="admin-community__table"><thead><tr><th>{copy.columns.id}</th><th>{copy.columns.body}</th><th>{copy.columns.post}</th><th>{copy.columns.author}</th><th>{copy.columns.status}</th><th>{copy.columns.created}</th></tr></thead><tbody>{items.map(comment => <tr key={comment.id} data-testid={`admin-community-comment-${comment.id}`}><td><code>{comment.id}</code></td><td>{comment.body}</td><td><code>{comment.postId}</code></td><td><code>{labelValue(comment.authorId, locale)}</code></td><td><StatusBadge label={copy.commentStatus[comment.status]} tone={statusTone(comment.status)} /></td><td>{dateLabel(comment.createdAt, locale)}</td></tr>)}</tbody></table></div>;
}

function ReportTable({ items, locale, onReview }: { readonly items: readonly CommunityAdminReport[]; readonly locale: SupportedLocale; readonly onReview: (report: CommunityAdminReport) => void }) {
  const copy = getAdminCommunityCopy(locale);
  return <div className="admin-community__table-wrap"><table className="admin-community__table"><thead><tr><th>{copy.columns.id}</th><th>{copy.columns.reason}</th><th>{copy.columns.details}</th><th>{copy.columns.reporter}</th><th>{copy.columns.status}</th><th>{copy.columns.updated}</th><th>{copy.columns.actions}</th></tr></thead><tbody>{items.map(report => <tr key={report.id} data-testid={`admin-community-report-${report.id}`}><td><code>{report.id}</code></td><td>{copy.reportReason[report.reason]}</td><td>{report.details}</td><td><code>{labelValue(report.reporterId, locale)}</code></td><td><StatusBadge label={copy.reportStatus[report.status]} tone={statusTone(report.status)} /></td><td>{dateLabel(report.updatedAt, locale)}</td><td>{report.status === 'open' || report.status === 'in_review' ? <Button size="sm" variant="secondary" onClick={() => onReview(report)}>{copy.action.review}</Button> : <span className="admin-community__muted">{copy.noActions}</span>}</td></tr>)}</tbody></table></div>;
}

function ReportResolution({ report, locale, onClose, onResolve }: { readonly report: CommunityAdminReport; readonly locale: SupportedLocale; readonly onClose: () => void; readonly onResolve: (reportId: string, input: CommunityReportResolve) => Promise<void> }) {
  const copy = getAdminCommunityCopy(locale);
  const [action, setAction] = useState<'resolve' | 'dismiss'>('resolve');
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | undefined>();
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (reason.trim().length < 5) { setState('error'); setFeedback(copy.reasonRequired); return; }
    try {
      const input = communityReportResolveSchema.parse({ version: report.version, action, reason: reason.trim() });
      setState('saving'); setFeedback(undefined);
      await onResolve(report.id, input);
      setState('idle');
    } catch {
      setState('error'); setFeedback(copy.reasonRequired);
    }
  }
  return <section className="admin-community__resolution" data-testid="admin-community-resolution"><div><p className="admin-community__eyebrow">{copy.action.review}</p><h2>{copy.reportReason[report.reason]}</h2><p>{report.details}</p><dl><div><dt>{copy.columns.id}</dt><dd><code>{report.id}</code></dd></div><div><dt>{copy.columns.post}</dt><dd><code>{report.postId}</code></dd></div><div><dt>{copy.columns.status}</dt><dd>{copy.reportStatus[report.status]}</dd></div><div><dt>{copy.columns.updated}</dt><dd>{dateLabel(report.updatedAt, locale)}</dd></div></dl></div><form onSubmit={event => { void submit(event); }}><label htmlFor="admin-community-report-action">{copy.action.review}<select id="admin-community-report-action" value={action} onChange={event => setAction(event.target.value as 'resolve' | 'dismiss')}><option value="resolve">{copy.action.resolve}</option><option value="dismiss">{copy.action.dismiss}</option></select></label><label htmlFor="admin-community-report-reason">{copy.reason}<textarea id="admin-community-report-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={500} required placeholder={copy.reasonPlaceholder} /></label><div className="admin-community__inline-actions"><Button type="submit" loading={state === 'saving'} disabled={state === 'saving'}>{copy.confirm}</Button><Button type="button" variant="secondary" onClick={onClose}>{copy.action.close}</Button></div>{feedback !== undefined ? <p role="alert" className="admin-community__feedback">{feedback}</p> : null}</form></section>;
}

function Tabs({ locale, view }: { readonly locale: SupportedLocale; readonly view: AdminCommunityView }) {
  const copy = getAdminCommunityCopy(locale);
  const links: readonly [AdminCommunityView, string][] = [['posts', ADMIN_COMMUNITY_POSTS_SCREEN_ROUTE], ['comments', ADMIN_COMMUNITY_COMMENTS_ROUTE], ['reports', ADMIN_COMMUNITY_REPORTS_ROUTE]];
  return <nav className="admin-community__tabs" aria-label={copy.eyebrow}>{links.map(([id, path]) => <a key={id} href={localePath(locale, path)} aria-current={id === view ? 'page' : undefined} data-active={id === view || undefined}>{copy.tab[id]}</a>)}</nav>;
}

export function AdminCommunity({ locale, session, authClient, apiOrigin, initialPosts, initialComments, initialReports, loadPosts, loadComments, loadReports, resolveReport }: AdminCommunityProps) {
  const copy = getAdminCommunityCopy(locale);
  const { pathname, view } = pathnameForView();
  const source = useMemo(() => createAdminCommunitySource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient]);
  const postsLoader = loadPosts ?? source.loadPosts;
  const commentsLoader = loadComments ?? source.loadComments;
  const reportsLoader = loadReports ?? source.loadReports;
  const reportResolver = resolveReport ?? source.resolveReport;
  const sessionAllowed = session.status === 'authenticated' && session.role === 'admin';
  const initialData = view === 'posts' ? initialPosts : view === 'comments' ? initialComments : initialReports;
  const [state, setState] = useState<AdminCommunityState>(() => initialData === undefined ? 'loading' : stateForData(initialData.items));
  const [posts, setPosts] = useState<CommunityAdminPostListData | undefined>(initialPosts);
  const [comments, setComments] = useState<CommunityAdminCommentListData | undefined>(initialComments);
  const [reports, setReports] = useState<CommunityAdminReportListData | undefined>(initialReports);
  const [attempt, setAttempt] = useState(0);
  const [postQuery, setPostQuery] = useState<CommunityAdminPostListQuery>({ page: 1, limit: 20 });
  const [commentQuery, setCommentQuery] = useState<CommunityAdminCommentListQuery>({ page: 1, limit: 20 });
  const [reportQuery, setReportQuery] = useState<CommunityAdminReportListQuery>({ page: 1, limit: 20 });
  const [selectedReport, setSelectedReport] = useState<CommunityAdminReport | undefined>();

  useEffect(() => {
    if (!sessionAllowed) { setState('permission'); return undefined; }
    if (attempt === 0 && initialData !== undefined) return undefined;
    const controller = new AbortController();
    setState('loading');
    const load = view === 'posts' ? postsLoader(postQuery, controller.signal).then(data => { setPosts(data); return data; }) : view === 'comments' ? commentsLoader(commentQuery, controller.signal).then(data => { setComments(data); return data; }) : reportsLoader(reportQuery, controller.signal).then(data => { setReports(data); return data; });
    void load.then(data => { if (!controller.signal.aborted) setState(stateForData(data.items)); }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, commentsLoader, commentQuery, initialData, postsLoader, postQuery, reportsLoader, reportQuery, sessionAllowed, view]);

  const data = view === 'posts' ? posts : view === 'comments' ? comments : reports;
  const refresh = () => setAttempt(value => value + 1);
  const applyFilters = (input: Record<string, string>) => {
    if (view === 'posts') setPostQuery(communityAdminPostListQuerySchema.parse({ ...postQuery, page: 1, ...input }));
    else if (view === 'comments') setCommentQuery(communityAdminCommentListQuerySchema.parse({ ...commentQuery, page: 1, ...input }));
    else setReportQuery(communityAdminReportListQuerySchema.parse({ ...reportQuery, page: 1, ...input }));
    refresh();
  };
  const clearFilters = () => {
    if (view === 'posts') setPostQuery({ page: 1, limit: 20 });
    else if (view === 'comments') setCommentQuery({ page: 1, limit: 20 });
    else setReportQuery({ page: 1, limit: 20 });
    refresh();
  };
  const selectedStatus = view === 'posts' ? postQuery.status ?? '' : view === 'comments' ? commentQuery.status ?? '' : reportQuery.status ?? '';
  const selectStatus = (status: string) => {
    if (view === 'posts') {
      const next = { ...postQuery, page: 1 };
      if (status === '') delete next.status; else next.status = status as CommunityPostStatus;
      setPostQuery(communityAdminPostListQuerySchema.parse(next));
    } else if (view === 'comments') {
      const next = { ...commentQuery, page: 1 };
      if (status === '') delete next.status; else next.status = status as CommunityCommentStatus;
      setCommentQuery(communityAdminCommentListQuerySchema.parse(next));
    } else {
      const next = { ...reportQuery, page: 1 };
      if (status === '') delete next.status; else next.status = status as CommunityReportStatus;
      setReportQuery(communityAdminReportListQuerySchema.parse(next));
    }
    refresh();
  };
  const changePage = (page: number) => {
    if (view === 'posts') setPostQuery(current => ({ ...current, page }));
    else if (view === 'comments') setCommentQuery(current => ({ ...current, page }));
    else setReportQuery(current => ({ ...current, page }));
    refresh();
  };
  const handleResolve = async (reportId: string, input: CommunityReportResolve): Promise<void> => {
    const next = await reportResolver(reportId, input);
    setReports(current => current === undefined ? current : { ...current, items: current.items.map(item => item.id === next.id ? next : item) });
    setSelectedReport(undefined);
  };

  const title = copy.title[view];
  return <section className="admin-community" data-screen-id={view === 'posts' ? 'ADM-27' : view === 'comments' ? 'ADM-28' : 'ADM-29'} data-route={pathname} data-device-scope="desktop" data-admin-community-state={state}><AdminNavigation locale={locale} activePath={pathname} /><div className="admin-community__content"><header className="admin-community__heading"><div><p className="admin-community__eyebrow">{copy.eyebrow}</p><h1>{title}</h1><p>{copy.description[view]}</p><span className="admin-community__direction-note">{copy.directionNote}</span></div></header><Tabs locale={locale} view={view} /><SummaryCards data={data} locale={locale} view={view} /><StatusStrip view={view} locale={locale} selected={selectedStatus} onSelect={selectStatus} /><Filters view={view} locale={locale} onApply={applyFilters} onClear={clearFilters} />{state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={refresh} /> : null}{state === 'empty' ? <EmptyPanel locale={locale} /> : null}{state === 'success' && data !== undefined ? <section className="admin-community__panel"><div className="admin-community__panel-heading"><div><h2>{title}</h2><span>{copy.page(data.page, Math.max(1, Math.ceil(data.total / Math.max(1, data.limit))))}</span></div></div>{view === 'posts' ? <PostTable items={posts?.items ?? []} locale={locale} /> : view === 'comments' ? <CommentTable items={comments?.items ?? []} locale={locale} /> : <ReportTable items={reports?.items ?? []} locale={locale} onReview={setSelectedReport} />}<Pagination locale={locale} page={data.page} limit={data.limit} total={data.total} onPage={changePage} /></section> : null}{selectedReport !== undefined ? <ReportResolution report={selectedReport} locale={locale} onClose={() => setSelectedReport(undefined)} onResolve={handleResolve} /> : null}</div></section>;
}
