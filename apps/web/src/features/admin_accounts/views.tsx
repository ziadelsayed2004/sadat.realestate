import { useEffect, useMemo, useState } from 'react';
import type {
  AdminAccountUserData,
  AdminAccountUserListData,
  AdminAccountUserListQuery,
  AdminProviderData,
  AdminProviderDocumentData,
  AdminProviderListData,
  AdminProviderListQuery,
  ProviderType,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import {
  createAdminDocumentAccessLoader,
  createAdminProviderLoader,
  createAdminProvidersLoader,
  createAdminUserLoader,
  createAdminUsersLoader,
  type AdminAccountsAuthorizationSource,
  type AdminDocumentAccessLoader,
  type AdminProviderLoader,
  type AdminProvidersLoader,
  type AdminUserLoader,
  type AdminUsersLoader
} from './data.ts';
import { getAdminAccountsCopy, type AdminAccountsState, type AdminAccountsView } from './copy.ts';
import './styles.css';

type UserRoleFilter = 'all' | 'seeker' | 'provider';
type UserStatusFilter = 'all' | NonNullable<AdminAccountUserListQuery['status']>;
type ProviderStatusFilter = 'all' | NonNullable<AdminProviderListQuery['status']>;
type ProviderTypeFilter = 'all' | ProviderType;

export interface AdminAccountsProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly view: AdminAccountsView;
  readonly detailId?: string | undefined;
  readonly authClient?: AdminAccountsAuthorizationSource | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialListData?: AdminAccountUserListData | AdminProviderListData | undefined;
  readonly initialUserData?: AdminAccountUserData | undefined;
  readonly initialProviderData?: AdminProviderData | undefined;
  readonly initialState?: AdminAccountsState | undefined;
  readonly loadUsers?: AdminUsersLoader | undefined;
  readonly loadUser?: AdminUserLoader | undefined;
  readonly loadProviders?: AdminProvidersLoader | undefined;
  readonly loadProvider?: AdminProviderLoader | undefined;
  readonly loadDocumentAccess?: AdminDocumentAccessLoader | undefined;
}

