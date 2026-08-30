import { useEffect, useMemo, useState } from 'react';
import type {
  AdAdminRequest,
  AdAdminRequestListData,
  AdAdminRequestListQuery,
  AdCalendarListData,
  AdFinancialReviewListData,
  AdFinancialReviewQuery,
  AdFinancialReviewRow,
  AdLedgerListData,
  PaymentProofAdminListData,
  PaymentProofData,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import {
  ADMIN_ADS_APPROVED_PROOFS_ROUTE,
  ADMIN_ADS_CALENDAR_ROUTE,
  ADMIN_ADS_FINANCIAL_REVIEW_ROUTE,
  ADMIN_ADS_PENDING_PROOFS_ROUTE,
  ADMIN_ADS_PENDING_REVIEW_ROUTE,
  ADMIN_ADS_REQUESTS_ROUTE,
  createAdminAdsSource,
  type AdminAdsAuthorizationSource,
  type AdminAdsCalendarLoader,
  type AdminAdsFinancialDetailLoader,
  type AdminAdsFinancialReviewLoader,
  type AdminAdsLedgerLoader,
  type AdminAdsPaymentProofLoader,
  type AdminAdsPaymentProofReviewMutation,
  type AdminAdsRequestDetailLoader,
  type AdminAdsRequestLoader
} from './data.ts';
import { getAdminAdsCopy, type AdminAdsState } from './copy.ts';
import './styles.css';

export interface AdminAdsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: AdminAdsAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly url?: string | undefined;
  readonly loadRequests?: AdminAdsRequestLoader | undefined;
  readonly loadRequestDetail?: AdminAdsRequestDetailLoader | undefined;
  readonly loadPaymentProofs?: AdminAdsPaymentProofLoader | undefined;
  readonly reviewPaymentProof?: AdminAdsPaymentProofReviewMutation | undefined;
  readonly loadCalendar?: AdminAdsCalendarLoader | undefined;
  readonly loadFinancialReview?: AdminAdsFinancialReviewLoader | undefined;
  readonly loadFinancialDetail?: AdminAdsFinancialDetailLoader | undefined;
  readonly loadLedger?: AdminAdsLedgerLoader | undefined;
}

type AdminAdsView = 'requests' | 'pendingProofs' | 'approvedProofs' | 'calendar' | 'review' | 'financial';
type LoadedPayload =
  | { readonly kind: 'requests'; readonly data: AdAdminRequestListData }
  | { readonly kind: 'requestDetail'; readonly data: AdAdminRequest }
  | { readonly kind: 'proofs'; readonly data: PaymentProofAdminListData }
  | { readonly kind: 'calendar'; readonly data: AdCalendarListData }
  | { readonly kind: 'financial'; readonly data: AdFinancialReviewListData; readonly ledger: AdLedgerListData }
  | { readonly kind: 'financialDetail'; readonly data: AdFinancialReviewRow };

interface ViewProjection {
  readonly view: AdminAdsView;
  readonly route: string;
  readonly screenId: 'ADM-33' | 'ADM-34' | 'ADM-35' | 'ADM-36' | 'ADM-37' | 'ADM-38';
}

const requestStatuses: readonly NonNullable<AdAdminRequestListQuery['status']>[] = ['draft', 'review', 'waiting_pricing', 'quote_sent', 'waiting_payment', 'scheduled', 'active', 'ended', 'rejected', 'cancelled', 'expired'];
const financialStatuses: readonly NonNullable<AdFinancialReviewQuery['status']>[] = ['all', 'quote_only', 'payment_pending_review', 'payment_approved', 'payment_rejected', 'scheduled', 'active', 'ended'];

function pathnameFrom(url: string | undefined): string {
  if (typeof window !== 'undefined') return new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  if (url !== undefined) return new URL(url, 'http://sadat-real-estate.local').pathname.replace(/\/+$/u, '') || '/';
  return ADMIN_ADS_REQUESTS_ROUTE;
}

function projectionForPath(pathname: string): ViewProjection {
  if (pathname === ADMIN_ADS_PENDING_PROOFS_ROUTE) return { view: 'pendingProofs', route: ADMIN_ADS_PENDING_PROOFS_ROUTE, screenId: 'ADM-34' };
  if (pathname === ADMIN_ADS_APPROVED_PROOFS_ROUTE) return { view: 'approvedProofs', route: ADMIN_ADS_APPROVED_PROOFS_ROUTE, screenId: 'ADM-35' };
  if (pathname === ADMIN_ADS_CALENDAR_ROUTE) return { view: 'calendar', route: ADMIN_ADS_CALENDAR_ROUTE, screenId: 'ADM-36' };
  if (pathname === ADMIN_ADS_PENDING_REVIEW_ROUTE) return { view: 'review', route: ADMIN_ADS_PENDING_REVIEW_ROUTE, screenId: 'ADM-37' };
  if (pathname === ADMIN_ADS_FINANCIAL_REVIEW_ROUTE) return { view: 'financial', route: ADMIN_ADS_FINANCIAL_REVIEW_ROUTE, screenId: 'ADM-38' };
  return { view: 'requests', route: ADMIN_ADS_REQUESTS_ROUTE, screenId: 'ADM-33' };
}