function localePath(locale: SupportedLocale, path: string): string {
  const url = new URL(path, 'http://sadat-real-estate.local');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

function stateForError(error: unknown, detail: boolean): Exclude<AdminAccountsState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (detail && error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function dateLabel(value: string | undefined, locale: SupportedLocale): string {
  if (value === undefined) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function numberLabel(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale).format(value);
}

function userName(user: AdminAccountUserData): string {
  return user.displayName ?? user.email ?? user.phone ?? user.id;
}

function providerName(provider: AdminProviderData): string {
  return provider.displayName ?? provider.accountOwnerFullName ?? provider.legalBusinessName ?? provider.tradeName ?? provider.email ?? provider.id;
}

function toneFor(value: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (value === 'verified' || value === 'approved' || value === 'clean') return 'success';
  if (value === 'pending_review' || value === 'needs_information' || value === 'needs_replacement' || value === 'scan_pending') return 'warning';
  if (value === 'rejected' || value === 'suspended' || value === 'restricted' || value === 'infected' || value === 'scan_failed') return 'error';
  if (value === 'draft' || value === 'uploaded') return 'info';
  return 'neutral';
}

function StatusBadge({ label, value }: { readonly label: string; readonly value: string }) {
  return <span className="admin-accounts__badge" data-tone={toneFor(value)} data-status={value}>{label}</span>;
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminAccountsState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminAccountsCopy(locale);
  const message = copy.states[state];
  return (
    <section className="admin-accounts__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.actions.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.actions.retry}</Button> : null}
    </section>
  );
}

function FilterBar({
  locale,
  view,
  searchInput,
  roleFilter,
  statusFilter,
  providerTypeFilter,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onProviderTypeChange,
  onSubmit,
  onClear
}: {
  readonly locale: SupportedLocale;
  readonly view: AdminAccountsView;
  readonly searchInput: string;
  readonly roleFilter: UserRoleFilter;
  readonly statusFilter: UserStatusFilter | ProviderStatusFilter;
  readonly providerTypeFilter: ProviderTypeFilter;
  readonly onSearchChange: (value: string) => void;
  readonly onRoleChange: (value: UserRoleFilter) => void;
  readonly onStatusChange: (value: UserStatusFilter | ProviderStatusFilter) => void;
  readonly onProviderTypeChange: (value: ProviderTypeFilter) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
}) {
  const copy = getAdminAccountsCopy(locale);
  const viewCopy = view === 'providers' ? copy.providers : view === 'verification' ? copy.verification : copy.users;
  const isUsers = view === 'users' || view === 'seekers';
  return (
    <form className="admin-accounts__filters" role="search" aria-label={viewCopy.searchLabel} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="admin-accounts__field">
        <label htmlFor="admin-accounts-search">{viewCopy.searchLabel}</label>
        <input id="admin-accounts-search" type="search" value={searchInput} onChange={event => onSearchChange(event.target.value)} placeholder={viewCopy.searchPlaceholder} />
      </div>
      {isUsers ? (
        <div className="admin-accounts__field">
          <label htmlFor="admin-accounts-role">{copy.users.roleLabel}</label>
          <select id="admin-accounts-role" value={roleFilter} onChange={event => onRoleChange(event.target.value as UserRoleFilter)}>
            <option value="all">{copy.users.all}</option>
            <option value="seeker">{locale === 'ar' ? 'باحث عن عقار' : locale === 'zh-CN' ? '求购者' : 'Seeker'}</option>
            <option value="provider">{locale === 'ar' ? 'مقدم عقار' : locale === 'zh-CN' ? '房产提供方' : 'Provider'}</option>
          </select>
        </div>
      ) : (
        <>
          <div className="admin-accounts__field">
            <label htmlFor="admin-accounts-status">{viewCopy.statusLabel}</label>
            <select id="admin-accounts-status" value={statusFilter} onChange={event => onStatusChange(event.target.value as UserStatusFilter | ProviderStatusFilter)}>
              <option value="all">{viewCopy.all}</option>
              {(isUsers ? Object.entries(copy.accountStatusLabels) : Object.entries(copy.statusLabels)).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
            </select>
          </div>
          <div className="admin-accounts__field">
            <label htmlFor="admin-accounts-provider-type">{viewCopy.typeLabel}</label>
            <select id="admin-accounts-provider-type" value={providerTypeFilter} onChange={event => onProviderTypeChange(event.target.value as ProviderTypeFilter)}>
              <option value="all">{viewCopy.all}</option>
              {Object.entries(copy.providerTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
            </select>
          </div>
        </>
      )}
      <div className="admin-accounts__filter-actions">
        <Button type="submit" size="sm">{locale === 'ar' ? 'تطبيق' : locale === 'zh-CN' ? '应用' : 'Apply'}</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onClear}>{locale === 'ar' ? 'مسح' : locale === 'zh-CN' ? '清除' : 'Clear'}</Button>
      </div>
    </form>
  );
}

function UsersTable({ data, locale, search, onPageChange }: { readonly data: AdminAccountUserListData; readonly locale: SupportedLocale; readonly search: string; readonly onPageChange: (page: number) => void }) {
  const copy = getAdminAccountsCopy(locale).users;
  const filteredItems = data.items.filter(user => {
    const value = `${userName(user)} ${user.email ?? ''} ${user.phone ?? ''} ${user.id}`.toLocaleLowerCase(locale);
    return value.includes(search.toLocaleLowerCase(locale));
  });
  const pageCount = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <>
      <div className="admin-accounts__table-wrap">
        <table className="admin-accounts__table">
          <caption className="a11y-visually-hidden">{copy.title}</caption>
          <thead><tr><th scope="col">{copy.columns.name}</th><th scope="col">{copy.columns.type}</th><th scope="col">{copy.columns.phone}</th><th scope="col">{copy.columns.email}</th><th scope="col">{copy.columns.status}</th><th scope="col">{copy.columns.locale}</th><th scope="col">{copy.columns.updated}</th><th scope="col">{copy.columns.actions}</th></tr></thead>
          <tbody>
            {filteredItems.map(user => (
              <tr key={user.id} data-testid={`admin-user-${user.id}`}>
                <td><div className="admin-accounts__identity"><strong>{userName(user)}</strong><small>{user.id}</small></div></td>
                <td>{user.roleType === 'seeker' ? (locale === 'ar' ? 'باحث عن عقار' : locale === 'zh-CN' ? '求购者' : 'Seeker') : (locale === 'ar' ? 'مقدم عقار' : locale === 'zh-CN' ? '房产提供方' : 'Provider')}</td>
                <td>{user.phone ?? <span className="admin-accounts__muted">—</span>}</td>
                <td>{user.email ?? <span className="admin-accounts__muted">—</span>}</td>
                <td><StatusBadge label={getAdminAccountsCopy(locale).accountStatusLabels[user.status] ?? user.status} value={user.status} /></td>
                <td>{user.locale}</td>
                <td><time dateTime={user.updatedAt}>{dateLabel(user.updatedAt, locale)}</time></td>
                <td><div className="admin-accounts__actions"><a href={localePath(locale, `/admin/users/${user.id}`)}>{getAdminAccountsCopy(locale).actions.view}</a></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredItems.length === 0 ? <div className="admin-accounts__empty" data-state="empty"><h2>{copy.emptyTitle}</h2><p>{copy.emptyBody}</p></div> : null}
      <Pagination page={data.page} pageCount={pageCount} locale={locale} onPageChange={onPageChange} />
    </>
  );
}

function ProvidersTable({ data, locale, view, search, onPageChange }: { readonly data: AdminProviderListData; readonly locale: SupportedLocale; readonly view: 'providers' | 'verification'; readonly search: string; readonly onPageChange: (page: number) => void }) {
  const allCopy = getAdminAccountsCopy(locale);
  const providerCopy = allCopy.providers;
  const verificationCopy = allCopy.verification;
  const filteredItems = data.items.filter(provider => {
    const value = `${providerName(provider)} ${provider.legalBusinessName ?? ''} ${provider.tradeName ?? ''} ${provider.id}`.toLocaleLowerCase(locale);
    return value.includes(search.toLocaleLowerCase(locale));
  });
  const pageCount = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <>
      <div className="admin-accounts__table-wrap">
        <table className="admin-accounts__table">
          <caption className="a11y-visually-hidden">{view === 'providers' ? providerCopy.title : verificationCopy.title}</caption>
          {view === 'providers' ? (
            <>
              <thead><tr><th scope="col">{providerCopy.columns.name}</th><th scope="col">{providerCopy.columns.type}</th><th scope="col">{providerCopy.columns.status}</th><th scope="col">{providerCopy.columns.accountStatus}</th><th scope="col">{providerCopy.columns.company}</th><th scope="col">{providerCopy.columns.updated}</th><th scope="col">{providerCopy.columns.actions}</th></tr></thead>
              <tbody>{filteredItems.map(provider => <ProviderRow key={provider.id} provider={provider} locale={locale} />)}</tbody>
            </>
          ) : (
            <>
              <thead><tr><th scope="col">{verificationCopy.columns.name}</th><th scope="col">{verificationCopy.columns.type}</th><th scope="col">{verificationCopy.columns.status}</th><th scope="col">{verificationCopy.columns.submitted}</th><th scope="col">{verificationCopy.columns.updated}</th><th scope="col">{verificationCopy.columns.actions}</th></tr></thead>
              <tbody>{filteredItems.map(provider => <VerificationRow key={provider.id} provider={provider} locale={locale} />)}</tbody>
            </>
          )}
        </table>
      </div>
      {filteredItems.length === 0 ? <div className="admin-accounts__empty" data-state="empty"><h2>{view === 'providers' ? providerCopy.emptyTitle : verificationCopy.emptyTitle}</h2><p>{view === 'providers' ? providerCopy.emptyBody : verificationCopy.emptyBody}</p></div> : null}
      <Pagination page={data.page} pageCount={pageCount} locale={locale} onPageChange={onPageChange} />
      <span className="a11y-visually-hidden">{allCopy.providers.totalLabel}: {data.total}</span>
    </>
  );
}

function ProviderRow({ provider, locale }: { readonly provider: AdminProviderData; readonly locale: SupportedLocale }) {
  const copy = getAdminAccountsCopy(locale);
  return (
    <tr data-testid={`admin-provider-${provider.id}`}>
      <td><div className="admin-accounts__identity"><strong>{providerName(provider)}</strong><small>{provider.id}</small></div></td>
      <td>{copy.providerTypeLabels[provider.providerType] ?? provider.providerType}</td>
      <td><StatusBadge label={copy.statusLabels[provider.applicationStatus] ?? provider.applicationStatus} value={provider.applicationStatus} /></td>
      <td><StatusBadge label={copy.accountStatusLabels[provider.accountStatus] ?? provider.accountStatus} value={provider.accountStatus} /></td>
      <td>{provider.legalBusinessName ?? provider.tradeName ?? provider.brandName ?? <span className="admin-accounts__muted">—</span>}</td>
      <td><time dateTime={provider.updatedAt}>{dateLabel(provider.updatedAt, locale)}</time></td>
      <td><div className="admin-accounts__actions"><a href={localePath(locale, `/admin/providers/${provider.id}`)}>{copy.actions.view}</a></div></td>
    </tr>
  );
}

function VerificationRow({ provider, locale }: { readonly provider: AdminProviderData; readonly locale: SupportedLocale }) {
  const copy = getAdminAccountsCopy(locale);
  return (
    <tr data-testid={`admin-verification-${provider.id}`}>
      <td><div className="admin-accounts__identity"><strong>{providerName(provider)}</strong><small>{provider.id}</small></div></td>
      <td>{copy.providerTypeLabels[provider.providerType] ?? provider.providerType}</td>
      <td><StatusBadge label={copy.statusLabels[provider.applicationStatus] ?? provider.applicationStatus} value={provider.applicationStatus} /></td>
      <td>{dateLabel(provider.submittedAt, locale)}</td>
      <td><time dateTime={provider.updatedAt}>{dateLabel(provider.updatedAt, locale)}</time></td>
      <td><div className="admin-accounts__actions"><a href={localePath(locale, `/admin/providers/${provider.id}`)}>{copy.actions.view}</a></div></td>
    </tr>
  );
}

function Pagination({ page, pageCount, locale, onPageChange }: { readonly page: number; readonly pageCount: number; readonly locale: SupportedLocale; readonly onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  const previous = locale === 'ar' ? 'السابق' : locale === 'zh-CN' ? '上一页' : 'Previous';
  const next = locale === 'ar' ? 'التالي' : locale === 'zh-CN' ? '下一页' : 'Next';
  return <nav className="admin-accounts__pagination" aria-label={locale === 'ar' ? 'ترقيم الصفحات' : locale === 'zh-CN' ? '分页' : 'Pagination'}><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>{previous}</button><span>{page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>{next}</button></nav>;
}

function ListContent({
  view,
  locale,
  data,
  search,
  onPageChange,
  searchInput,
  roleFilter,
  statusFilter,
  providerTypeFilter,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onProviderTypeChange,
  onSubmit,
  onClear
}: {
  readonly view: AdminAccountsView;
  readonly locale: SupportedLocale;
  readonly data: AdminAccountUserListData | AdminProviderListData;
  readonly search: string;
  readonly onPageChange: (page: number) => void;
  readonly searchInput: string;
  readonly roleFilter: UserRoleFilter;
  readonly statusFilter: UserStatusFilter | ProviderStatusFilter;
  readonly providerTypeFilter: ProviderTypeFilter;
  readonly onSearchChange: (value: string) => void;
  readonly onRoleChange: (value: UserRoleFilter) => void;
  readonly onStatusChange: (value: UserStatusFilter | ProviderStatusFilter) => void;
  readonly onProviderTypeChange: (value: ProviderTypeFilter) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
}) {
  const copy = getAdminAccountsCopy(locale);
  const viewCopy = view === 'providers' ? copy.providers : view === 'verification' ? copy.verification : copy.users;
  const total = data.total;
  return (
    <main className="admin-accounts__main" aria-labelledby="admin-accounts-title">
      <div className="admin-accounts__heading">
        <div>
          <p className="admin-accounts__eyebrow">{viewCopy.eyebrow}</p>
          <h1 id="admin-accounts-title">{viewCopy.title}</h1>
          <p className="admin-accounts__description">{viewCopy.description}</p>
        </div>
        <div className="admin-accounts__summary" data-testid="admin-accounts-total"><strong>{numberLabel(total, locale)}</strong><span>{viewCopy.totalLabel}</span></div>
      </div>
      <section className="admin-accounts__panel" aria-labelledby="admin-accounts-list-title">
        <h2 id="admin-accounts-list-title" className="a11y-visually-hidden">{viewCopy.title}</h2>
        <FilterBar locale={locale} view={view} searchInput={searchInput} roleFilter={roleFilter} statusFilter={statusFilter} providerTypeFilter={providerTypeFilter} onSearchChange={onSearchChange} onRoleChange={onRoleChange} onStatusChange={onStatusChange} onProviderTypeChange={onProviderTypeChange} onSubmit={onSubmit} onClear={onClear} />
        {view === 'users' || view === 'seekers' ? <UsersTable data={data as AdminAccountUserListData} locale={locale} search={search} onPageChange={onPageChange} /> : <ProvidersTable data={data as AdminProviderListData} locale={locale} view={view} search={search} onPageChange={onPageChange} />}
      </section>
    </main>
  );
}

function DetailFields({ fields }: { readonly fields: ReadonlyArray<readonly [string, string]> }) {
  return <dl className="admin-accounts__detail-grid">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function UserDetail({ user, locale, onBack }: { readonly user: AdminAccountUserData; readonly locale: SupportedLocale; readonly onBack: string }) {
  const copy = getAdminAccountsCopy(locale);
  return (
    <main className="admin-accounts__main admin-accounts__detail" aria-labelledby="admin-account-detail-title">
      <a className="admin-accounts__back" href={onBack}>{copy.actions.back}</a>
      <section className="admin-accounts__detail-card">
        <p className="admin-accounts__eyebrow">{copy.users.eyebrow}</p>
        <h1 id="admin-account-detail-title">{userName(user)}</h1>
        <DetailFields fields={[
          [copy.users.columns.type, user.roleType === 'seeker' ? (locale === 'ar' ? 'باحث عن عقار' : locale === 'zh-CN' ? '求购者' : 'Seeker') : (locale === 'ar' ? 'مقدم عقار' : locale === 'zh-CN' ? '房产提供方' : 'Provider')],
          [copy.users.columns.status, copy.accountStatusLabels[user.status] ?? user.status],
          [copy.users.columns.phone, user.phone ?? '—'],
          [copy.users.columns.email, user.email ?? '—'],
          [copy.users.columns.locale, user.locale],
          [copy.users.columns.updated, dateLabel(user.updatedAt, locale)]
        ]} />
      </section>
    </main>
  );
}

function DocumentRow({ document, locale, onOpen, opening }: { readonly document: AdminProviderDocumentData; readonly locale: SupportedLocale; readonly onOpen: (documentId: string) => void; readonly opening: boolean }) {
  const copy = getAdminAccountsCopy(locale);
  const canOpen = document.active && document.securityState === 'clean';
  return (
    <tr data-testid={`admin-document-${document.id}`}>
      <td><div className="admin-accounts__identity"><strong>{copy.documentCategoryLabels[document.category] ?? document.category}</strong><small>{document.originalFilename}</small></div></td>
      <td>{document.detectedMime}</td>
      <td>{new Intl.NumberFormat(locale).format(document.byteSize)} B</td>
      <td><StatusBadge label={copy.securityStateLabels[document.securityState] ?? document.securityState} value={document.securityState} /></td>
      <td><StatusBadge label={copy.reviewStateLabels[document.reviewState] ?? document.reviewState} value={document.reviewState} /></td>
      <td><time dateTime={document.uploadedAt}>{dateLabel(document.uploadedAt, locale)}</time></td>
      <td><Button type="button" size="sm" variant="secondary" disabled={!canOpen || opening} onClick={() => onOpen(document.id)}>{opening ? copy.actions.loadingDocument : canOpen ? copy.actions.openDocument : copy.actions.unavailableDocument}</Button></td>
    </tr>
  );
}

function ProviderDetail({ provider, locale, onBack, onOpenDocument, openingDocumentId, documentError }: { readonly provider: AdminProviderData; readonly locale: SupportedLocale; readonly onBack: string; readonly onOpenDocument: (documentId: string) => void; readonly openingDocumentId: string | undefined; readonly documentError: string | undefined }) {
  const copy = getAdminAccountsCopy(locale);
  return (
    <main className="admin-accounts__main admin-accounts__detail" aria-labelledby="admin-provider-detail-title">
      <a className="admin-accounts__back" href={onBack}>{copy.actions.back}</a>
      <section className="admin-accounts__detail-card">
        <p className="admin-accounts__eyebrow">{copy.providers.eyebrow}</p>
        <h1 id="admin-provider-detail-title">{providerName(provider)}</h1>
        <DetailFields fields={[
          [copy.providers.columns.type, copy.providerTypeLabels[provider.providerType] ?? provider.providerType],
          [copy.providers.columns.status, copy.statusLabels[provider.applicationStatus] ?? provider.applicationStatus],
          [copy.providers.columns.accountStatus, copy.accountStatusLabels[provider.accountStatus] ?? provider.accountStatus],
          [copy.providers.columns.company, provider.legalBusinessName ?? provider.tradeName ?? provider.brandName ?? '—'],
          [copy.users.columns.email, provider.email ?? '—'],
          [copy.users.columns.phone, provider.phone ?? '—'],
          [copy.users.columns.updated, dateLabel(provider.updatedAt, locale)]
        ]} />
        {provider.reviewReason !== undefined ? <p className="admin-accounts__muted">{provider.reviewReason}</p> : null}
      </section>
      <section className="admin-accounts__detail-card" aria-labelledby="admin-provider-documents-title">
        <h2 id="admin-provider-documents-title">{locale === 'ar' ? 'مستندات مقدم العقار' : locale === 'zh-CN' ? '提供方文件' : 'Provider documents'}</h2>
        {provider.documents.length === 0 ? <p className="admin-accounts__muted">{locale === 'ar' ? 'لا توجد مستندات نشطة.' : locale === 'zh-CN' ? '没有有效文件。' : 'No active documents are available.'}</p> : (
          <div className="admin-accounts__documents">
            <table className="admin-accounts__table"><caption className="a11y-visually-hidden">{locale === 'ar' ? 'مستندات مقدم العقار' : locale === 'zh-CN' ? '提供方文件' : 'Provider documents'}</caption><thead><tr><th scope="col">{locale === 'ar' ? 'المستند' : locale === 'zh-CN' ? '文件' : 'Document'}</th><th scope="col">MIME</th><th scope="col">{locale === 'ar' ? 'الحجم' : locale === 'zh-CN' ? '大小' : 'Size'}</th><th scope="col">{locale === 'ar' ? 'حالة الأمان' : locale === 'zh-CN' ? '安全状态' : 'Security state'}</th><th scope="col">{locale === 'ar' ? 'حالة المراجعة' : locale === 'zh-CN' ? '审核状态' : 'Review state'}</th><th scope="col">{locale === 'ar' ? 'تاريخ الرفع' : locale === 'zh-CN' ? '上传时间' : 'Uploaded'}</th><th scope="col">{locale === 'ar' ? 'الإجراء' : locale === 'zh-CN' ? '操作' : 'Action'}</th></tr></thead><tbody>{provider.documents.map(document => <DocumentRow key={document.id} document={document} locale={locale} onOpen={onOpenDocument} opening={openingDocumentId === document.id} />)}</tbody></table>
          </div>
        )}
        {documentError !== undefined ? <p className="admin-accounts__document-error" role="alert">{documentError}</p> : null}
      </section>
    </main>
  );
}

export function AdminAccounts({ locale, session, view, detailId, authClient, apiOrigin, initialListData, initialUserData, initialProviderData, initialState = 'loading', loadUsers, loadUser, loadProviders, loadProvider, loadDocumentAccess }: AdminAccountsProps) {
  const copy = getAdminAccountsCopy(locale);
  const [state, setState] = useState<AdminAccountsState>(initialState);
  const [listData, setListData] = useState<AdminAccountUserListData | AdminProviderListData | undefined>(initialListData);
  const [userData, setUserData] = useState<AdminAccountUserData | undefined>(initialUserData);
  const [providerData, setProviderData] = useState<AdminProviderData | undefined>(initialProviderData);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all');
  const [providerStatusFilter, setProviderStatusFilter] = useState<ProviderStatusFilter>('all');
  const [providerTypeFilter, setProviderTypeFilter] = useState<ProviderTypeFilter>('all');
  const [attempt, setAttempt] = useState(0);
  const [openingDocumentId, setOpeningDocumentId] = useState<string>();
  const [documentError, setDocumentError] = useState<string>();
  const isDetail = detailId !== undefined;
  const isUserView = view === 'users' || view === 'seekers';
  const isProviderView = view === 'providers' || view === 'verification';
  const userQuery = useMemo<AdminAccountUserListQuery>(() => ({
    page,
    limit: 20,
    ...(view === 'seekers' ? { roleType: 'seeker' as const } : roleFilter === 'all' ? {} : { roleType: roleFilter }),
    ...(userStatusFilter === 'all' || isProviderView ? {} : { status: userStatusFilter })
  }), [isProviderView, page, roleFilter, userStatusFilter, view]);
  const providerQuery = useMemo<AdminProviderListQuery>(() => ({
    page,
    limit: 20,
    ...(providerStatusFilter === 'all' || isUserView ? {} : { status: providerStatusFilter }),
    ...(providerTypeFilter === 'all' || isUserView ? {} : { providerType: providerTypeFilter })
  }), [isUserView, page, providerStatusFilter, providerTypeFilter]);
  const usersLoader = useMemo(() => loadUsers ?? createAdminUsersLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadUsers]);
  const userLoader = useMemo(() => loadUser ?? createAdminUserLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadUser]);
  const providersLoader = useMemo(() => loadProviders ?? createAdminProvidersLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadProviders]);
  const providerLoader = useMemo(() => loadProvider ?? createAdminProviderLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadProvider]);
  const documentAccessLoader = useMemo(() => loadDocumentAccess ?? createAdminDocumentAccessLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, loadDocumentAccess]);
  const activePath = isUserView ? '/admin/users' : '/admin/providers';
  const backPath = localePath(locale, view === 'seekers' ? '/admin/property-seekers' : view === 'verification' ? '/admin/verification' : activePath);
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    if (session.status !== 'authenticated' || sessionRole !== 'admin') {
      setState('permission');
      return undefined;
    }
    if (isDetail && ((isUserView && initialUserData !== undefined) || (isProviderView && initialProviderData !== undefined)) && attempt === 0) {
      setState('success');
      return undefined;
    }
    if (!isDetail && initialListData !== undefined && page === 1 && attempt === 0 && search === '' && roleFilter === 'all' && userStatusFilter === 'all' && providerStatusFilter === 'all' && providerTypeFilter === 'all') {
      setState(initialListData.items.length === 0 ? 'empty' : 'success');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    if (isDetail && detailId !== undefined) {
      const detailLoader = isUserView ? userLoader : providerLoader;
      void detailLoader(detailId, controller.signal).then(nextData => {
        if (controller.signal.aborted) return;
        if (isUserView) setUserData(nextData as AdminAccountUserData);
        else setProviderData(nextData as AdminProviderData);
        setState('success');
      }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error, true)); });
    } else if (isUserView) {
      void usersLoader(userQuery, controller.signal).then(nextData => {
        if (controller.signal.aborted) return;
        setListData(nextData);
        setState(nextData.items.length === 0 ? 'empty' : 'success');
      }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error, false)); });
    } else {
      void providersLoader(providerQuery, controller.signal).then(nextData => {
        if (controller.signal.aborted) return;
        setListData(nextData);
        setState(nextData.items.length === 0 ? 'empty' : 'success');
      }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error, false)); });
    }
    return () => controller.abort();
  }, [attempt, detailId, initialListData, initialProviderData, initialUserData, isDetail, isProviderView, isUserView, page, providerLoader, providerQuery, providerStatusFilter, providerTypeFilter, roleFilter, search, session.status, sessionRole, userLoader, userQuery, userStatusFilter, usersLoader, providersLoader]);

  async function openDocument(documentId: string): Promise<void> {
    setOpeningDocumentId(documentId);
    setDocumentError(undefined);
    try {
      const result = await documentAccessLoader(documentId, 'document_review');
      if (typeof window !== 'undefined') window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setDocumentError(error instanceof ApiClientError && error.status === 403 ? copy.states.permission.body : copy.states.error.body);
    } finally {
      setOpeningDocumentId(undefined);
    }
  }

  const path = typeof window === 'undefined' ? activePath : new URL(window.location.href).pathname.replace(/\/+$/u, '') || '/';
  return (
    <section className="admin-dashboard admin-accounts" data-screen-id={view === 'users' ? 'ADM-02' : view === 'seekers' ? 'ADM-03' : view === 'providers' ? 'ADM-04' : 'ADM-05'} data-route={path} data-device-scope="desktop" data-admin-accounts-state={state}>
      <AdminNavigation locale={locale} activePath={activePath} />
      <div className="admin-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {state === 'not_found' ? <section className="admin-accounts__state" data-state="not_found" role="alert"><StateMessage state="error" title={copy.states.not_found.title} message={copy.states.not_found.body} /><a className="admin-accounts__back" href={backPath}>{copy.actions.back}</a></section> : null}
        {state === 'empty' && !isDetail && listData !== undefined ? <div className="admin-accounts__empty" data-state="empty"><h1>{(view === 'providers' ? copy.providers : view === 'verification' ? copy.verification : copy.users).emptyTitle}</h1><p>{(view === 'providers' ? copy.providers : view === 'verification' ? copy.verification : copy.users).emptyBody}</p></div> : null}
        {state === 'success' && isDetail && isUserView && userData !== undefined ? <UserDetail user={userData} locale={locale} onBack={backPath} /> : null}
        {state === 'success' && isDetail && isProviderView && providerData !== undefined ? <ProviderDetail provider={providerData} locale={locale} onBack={backPath} onOpenDocument={documentId => { void openDocument(documentId); }} openingDocumentId={openingDocumentId} documentError={documentError} /> : null}
        {state === 'success' && !isDetail && listData !== undefined ? <ListContent view={view} locale={locale} data={listData} search={search} onPageChange={setPage} searchInput={searchInput} roleFilter={roleFilter} statusFilter={isUserView ? userStatusFilter : providerStatusFilter} providerTypeFilter={providerTypeFilter} onSearchChange={setSearchInput} onRoleChange={value => { setRoleFilter(value); setPage(1); }} onStatusChange={value => { if (isUserView) setUserStatusFilter(value as UserStatusFilter); else setProviderStatusFilter(value as ProviderStatusFilter); setPage(1); }} onProviderTypeChange={value => { setProviderTypeFilter(value); setPage(1); }} onSubmit={() => { setSearch(searchInput.trim()); setPage(1); setAttempt(value => value + 1); }} onClear={() => { setSearchInput(''); setSearch(''); setRoleFilter('all'); setUserStatusFilter('all'); setProviderStatusFilter('all'); setProviderTypeFilter('all'); setPage(1); setAttempt(value => value + 1); }} /> : null}
      </div>
    </section>
  );
}