function localePath(locale: SupportedLocale, path: string): string {
  const next = new URL(path, 'http://sadat-real-estate.local');
  next.searchParams.set('lang', locale);
  return `${next.pathname}${next.search}${next.hash}`;
}

function dateLabel(value: string | undefined, locale: SupportedLocale): string {
  if (value === undefined) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function moneyLabel(minor: number | undefined, currency: string | undefined, locale: SupportedLocale): string {
  if (minor === undefined || currency === undefined) return '—';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${minor / 100} ${currency}`;
  }
}

function stateForError(error: unknown, detail = false): Exclude<AdminAdsState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (detail && error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForPayload(payload: LoadedPayload, selectedId: string | undefined): AdminAdsState {
  if (payload.kind === 'requestDetail' || payload.kind === 'financialDetail') return selectedId === undefined ? 'success' : 'success';
  if (payload.kind === 'financial') return payload.data.items.length === 0 && payload.ledger.items.length === 0 ? 'empty' : 'success';
  return payload.data.items.length === 0 ? 'empty' : 'success';
}

function toneForStatus(status: string): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
  if (['approved', 'active', 'scheduled', 'ended', 'clean'].includes(status)) return 'success';
  if (['pending_review', 'uploaded', 'scan_pending', 'review', 'waiting_pricing', 'quote_sent', 'waiting_payment'].includes(status)) return 'warning';
  if (['quote_only', 'payment_proof_pending_review', 'payment_proof_approved'].includes(status)) return 'info';
  if (['rejected', 'cancelled', 'expired', 'infected', 'scan_failed'].includes(status)) return 'error';
  return 'neutral';
}

function StatusBadge({ label, status }: { readonly label: string; readonly status: string }) {
  return <span className="admin-ads__badge" data-tone={toneForStatus(status)} data-status={status}>{label}</span>;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminAdsState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminAdsCopy(locale);
  const message = copy.states[state];
  return <section className="admin-ads__state" data-state={state} aria-label={message.title}><StateMessage state={state} title={message.title} message={message.body} retryLabel={copy.next} onRetry={state === 'retry' ? onRetry : undefined} />{state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.next}</Button> : null}</section>;
}

function NotFoundPanel({ locale }: { readonly locale: SupportedLocale }) {
  const message = getAdminAdsCopy(locale).states.not_found;
  return <section className="admin-ads__state" data-state="not_found" aria-label={message.title}><h2>{message.title}</h2><p>{message.body}</p></section>;
}

function Pagination({ page, limit, total, locale, onPrevious, onNext }: { readonly page: number; readonly limit: number; readonly total: number; readonly locale: SupportedLocale; readonly onPrevious: () => void; readonly onNext: () => void }) {
  const copy = getAdminAdsCopy(locale);
  const pages = Math.max(1, Math.ceil(total / limit));
  return <div className="admin-ads__pagination"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={onPrevious}>{copy.previous}</Button><span aria-live="polite">{copy.page(page, pages)}</span><Button size="sm" variant="secondary" disabled={page >= pages} onClick={onNext}>{copy.next}</Button></div>;
}

function TableFrame({ title, count, children, note }: { readonly title: string; readonly count: string; readonly children: React.ReactNode; readonly note?: string | undefined }) {
  return <section className="admin-ads__panel"><div className="admin-ads__panel-heading"><div><h2>{title}</h2><p>{count}</p></div>{note !== undefined ? <span className="admin-ads__note">{note}</span> : null}</div>{children}</section>;
}

interface AdsMetric {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

function AdsMetricStrip({ metrics, locale, testId }: { readonly metrics: readonly AdsMetric[]; readonly locale: SupportedLocale; readonly testId: string }) {
  return <div data-testid={testId} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: 1320, margin: '0 auto 12px' }}>{metrics.map(metric => <article className="admin-dashboard__metric" key={metric.label}><strong style={{ color: metric.color }}>{new Intl.NumberFormat(locale).format(metric.value)}</strong><span>{metric.label}</span></article>)}</div>;
}

function RequestsTable({ data, locale, onDetail }: { readonly data: AdAdminRequestListData; readonly locale: SupportedLocale; readonly onDetail: (id: string) => void }) {
  const copy = getAdminAdsCopy(locale);
  const count = (status: AdAdminRequestListQuery['status']) => data.items.filter(item => item.request.status === status).length;
  const labels = locale === 'ar'
    ? ['طلبات جديدة', 'في انتظار التسعير', 'في انتظار الموافقة', 'في انتظار الدفع', 'مجدولة', 'نشطة', 'منتهية', 'مرفوضة'] as const
    : locale === 'zh-CN'
      ? ['新请求', '等待定价', '等待批准', '等待付款', '已排期', '进行中', '已结束', '已拒绝'] as const
      : ['New requests', 'Awaiting pricing', 'Awaiting approval', 'Awaiting payment', 'Scheduled', 'Active', 'Ended', 'Rejected'] as const;
  const metrics: readonly AdsMetric[] = [
    { label: labels[0], value: count('draft'), color: '#2f73d9' },
    { label: labels[1], value: count('waiting_pricing'), color: '#bd7414' },
    { label: labels[2], value: count('review') + count('quote_sent'), color: '#5b49d6' },
    { label: labels[3], value: count('waiting_payment'), color: '#d6561d' },
    { label: labels[4], value: count('scheduled'), color: '#138a4b' },
    { label: labels[5], value: count('active'), color: '#138a4b' },
    { label: labels[6], value: count('ended'), color: '#667085' },
    { label: labels[7], value: count('rejected'), color: '#c81e1e' }
  ];
  return <><AdsMetricStrip metrics={metrics} locale={locale} testId="admin-ad-request-metrics" /><div className="admin-ads__table-wrap"><table className="admin-ads__table"><thead><tr><th scope="col">{copy.columns.id}</th><th scope="col">{copy.columns.provider}</th><th scope="col">{copy.columns.placement}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.quote}</th><th scope="col">{copy.columns.interval}</th><th scope="col">{copy.columns.actions}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.request.id} data-testid={`admin-ad-request-${item.request.id}`}><td><code>{item.request.id}</code></td><td><code>{item.request.providerId}</code></td><td>{item.request.placementKey}</td><td><StatusBadge status={item.request.status} label={copy.requestStatus[item.request.status] ?? item.request.status} /></td><td>{item.quote === undefined ? copy.unavailable : <><StatusBadge status={item.quote.status} label={item.quote.status} /><span className="admin-ads__stacked-value">{moneyLabel(item.quote.totalMinor, item.quote.currency, locale)}</span></>}</td><td>{dateLabel(item.request.intervalStart, locale)}<br />{dateLabel(item.request.intervalEnd, locale)}</td><td><Button size="sm" variant="secondary" onClick={() => onDetail(item.request.id)}>{copy.view}</Button></td></tr>)}</tbody></table></div></>;
}

function RequestDetail({ data, locale, onBack }: { readonly data: AdAdminRequest; readonly locale: SupportedLocale; readonly onBack: () => void }) {
  const copy = getAdminAdsCopy(locale);
  return <section className="admin-ads__detail"><div className="admin-ads__detail-heading"><div><p className="admin-ads__eyebrow">{copy.eyebrow}</p><h2>{copy.detail}</h2></div><Button variant="secondary" onClick={onBack}>{copy.back}</Button></div><dl className="admin-ads__detail-list"><div><dt>{copy.columns.id}</dt><dd><code>{data.request.id}</code></dd></div><div><dt>{copy.columns.provider}</dt><dd><code>{data.request.providerId}</code></dd></div><div><dt>{copy.columns.placement}</dt><dd>{data.request.placementKey}</dd></div><div><dt>{copy.columns.purpose}</dt><dd>{data.request.purpose}</dd></div><div><dt>{copy.columns.status}</dt><dd><StatusBadge status={data.request.status} label={copy.requestStatus[data.request.status] ?? data.request.status} /></dd></div><div><dt>{copy.columns.interval}</dt><dd>{dateLabel(data.request.intervalStart, locale)} — {dateLabel(data.request.intervalEnd, locale)}</dd></div><div><dt>{copy.columns.version}</dt><dd>{data.request.version}</dd></div>{data.quote !== undefined ? <div><dt>{copy.columns.quote}</dt><dd>{moneyLabel(data.quote.totalMinor, data.quote.currency, locale)} · {data.quote.status}</dd></div> : null}</dl>{data.quote !== undefined ? <div className="admin-ads__quote-lines"><h3>{copy.columns.quote}</h3><ul>{data.quote.lineItems.map((line, index) => <li key={`${line.description}-${index}`}><span>{line.description} × {line.quantity}</span><strong>{moneyLabel(line.unitAmountMinor * line.quantity, data.quote?.currency, locale)}</strong></li>)}</ul></div> : null}</section>;
}

function PaymentProofTable({ data, locale, review, onReview }: { readonly data: PaymentProofAdminListData; readonly locale: SupportedLocale; readonly review: boolean; readonly onReview: (id: string) => void }) {
  const copy = getAdminAdsCopy(locale);
  const countStatus = (status: PaymentProofData['status']) => data.items.filter(item => item.status === status).length;
  const securityAttention = data.items.filter(item => item.securityState !== 'clean').length;
  const labels = locale === 'ar'
    ? ['إجمالي الإثباتات', 'السجلات المعروضة', 'قيد المراجعة', 'تحتاج فحصًا أمنيًا', 'مقبولة', 'مرفوضة', 'ملفات نظيفة', 'قابلة للمراجعة'] as const
    : locale === 'zh-CN'
      ? ['证明总数', '当前记录', '审核中', '需要安全检查', '已批准', '已拒绝', '安全文件', '可审核'] as const
      : ['Total proofs', 'Loaded records', 'Under review', 'Security attention', 'Approved', 'Rejected', 'Clean files', 'Reviewable'] as const;
  const metrics: readonly AdsMetric[] = review
    ? [
        { label: labels[0], value: data.total, color: '#1f355f' },
        { label: labels[1], value: data.items.length, color: '#4263a5' },
        { label: labels[2], value: countStatus('pending_review'), color: '#bd7414' },
        { label: labels[3], value: securityAttention, color: '#d6561d' },
        { label: labels[4], value: countStatus('approved'), color: '#138a4b' },
        { label: labels[5], value: countStatus('rejected'), color: '#c81e1e' },
        { label: labels[6], value: data.items.filter(item => item.securityState === 'clean').length, color: '#138a4b' },
        { label: labels[7], value: data.items.filter(item => item.status === 'pending_review' && item.securityState === 'clean').length, color: '#5b49d6' }
      ]
    : [
        { label: labels[0], value: data.total, color: '#1f355f' },
        { label: labels[1], value: data.items.length, color: '#4263a5' },
        { label: labels[2], value: countStatus('pending_review'), color: '#bd7414' },
        { label: labels[3], value: securityAttention, color: '#d6561d' }
      ];
  const showMetrics = review || data.items.some(item => item.status === 'pending_review');
  return <>{showMetrics ? <AdsMetricStrip metrics={metrics} locale={locale} testId={review ? 'admin-payment-review-metrics' : 'admin-payment-proof-metrics'} /> : null}<div className="admin-ads__table-wrap"><table className="admin-ads__table"><thead><tr><th scope="col">{copy.columns.id}</th><th scope="col">{copy.columns.request}</th><th scope="col">{copy.columns.provider}</th><th scope="col">{copy.columns.filename}</th><th scope="col">{copy.columns.size}</th><th scope="col">{copy.columns.security}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.version}</th><th scope="col">{copy.columns.uploaded}</th>{review ? <th scope="col">{copy.columns.actions}</th> : null}</tr></thead><tbody>{data.items.map(item => <tr key={item.id} data-testid={`admin-payment-proof-${item.id}`}><td><code>{item.id}</code></td><td><code>{item.adRequestId}</code></td><td><code>{item.providerId}</code></td><td>{item.originalFilename}</td><td>{Math.round(item.byteSize / 1024)} KB</td><td><StatusBadge status={item.securityState} label={item.securityState} /></td><td><StatusBadge status={item.status} label={copy.proofStatus[item.status] ?? item.status} /></td><td>{item.version}</td><td>{dateLabel(item.uploadedAt, locale)}</td>{review ? <td><Button size="sm" variant="secondary" onClick={() => onReview(item.id)}>{copy.reviewAction}</Button></td> : null}</tr>)}</tbody></table></div></>;
}

function ReviewPanel({ proof, locale, review, onSaved }: { readonly proof: PaymentProofData; readonly locale: SupportedLocale; readonly review: AdminAdsPaymentProofReviewMutation; readonly onSaved: () => void }) {
  const copy = getAdminAdsCopy(locale);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'permission' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | undefined>(undefined);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (reason.trim().length < 2) {
      setFeedback(copy.reasonRequired);
      return;
    }
    setState('saving');
    setFeedback(undefined);
    try {
      await review(proof.id, { action, expectedVersion: proof.version, reason: reason.trim() });
      setState('idle');
      setFeedback(undefined);
      onSaved();
    } catch (error) {
      setState(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? 'permission' : 'error');
      setFeedback(error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.states.permission.body : copy.states.error.body);
    }
  }

  return <form className="admin-ads__review-card" onSubmit={event => { void submit(event); }}><h3>{copy.reviewAction}</h3><p className="admin-ads__muted">{proof.originalFilename} · {copy.columns.version}: {proof.version}</p><fieldset disabled={state === 'saving' || state === 'permission'}><legend>{copy.reviewAction}</legend><div className="admin-ads__action-list"><label><input type="radio" name="admin-ads-review-action" value="approve" checked={action === 'approve'} onChange={() => setAction('approve')} />{copy.approve}</label><label><input type="radio" name="admin-ads-review-action" value="reject" checked={action === 'reject'} onChange={() => setAction('reject')} />{copy.reject}</label></div><label className="admin-ads__field" htmlFor="admin-ads-review-reason">{copy.reasonLabel}<textarea id="admin-ads-review-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={2} maxLength={500} required placeholder={copy.reasonPlaceholder} /></label><Button type="submit" loading={state === 'saving'} disabled={state === 'permission'}>{state === 'saving' ? copy.reviewing : copy.reviewAction}</Button></fieldset>{feedback !== undefined ? <p className="admin-ads__feedback" data-tone={state === 'error' || state === 'permission' ? 'error' : 'success'} role={state === 'error' || state === 'permission' ? 'alert' : 'status'}>{feedback}</p> : null}</form>;
}

function CalendarTable({ data, locale }: { readonly data: AdCalendarListData; readonly locale: SupportedLocale }) {
  const copy = getAdminAdsCopy(locale);
  return <div className="admin-ads__table-wrap"><table className="admin-ads__table"><thead><tr><th scope="col">{copy.columns.request}</th><th scope="col">{copy.columns.provider}</th><th scope="col">{copy.columns.placement}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.start}</th><th scope="col">{copy.columns.end}</th><th scope="col">{copy.columns.timezone}</th></tr></thead><tbody>{data.items.map(item => <tr key={`${item.requestId}-${item.version}`} data-testid={`admin-ad-calendar-${item.requestId}`}><td><code>{item.requestId}</code></td><td><code>{item.providerId}</code></td><td>{item.placementKey}</td><td><StatusBadge status={item.status} label={copy.calendarStatus[item.status] ?? item.status} /></td><td>{dateLabel(item.startsAt, locale)}</td><td>{dateLabel(item.endsAt, locale)}</td><td>{item.timezone}</td></tr>)}</tbody></table></div>;
}

function FinancialTable({ data, locale, onDetail }: { readonly data: AdFinancialReviewListData; readonly locale: SupportedLocale; readonly onDetail: (id: string) => void }) {
  const copy = getAdminAdsCopy(locale);
  const count = (predicate: (item: AdFinancialReviewListData['items'][number]) => boolean) => data.items.filter(predicate).length;
  const labels = locale === 'ar'
    ? ['عروض أسعار مرسلة', 'المبالغ في انتظار الدفع', 'إثباتات الدفع قيد المراجعة', 'مدفوعات معتمدة', 'طلبات مغلقة', 'إعلانات نشطة'] as const
    : locale === 'zh-CN'
      ? ['已发送报价', '待付款金额', '审核中的付款证明', '已批准付款', '已关闭请求', '活跃广告'] as const
      : ['Quotes issued', 'Payments awaiting action', 'Proofs under review', 'Approved payments', 'Closed requests', 'Active ads'] as const;
  const metrics: readonly AdsMetric[] = [
    { label: labels[0], value: count(item => item.quoteStatus !== undefined), color: '#4263a5' },
    { label: labels[1], value: count(item => item.financialState === 'payment_proof_pending_review' || item.requestStatus === 'waiting_payment'), color: '#d6561d' },
    { label: labels[2], value: count(item => item.paymentProofStatus === 'pending_review'), color: '#bd7414' },
    { label: labels[3], value: count(item => item.paymentProofStatus === 'approved'), color: '#138a4b' },
    { label: labels[4], value: count(item => item.requestStatus === 'ended'), color: '#667085' },
    { label: labels[5], value: count(item => item.requestStatus === 'active'), color: '#138a4b' }
  ];
  return <><AdsMetricStrip metrics={metrics} locale={locale} testId="admin-financial-metrics" /><div className="admin-ads__table-wrap"><table className="admin-ads__table"><thead><tr><th scope="col">{copy.columns.request}</th><th scope="col">{copy.columns.provider}</th><th scope="col">{copy.columns.placement}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.quote}</th><th scope="col">{copy.columns.state}</th><th scope="col">{copy.columns.interval}</th><th scope="col">{copy.columns.actions}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.requestId} data-testid={`admin-financial-row-${item.requestId}`}><td><code>{item.requestId}</code></td><td><code>{item.providerId}</code></td><td>{item.placementKey}</td><td><StatusBadge status={item.requestStatus} label={copy.requestStatus[item.requestStatus] ?? item.requestStatus} /></td><td>{moneyLabel(item.quotedTotalMinor, item.quoteCurrency, locale)}</td><td><StatusBadge status={item.financialState} label={copy.financialState[item.financialState] ?? item.financialState} /><small className="admin-ads__stacked-value">{copy.columns.status}: {item.paymentProofStatus ?? copy.unavailable}</small></td><td>{dateLabel(item.intervalStart, locale)}<br />{dateLabel(item.intervalEnd, locale)}</td><td><Button size="sm" variant="secondary" onClick={() => onDetail(item.requestId)}>{copy.view}</Button></td></tr>)}</tbody></table></div></>;
}

function LedgerTable({ data, locale }: { readonly data: AdLedgerListData; readonly locale: SupportedLocale }) {
  const copy = getAdminAdsCopy(locale);
  return <div className="admin-ads__table-wrap"><table className="admin-ads__table"><thead><tr><th scope="col">{copy.columns.id}</th><th scope="col">{copy.columns.request}</th><th scope="col">{copy.columns.source}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.occurred}</th><th scope="col">{copy.columns.amount}</th><th scope="col">{copy.columns.state}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id} data-testid={`admin-ledger-${item.id}`}><td><code>{item.id}</code></td><td><code>{item.requestId}</code></td><td>{item.source}</td><td>{copy.ledgerKind[item.kind] ?? item.kind}</td><td>{dateLabel(item.occurredAt, locale)}</td><td>{moneyLabel(item.amountMinor, item.currency, locale)}</td><td>{item.accountingTreatment}</td></tr>)}</tbody></table></div>;
}

function EmptyPanel({ locale }: { readonly locale: SupportedLocale }) {
  const message = getAdminAdsCopy(locale).states.empty;
  return <section className="admin-ads__state" data-state="empty" aria-label={message.title}><h2>{message.title}</h2><p>{message.body}</p></section>;
}

export function AdminAds({ locale, session, authClient, apiOrigin, url, loadRequests, loadRequestDetail, loadPaymentProofs, reviewPaymentProof, loadCalendar, loadFinancialReview, loadFinancialDetail, loadLedger }: AdminAdsProps) {
  const copy = getAdminAdsCopy(locale);
  const pathname = pathnameFrom(url);
  const projection = projectionForPath(pathname);
  const selectedRequestId = typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('requestId') ?? undefined : url === undefined ? undefined : new URL(url, 'http://sadat-real-estate.local').searchParams.get('requestId') ?? undefined;
  const selectedProofId = typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('proofId') ?? undefined : url === undefined ? undefined : new URL(url, 'http://sadat-real-estate.local').searchParams.get('proofId') ?? undefined;
  const source = useMemo(() => createAdminAdsSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient]);
  const loaders = useMemo(() => ({
    loadRequests: loadRequests ?? source.loadRequests,
    loadRequestDetail: loadRequestDetail ?? source.loadRequestDetail,
    loadPaymentProofs: loadPaymentProofs ?? source.loadPaymentProofs,
    reviewPaymentProof: reviewPaymentProof ?? source.reviewPaymentProof,
    loadCalendar: loadCalendar ?? source.loadCalendar,
    loadFinancialReview: loadFinancialReview ?? source.loadFinancialReview,
    loadFinancialDetail: loadFinancialDetail ?? source.loadFinancialDetail,
    loadLedger: loadLedger ?? source.loadLedger
  }), [loadCalendar, loadFinancialDetail, loadFinancialReview, loadLedger, loadPaymentProofs, loadRequestDetail, loadRequests, reviewPaymentProof, source]);
  const [state, setState] = useState<AdminAdsState>('loading');
  const [payload, setPayload] = useState<LoadedPayload | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [requestQuery, setRequestQuery] = useState<AdAdminRequestListQuery>({ page: 1, limit: 20 });
  const [requestStatus, setRequestStatus] = useState<AdAdminRequestListQuery['status'] | ''>('');
  const [providerId, setProviderId] = useState('');
  const [providerError, setProviderError] = useState(false);
  const [financialQuery, setFinancialQuery] = useState<AdFinancialReviewQuery>({ status: 'all', page: 1, limit: 20 });
  const [financialStatus, setFinancialStatus] = useState<AdFinancialReviewQuery['status'] | ''>('all');
  const [reviewFeedback, setReviewFeedback] = useState<string | undefined>(undefined);

  const sessionAllowed = session.status === 'authenticated' && session.role === 'admin';

  useEffect(() => {
    if (!sessionAllowed) {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    setPayload(undefined);
    if (projection.view !== 'review') setReviewFeedback(undefined);
    const detail = projection.view === 'requests' && selectedRequestId !== undefined;
    const financialDetail = projection.view === 'financial' && selectedRequestId !== undefined;
    let request: Promise<LoadedPayload>;
    if (detail) request = loaders.loadRequestDetail(selectedRequestId!, controller.signal).then(data => ({ kind: 'requestDetail', data }));
    else if (financialDetail) request = loaders.loadFinancialDetail(selectedRequestId!, controller.signal).then(data => ({ kind: 'financialDetail', data }));
    else if (projection.view === 'requests') request = loaders.loadRequests(requestQuery, controller.signal).then(data => ({ kind: 'requests', data }));
    else if (projection.view === 'pendingProofs') request = loaders.loadPaymentProofs({ status: 'pending_review', page: 1, limit: 20 }, controller.signal).then(data => ({ kind: 'proofs', data }));
    else if (projection.view === 'approvedProofs') request = loaders.loadPaymentProofs({ status: 'approved', page: 1, limit: 20 }, controller.signal).then(data => ({ kind: 'proofs', data }));
    else if (projection.view === 'review') request = loaders.loadPaymentProofs({ status: 'pending_review', page: 1, limit: 20 }, controller.signal).then(data => ({ kind: 'proofs', data }));
    else if (projection.view === 'calendar') request = loaders.loadCalendar({ page: 1, limit: 50 }, controller.signal).then(data => ({ kind: 'calendar', data }));
    else request = Promise.all([loaders.loadFinancialReview(financialQuery, controller.signal), loaders.loadLedger({ page: 1, limit: 20 }, controller.signal)]).then(([data, ledger]) => ({ kind: 'financial', data, ledger }));
    void request.then(nextPayload => {
      if (controller.signal.aborted) return;
      setPayload(nextPayload);
      const selected = detail || financialDetail ? selectedRequestId : projection.view === 'review' ? selectedProofId : undefined;
      setState(stateForPayload(nextPayload, selected));
    }).catch(error => {
      if (!controller.signal.aborted) {
        setReviewFeedback(undefined);
        setState(stateForError(error, detail || financialDetail || (projection.view === 'review' && selectedProofId !== undefined)));
      }
    });
    return () => controller.abort();
  }, [attempt, financialQuery, loaders, projection.view, requestQuery, selectedProofId, selectedRequestId, sessionAllowed]);

  function applyRequestFilters(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next: AdAdminRequestListQuery = { page: 1, limit: 20 };
    if (requestStatus !== '') next.status = requestStatus;
    if (providerId.trim() !== '') {
      if (!/^[a-f0-9]{24}$/u.test(providerId.trim())) {
        setProviderError(true);
        return;
      }
      next.providerId = providerId.trim();
    }
    setProviderError(false);
    setRequestQuery(next);
    setAttempt(value => value + 1);
  }

  function applyFinancialFilters(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFinancialQuery({ status: financialStatus === '' ? 'all' : financialStatus, page: 1, limit: 20 });
    setAttempt(value => value + 1);
  }

  function go(path: string): void {
    window.location.href = localePath(locale, path);
  }

  const tabs = [
    [ADMIN_ADS_REQUESTS_ROUTE, copy.tabs.requests],
    [ADMIN_ADS_PENDING_PROOFS_ROUTE, copy.tabs.pendingProofs],
    [ADMIN_ADS_APPROVED_PROOFS_ROUTE, copy.tabs.approvedProofs],
    [ADMIN_ADS_CALENDAR_ROUTE, copy.tabs.calendar],
    [ADMIN_ADS_PENDING_REVIEW_ROUTE, copy.tabs.review],
    [ADMIN_ADS_FINANCIAL_REVIEW_ROUTE, copy.tabs.financial]
  ] as const;
  const selectedProof = payload?.kind === 'proofs' ? payload.data.items.find(item => item.id === selectedProofId) ?? (projection.view === 'review' ? payload.data.items[0] : undefined) : undefined;
  const selectedRequest = payload?.kind === 'requestDetail' ? payload.data : undefined;
  const selectedFinancial = payload?.kind === 'financialDetail' ? payload.data : undefined;

  return <section className="admin-ads" data-screen-id={projection.screenId} data-route={projection.route} data-device-scope="desktop" data-admin-ads-state={state}>
    <AdminNavigation locale={locale} activePath="/admin/advertising" />
    <div className="admin-ads__content">
      <header className="admin-ads__heading"><div><p className="admin-ads__eyebrow">{copy.eyebrow}</p><h1>{copy.titles[projection.view]}</h1><p>{copy.descriptions[projection.view]}</p></div></header>
      <nav className="admin-ads__tabs" aria-label={copy.eyebrow}>{tabs.map(([path, label]) => <a key={path} href={localePath(locale, path)} aria-current={projection.route === path ? 'page' : undefined} data-active={projection.route === path || undefined}>{label}</a>)}</nav>
      {projection.view === 'requests' && selectedRequest === undefined ? <form className="admin-ads__filters" role="search" aria-label={copy.searchLabel} onSubmit={applyRequestFilters}><label htmlFor="admin-ads-provider">{copy.searchLabel}<input id="admin-ads-provider" value={providerId} onChange={event => { setProviderId(event.target.value); setProviderError(false); }} placeholder={copy.providerPlaceholder} inputMode="text" /></label><label htmlFor="admin-ads-request-status">{copy.statusLabel}<select id="admin-ads-request-status" value={requestStatus} onChange={event => setRequestStatus(event.target.value as AdAdminRequestListQuery['status'] | '')}><option value="">{copy.allStatuses}</option>{requestStatuses.map(status => <option key={status} value={status}>{copy.requestStatus[status]}</option>)}</select></label><Button type="submit">{copy.apply}</Button><Button type="button" variant="secondary" onClick={() => { setProviderId(''); setRequestStatus(''); setRequestQuery({ page: 1, limit: 20 }); setProviderError(false); setAttempt(value => value + 1); }}>{copy.clear}</Button>{providerError ? <p className="admin-ads__filter-error" role="alert">{copy.states.error.body}</p> : null}</form> : null}
      {projection.view === 'financial' && selectedFinancial === undefined ? <form className="admin-ads__filters" role="search" aria-label={copy.statusLabel} onSubmit={applyFinancialFilters}><label htmlFor="admin-ads-financial-status">{copy.statusLabel}<select id="admin-ads-financial-status" value={financialStatus} onChange={event => setFinancialStatus(event.target.value as AdFinancialReviewQuery['status'] | '')}>{financialStatuses.map(status => <option key={status} value={status}>{copy.financialState[status] ?? status}</option>)}</select></label><Button type="submit">{copy.apply}</Button></form> : null}
      {state === 'loading' || state === 'error' || state === 'retry' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
      {reviewFeedback !== undefined ? <p className="admin-ads__feedback" data-tone="success" role="status">{reviewFeedback}</p> : null}
      {state === 'not_found' ? <NotFoundPanel locale={locale} /> : null}
      {state === 'empty' ? <EmptyPanel locale={locale} /> : null}
      {state === 'success' && selectedRequest !== undefined ? <RequestDetail data={selectedRequest} locale={locale} onBack={() => go(ADMIN_ADS_REQUESTS_ROUTE)} /> : null}
      {state === 'success' && selectedFinancial !== undefined ? <section className="admin-ads__detail"><div className="admin-ads__detail-heading"><div><p className="admin-ads__eyebrow">{copy.eyebrow}</p><h2>{copy.detail}</h2></div><Button variant="secondary" onClick={() => go(ADMIN_ADS_FINANCIAL_REVIEW_ROUTE)}>{copy.back}</Button></div><dl className="admin-ads__detail-list"><div><dt>{copy.columns.request}</dt><dd><code>{selectedFinancial.requestId}</code></dd></div><div><dt>{copy.columns.provider}</dt><dd><code>{selectedFinancial.providerId}</code></dd></div><div><dt>{copy.columns.placement}</dt><dd>{selectedFinancial.placementKey}</dd></div><div><dt>{copy.columns.status}</dt><dd><StatusBadge status={selectedFinancial.requestStatus} label={copy.requestStatus[selectedFinancial.requestStatus] ?? selectedFinancial.requestStatus} /></dd></div><div><dt>{copy.columns.state}</dt><dd><StatusBadge status={selectedFinancial.financialState} label={copy.financialState[selectedFinancial.financialState] ?? selectedFinancial.financialState} /></dd></div><div><dt>{copy.columns.quote}</dt><dd>{moneyLabel(selectedFinancial.quotedTotalMinor, selectedFinancial.quoteCurrency, locale)}</dd></div><div><dt>{copy.columns.interval}</dt><dd>{dateLabel(selectedFinancial.intervalStart, locale)} — {dateLabel(selectedFinancial.intervalEnd, locale)}</dd></div></dl><p className="admin-ads__notice">{copy.notRealized}</p></section> : null}
      {state === 'success' && payload?.kind === 'requests' ? <><TableFrame title={copy.titles.requests} count={copy.count(payload.data.total)} note={copy.directionNote}><RequestsTable data={payload.data} locale={locale} onDetail={id => go(`${ADMIN_ADS_REQUESTS_ROUTE}?requestId=${encodeURIComponent(id)}`)} /><Pagination page={payload.data.page} limit={payload.data.limit} total={payload.data.total} locale={locale} onPrevious={() => { setRequestQuery(current => ({ ...current, page: current.page - 1 })); setAttempt(value => value + 1); }} onNext={() => { setRequestQuery(current => ({ ...current, page: current.page + 1 })); setAttempt(value => value + 1); }} /></TableFrame></> : null}
      {state === 'success' && payload?.kind === 'proofs' ? <><TableFrame title={copy.titles[projection.view]} count={copy.count(payload.data.total)} note={copy.directionNote}><PaymentProofTable data={payload.data} locale={locale} review={projection.view === 'review'} onReview={id => go(`${ADMIN_ADS_PENDING_REVIEW_ROUTE}?proofId=${encodeURIComponent(id)}`)} /><Pagination page={payload.data.page} limit={payload.data.limit} total={payload.data.total} locale={locale} onPrevious={() => setAttempt(value => value + 1)} onNext={() => setAttempt(value => value + 1)} /></TableFrame>{projection.view === 'review' && selectedProof !== undefined ? <ReviewPanel proof={selectedProof} locale={locale} review={loaders.reviewPaymentProof} onSaved={() => { setReviewFeedback(copy.reviewSaved); setAttempt(value => value + 1); }} /> : null}</> : null}
      {state === 'success' && payload?.kind === 'calendar' ? <TableFrame title={copy.titles.calendar} count={copy.count(payload.data.total)} note={copy.directionNote}><CalendarTable data={payload.data} locale={locale} /><Pagination page={payload.data.page} limit={payload.data.limit} total={payload.data.total} locale={locale} onPrevious={() => setAttempt(value => value + 1)} onNext={() => setAttempt(value => value + 1)} /></TableFrame> : null}
      {state === 'success' && payload?.kind === 'financial' ? <><TableFrame title={copy.titles.financial} count={copy.count(payload.data.total)} note={copy.notRealized}><FinancialTable data={payload.data} locale={locale} onDetail={id => go(`${ADMIN_ADS_FINANCIAL_REVIEW_ROUTE}?requestId=${encodeURIComponent(id)}`)} /><Pagination page={payload.data.page} limit={payload.data.limit} total={payload.data.total} locale={locale} onPrevious={() => setAttempt(value => value + 1)} onNext={() => setAttempt(value => value + 1)} /></TableFrame><TableFrame title={copy.columns.source} count={copy.count(payload.ledger.total)} note={copy.notRealized}><LedgerTable data={payload.ledger} locale={locale} /></TableFrame></> : null}
    </div>
  </section>;
}
