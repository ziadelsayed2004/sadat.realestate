import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  AdBanner,
  AdBannerCreate,
  AdBannerListData,
  AdBannerMediaCreate,
  CmsAdminHomepageSection,
  CmsAdminTip,
  LocalizedText,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { AdminNavigation } from '../admin/index.ts';
import {
  ADMIN_BANNERS_ROUTE,
  ADMIN_CMS_HOMEPAGE_ROUTE,
  ADMIN_CMS_TIPS_ROUTE,
  createAdminHomeSource,
  type AdminHomeCmsContent,
  type AdminHomeSource
} from './data.ts';
import { getAdminHomeCopy, type AdminHomeCopy, type AdminHomeState } from './copy.ts';
import './styles.css';

type AdminHomeRoute = 'banners' | 'banner_create' | 'tips' | 'homepage' | 'not_found';
type DraftLocalized = Partial<Record<SupportedLocale, string>>;
type HomeContentItem = CmsAdminTip | CmsAdminHomepageSection;

export interface AdminHomeProps {
  readonly url?: string | undefined;
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: { readonly getAuthorizationHeader: () => string | undefined } | undefined;
  readonly apiOrigin?: string | undefined;
  readonly initialBanners?: AdBannerListData | undefined;
  readonly initialContent?: AdminHomeCmsContent | undefined;
  readonly source?: AdminHomeSource | undefined;
}

function pathFor(url?: string): string {
  const value = url ?? (typeof window === 'undefined' ? '/admin/banners' : window.location.href);
  return new URL(value, 'http://sadat-real-estate.local').pathname.replace(/\/+$/u, '') || '/';
}

function routeFor(path: string): AdminHomeRoute {
  if (path === ADMIN_BANNERS_ROUTE) return 'banners';
  if (path === `${ADMIN_BANNERS_ROUTE}/new`) return 'banner_create';
  if (path === ADMIN_CMS_TIPS_ROUTE) return 'tips';
  if (path === ADMIN_CMS_HOMEPAGE_ROUTE) return 'homepage';
  return 'not_found';
}

function localeValue(value: LocalizedText | undefined, locale: SupportedLocale): string {
  if (value === undefined) return '';
  return value[locale] ?? value.en ?? value.ar ?? '';
}

function localizedInput(value: DraftLocalized): LocalizedText | undefined {
  const next = Object.fromEntries(Object.entries(value).filter(([, text]) => text?.trim() !== '').map(([key, text]) => [key, text!.trim()]));
  return Object.keys(next).length === 0 ? undefined : next as LocalizedText;
}

function draftLocalized(value: LocalizedText | undefined): DraftLocalized {
  return { ar: value?.ar ?? '', en: value?.en ?? '',};
}

function dateLabel(value: string, locale: SupportedLocale): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function stateForError(error: unknown): Exclude<AdminHomeState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForItems(items: readonly unknown[]): AdminHomeState {
  return items.length === 0 ? 'empty' : 'success';
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<AdminHomeState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getAdminHomeCopy(locale);
  const message = copy.states[state];
  return (
    <section className="admin-home__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button type="button" variant="secondary" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function LocalizedFields({ prefix, label, value, onChange, multiline = false, copy }: { readonly prefix: string; readonly label: string; readonly value: DraftLocalized; readonly onChange: (locale: SupportedLocale, value: string) => void; readonly multiline?: boolean; readonly copy: AdminHomeCopy }) {
  const fields: readonly [SupportedLocale, string][] = [['ar', 'العربية / Arabic'], ['en', 'English']];
  return (
    <fieldset className="admin-home__localized-fields">
      <legend>{label}</legend>
      <p className="admin-home__hint">{copy.localizedHint}</p>
      <div className="admin-home__localized-grid">
        {fields.map(([locale, localeLabel]) => {
          const id = `${prefix}-${locale.replace('-', '')}`;
          return <label key={locale} htmlFor={id}>{localeLabel}{multiline ? <textarea id={id} value={value[locale] ?? ''} onChange={event => onChange(locale, event.target.value)} /> : <input id={id} value={value[locale] ?? ''} onChange={event => onChange(locale, event.target.value)} />}</label>;
        })}
      </div>
    </fieldset>
  );
}

function StatusBadge({ status, locale }: { readonly status: string; readonly locale: SupportedLocale }) {
  const copy = getAdminHomeCopy(locale);
  const tone = status === 'active' || status === 'published' ? 'success' : status === 'draft' || status === 'scheduled' ? 'warning' : status === 'ended' || status === 'archived' || status === 'inactive' ? 'neutral' : 'info';
  return <span className="admin-home__badge" data-tone={tone}>{copy.statuses[status] ?? status}</span>;
}

function BannerTable({ data, locale, source, onChanged }: { readonly data: AdBannerListData; readonly locale: SupportedLocale; readonly source: AdminHomeSource; readonly onChanged: (data: AdBannerListData) => void }) {
  const copy = getAdminHomeCopy(locale);
  const [busyId, setBusyId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();
  const [preview, setPreview] = useState<{ readonly banner: AdBanner; readonly imageUrl?: string } | undefined>();

  async function reorder(item: AdBanner, direction: -1 | 1): Promise<void> {
    const placementItems = data.items.filter(candidate => candidate.placementKey === item.placementKey);
    const index = placementItems.findIndex(candidate => candidate.id === item.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= placementItems.length) return;
    const reorderedItems = [...placementItems];
    const current = reorderedItems[index]!;
    const adjacent = reorderedItems[nextIndex]!;
    reorderedItems[index] = adjacent;
    reorderedItems[nextIndex] = current;
    setBusyId(item.id); setFeedback(undefined);
    try {
      const reordered = await source.reorderBanners({ placementKey: item.placementKey, items: reorderedItems.map((candidate, order) => ({ bannerId: candidate.id, sortOrder: placementItems[order]!.sortOrder, expectedVersion: candidate.version })), reason: 'Reorder approved homepage banners' });
      let placementCursor = 0;
      onChanged({ ...data, items: data.items.map(candidate => candidate.placementKey === item.placementKey ? reordered[placementCursor++] ?? candidate : candidate) });
    } catch (error) { setFeedback(error instanceof Error ? error.message : copy.states.error.title); } finally { setBusyId(undefined); }
  }

  async function showPreview(item: AdBanner): Promise<void> {
    setBusyId(item.id); setFeedback(undefined);
    try {
      const result = await source.previewBanner(item.id);
      setPreview({ banner: result.banner, ...(result.media === undefined ? {} : { imageUrl: result.media.url }) });
    } catch (error) { setFeedback(error instanceof Error ? error.message : copy.states.error.title); } finally { setBusyId(undefined); }
  }

  return (
    <section className="admin-home__panel" aria-labelledby="admin-home-banners-list-title">
      <div className="admin-home__panel-heading"><div><h2 id="admin-home-banners-list-title">{copy.banners}</h2><p>{copy.bannerDescription}</p></div><span>{data.total}</span></div>
      <div className="admin-home__table-wrap"><table className="admin-home__table"><caption className="a11y-visually-hidden">{copy.banners}</caption><thead><tr><th scope="col">{copy.order}</th><th scope="col">{copy.title}</th><th scope="col">{copy.placement}</th><th scope="col">{copy.status}</th><th scope="col">{copy.start}</th><th scope="col">{copy.end}</th><th scope="col">{copy.actions}</th></tr></thead><tbody>{data.items.map(item => { const placementItems = data.items.filter(candidate => candidate.placementKey === item.placementKey); const placementIndex = placementItems.findIndex(candidate => candidate.id === item.id); return <tr key={item.id} data-testid={`admin-home-banner-${item.id}`}><td>{item.sortOrder}</td><td><strong>{localeValue(item.title, locale)}</strong><small>{item.id}</small></td><td><code>{item.placementKey}</code></td><td><StatusBadge status={item.status} locale={locale} /></td><td>{dateLabel(item.startAt, locale)}</td><td>{dateLabel(item.endAt, locale)}</td><td><div className="admin-home__row-actions"><Button size="sm" variant="secondary" disabled={busyId !== undefined} onClick={() => void showPreview(item)}>{copy.preview}</Button><Button size="sm" variant="ghost" disabled={busyId !== undefined || placementIndex <= 0} onClick={() => void reorder(item, -1)} aria-label={`${copy.moveUp}: ${localeValue(item.title, locale)}`}>↑</Button><Button size="sm" variant="ghost" disabled={busyId !== undefined || placementIndex === placementItems.length - 1} onClick={() => void reorder(item, 1)} aria-label={`${copy.moveDown}: ${localeValue(item.title, locale)}`}>↓</Button></div></td></tr>; })}</tbody></table></div>
      {feedback ? <p className="admin-home__feedback" role="alert">{feedback}</p> : null}
      {preview ? <aside className="admin-home__preview" aria-label={copy.preview}><h3>{copy.preview}</h3><strong>{localeValue(preview.banner.title, locale)}</strong>{preview.imageUrl ? <img src={preview.imageUrl} alt={localeValue(preview.banner.altText ?? preview.banner.title, locale)} /> : <p>{copy.mediaNote}</p>}<p><code>{preview.banner.targetUrl ?? copy.targetUrl}</code></p></aside> : null}
    </section>
  );
}

function BannerCreateForm({ locale, source, onSaved }: { readonly locale: SupportedLocale; readonly source: AdminHomeSource; readonly onSaved: () => void }) {
  const copy = getAdminHomeCopy(locale);
  const [title, setTitle] = useState<DraftLocalized>({ ar: '', en: '',});
  const [altText, setAltText] = useState<DraftLocalized>({ ar: '', en: '',});
  const [placementKey, setPlacementKey] = useState('homepage.hero');
  const [targetUrl, setTargetUrl] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [media, setMedia] = useState<Pick<AdBannerMediaCreate, 'url' | 'mime' | 'width' | 'height'>>({ url: '', mime: 'image/png', width: 1200, height: 400 });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ readonly tone: 'error' | 'success'; readonly text: string } | undefined>();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setFeedback(undefined);
    const parsedTitle = localizedInput(title);
    if (parsedTitle === undefined || !startAt || !endAt || (media.url.trim() !== '' && reason.trim().length < 2)) { setFeedback({ tone: 'error', text: media.url.trim() !== '' && reason.trim().length < 2 ? copy.reasonRequired : copy.validation }); return; }
    const input: AdBannerCreate = { placementKey: placementKey.trim(), title: parsedTitle, ...(localizedInput(altText) === undefined ? {} : { altText: localizedInput(altText) }), ...(targetUrl.trim() === '' ? {} : { targetUrl: targetUrl.trim() }), startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), sortOrder: 0 };
    setSaving(true);
    try {
      const created = await source.createBanner(input);
      if (media.url.trim() !== '') {
        const attached = await source.createBannerMedia(created.id, { ...media, url: media.url.trim() });
        await source.updateBanner(created.id, { expectedVersion: created.version, mediaId: attached.id, reason: reason.trim() });
      }
      setFeedback({ tone: 'success', text: copy.saved });
      onSaved();
    } catch (error) { setFeedback({ tone: 'error', text: error instanceof Error ? error.message : copy.states.error.title }); } finally { setSaving(false); }
  }

  return <section className="admin-home__editor" data-testid="admin-home-banner-editor"><div className="admin-home__editor-heading"><div><h2>{copy.newBanner}</h2><p>{copy.bannerDescription}</p></div><a className="admin-home__text-link" href={`${ADMIN_BANNERS_ROUTE}?lang=${encodeURIComponent(locale)}`}>{copy.cancel}</a></div><form onSubmit={event => { void submit(event); }}><div className="admin-home__form-grid"><label htmlFor="admin-home-banner-placement">{copy.placement}<input id="admin-home-banner-placement" value={placementKey} onChange={event => setPlacementKey(event.target.value)} pattern="[a-z][a-z0-9_.-]*" required /></label><label htmlFor="admin-home-banner-target">{copy.targetUrl}<input id="admin-home-banner-target" type="url" value={targetUrl} onChange={event => setTargetUrl(event.target.value)} placeholder="https://" /></label><label htmlFor="admin-home-banner-start">{copy.start}<input id="admin-home-banner-start" type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} required /></label><label htmlFor="admin-home-banner-end">{copy.end}<input id="admin-home-banner-end" type="datetime-local" value={endAt} onChange={event => setEndAt(event.target.value)} required /></label></div><LocalizedFields prefix="admin-home-banner-title" label={copy.title} value={title} onChange={(key, value) => setTitle(current => ({ ...current, [key]: value }))} copy={copy} /><LocalizedFields prefix="admin-home-banner-alt" label={copy.altText} value={altText} onChange={(key, value) => setAltText(current => ({ ...current, [key]: value }))} copy={copy} /><fieldset className="admin-home__media-fields"><legend>{copy.mediaUrl}</legend><p className="admin-home__hint">{copy.mediaNote}</p><div className="admin-home__form-grid"><label htmlFor="admin-home-banner-media-url">{copy.mediaUrl}<input id="admin-home-banner-media-url" type="url" value={media.url} onChange={event => setMedia(current => ({ ...current, url: event.target.value }))} placeholder="https://" /></label><label htmlFor="admin-home-banner-media-mime">{copy.mediaMime}<select id="admin-home-banner-media-mime" value={media.mime} onChange={event => setMedia(current => ({ ...current, mime: event.target.value as AdBannerMediaCreate['mime'] }))}><option value="image/png">image/png</option><option value="image/jpeg">image/jpeg</option><option value="image/webp">image/webp</option></select></label><label htmlFor="admin-home-banner-media-width">{copy.mediaWidth}<input id="admin-home-banner-media-width" type="number" min="1" value={media.width} onChange={event => setMedia(current => ({ ...current, width: Number(event.target.value) }))} /></label><label htmlFor="admin-home-banner-media-height">{copy.mediaHeight}<input id="admin-home-banner-media-height" type="number" min="1" value={media.height} onChange={event => setMedia(current => ({ ...current, height: Number(event.target.value) }))} /></label></div></fieldset>{media.url.trim() !== '' ? <label htmlFor="admin-home-banner-reason">{copy.reason}<textarea id="admin-home-banner-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={3} required placeholder={copy.reasonPlaceholder} /></label> : null}<div className="admin-home__inline-actions"><Button type="submit" loading={saving} disabled={saving}>{saving ? copy.saving : copy.save}</Button><a className="admin-home__text-link" href={`${ADMIN_BANNERS_ROUTE}?lang=${encodeURIComponent(locale)}`}>{copy.cancel}</a></div>{feedback ? <p className="admin-home__feedback" data-tone={feedback.tone} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.text}</p> : null}</form></section>;
}

function ContentForm({ namespace, item, locale, source, onSaved, onCancel }: { readonly namespace: 'tips' | 'homepage'; readonly item?: HomeContentItem; readonly locale: SupportedLocale; readonly source: AdminHomeSource; readonly onSaved: (data: AdminHomeCmsContent) => void; readonly onCancel: () => void }) {
  const copy = getAdminHomeCopy(locale);
  const isTip = namespace === 'tips';
  const tip = isTip && item !== undefined && 'active' in item ? item : undefined;
  const section = !isTip && item !== undefined && 'visible' in item ? item : undefined;
  const [key, setKey] = useState(item?.key ?? '');
  const [title, setTitle] = useState<DraftLocalized>(draftLocalized(item?.title));
  const [body, setBody] = useState<DraftLocalized>(draftLocalized(item?.body));
  const [order, setOrder] = useState(String(item?.order ?? 0));
  const [active, setActive] = useState(tip?.active ?? true);
  const [visible, setVisible] = useState(section?.visible ?? true);
  const [status, setStatus] = useState<'draft' | 'published' | 'inactive'>(item?.status ?? 'draft');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>();
  const canUpdate = item === undefined || item.availableActions.includes('update');

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setFeedback(undefined);
    const parsedTitle = localizedInput(title);
    const parsedBody = localizedInput(body);
    if (!key.trim() || parsedTitle === undefined || parsedBody === undefined || reason.trim().length < 3) { setFeedback(reason.trim().length < 3 ? copy.reasonRequired : copy.validation); return; }
    const common = { key: key.trim(), title: parsedTitle, body: parsedBody, order: Number(order), status, reason: reason.trim(), ...(isTip ? { active } : { visible }) };
    const changes = { title: parsedTitle, body: parsedBody, order: Number(order), status, reason: reason.trim(), ...(isTip ? { active } : { visible }) };
    setSaving(true);
    try {
      const next = item === undefined ? await source.updateContent(namespace, common) : await source.updateContent(namespace, { id: item.id, version: item.version, ...changes });
      onSaved(next); onCancel();
    } catch (error) { setFeedback(error instanceof Error ? error.message : copy.states.error.title); } finally { setSaving(false); }
  }

  return <section className="admin-home__editor" data-testid={`admin-home-${namespace}-editor`}><div className="admin-home__editor-heading"><div><h2>{item === undefined ? `${copy.add}: ${isTip ? copy.tips : copy.homepage}` : `${copy.save}: ${localeValue(item.title, locale)}`}</h2><p>{isTip ? copy.tipsDescription : copy.homepageDescription}</p></div><Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div><form onSubmit={event => { void submit(event); }}><div className="admin-home__form-grid"><label htmlFor={`admin-home-${namespace}-key`}>{copy.key}<input id={`admin-home-${namespace}-key`} value={key} onChange={event => setKey(event.target.value)} pattern="[a-z][a-z0-9_]{1,63}" disabled={item !== undefined} required /></label><label htmlFor={`admin-home-${namespace}-order`}>{copy.order}<input id={`admin-home-${namespace}-order`} type="number" min="0" value={order} onChange={event => setOrder(event.target.value)} required /></label></div><LocalizedFields prefix={`admin-home-${namespace}-title`} label={copy.title} value={title} onChange={(localeKey, value) => setTitle(current => ({ ...current, [localeKey]: value }))} copy={copy} /><LocalizedFields prefix={`admin-home-${namespace}-body`} label={copy.body} value={body} onChange={(localeKey, value) => setBody(current => ({ ...current, [localeKey]: value }))} multiline copy={copy} /><div className="admin-home__form-grid"><label htmlFor={`admin-home-${namespace}-status`}>{copy.status}<select id={`admin-home-${namespace}-status`} value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="draft">{copy.statuses.draft}</option><option value="published">{copy.statuses.published}</option><option value="inactive">{copy.statuses.inactive}</option></select></label><label className="admin-home__checkbox" htmlFor={`admin-home-${namespace}-${isTip ? 'active' : 'visible'}`}><input id={`admin-home-${namespace}-${isTip ? 'active' : 'visible'}`} type="checkbox" checked={isTip ? active : visible} onChange={event => isTip ? setActive(event.target.checked) : setVisible(event.target.checked)} />{isTip ? copy.active : copy.visible}</label></div><label htmlFor={`admin-home-${namespace}-reason`}>{copy.reason}<textarea id={`admin-home-${namespace}-reason`} value={reason} onChange={event => setReason(event.target.value)} minLength={3} required placeholder={copy.reasonPlaceholder} /></label><div className="admin-home__inline-actions">{canUpdate ? <Button type="submit" loading={saving} disabled={saving}>{saving ? copy.saving : copy.save}</Button> : <span className="admin-home__muted">{copy.states.permission.title}</span>}<Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div>{feedback ? <p className="admin-home__feedback" data-tone="error" role="alert">{feedback}</p> : null}</form></section>;
}

function ContentTable({ data, namespace, locale, onEdit }: { readonly data: AdminHomeCmsContent; readonly namespace: 'tips' | 'homepage'; readonly locale: SupportedLocale; readonly onEdit: (item: HomeContentItem) => void }) {
  const copy = getAdminHomeCopy(locale);
  const items = data.items as readonly HomeContentItem[];
  return <section className="admin-home__panel" aria-labelledby={`admin-home-${namespace}-list-title`}><div className="admin-home__panel-heading"><div><h2 id={`admin-home-${namespace}-list-title`}>{namespace === 'tips' ? copy.tips : copy.homepage}</h2><p>{namespace === 'tips' ? copy.tipsDescription : copy.homepageDescription}</p></div><span>{items.length}</span></div><div className="admin-home__table-wrap"><table className="admin-home__table"><caption className="a11y-visually-hidden">{namespace === 'tips' ? copy.tips : copy.homepage}</caption><thead><tr><th scope="col">{copy.order}</th><th scope="col">{copy.title}</th><th scope="col">{copy.status}</th><th scope="col">{namespace === 'tips' ? copy.active : copy.visible}</th><th scope="col">{copy.version}</th><th scope="col">{copy.actions}</th></tr></thead><tbody>{items.map(item => <tr key={item.id} data-testid={`admin-home-${namespace}-${item.id}`}><td>{item.order}</td><td><strong>{localeValue(item.title, locale)}</strong><small>{item.key}</small></td><td><StatusBadge status={item.status} locale={locale} /></td><td>{'active' in item ? (item.active ? copy.statuses.active : copy.statuses.inactive) : 'visible' in item ? (item.visible ? copy.statuses.published : copy.statuses.inactive) : '—'}</td><td>{item.version}</td><td><div className="admin-home__row-actions">{item.availableActions.includes('update') ? <Button size="sm" onClick={() => onEdit(item)}>{copy.actionsByKey.update}</Button> : <span className="admin-home__muted">{copy.states.permission.title}</span>}{item.availableActions.includes('publish') ? <Button size="sm" variant="secondary" onClick={() => onEdit(item)}>{copy.actionsByKey.publish}</Button> : null}</div></td></tr>)}</tbody></table></div>{items.length === 0 ? <p className="admin-home__empty-hint">{copy.states.empty.body}</p> : null}</section>;
}

export function AdminHome({ url, locale, session, authClient, apiOrigin, initialBanners, initialContent, source: providedSource }: AdminHomeProps) {
  const path = pathFor(url);
  const route = routeFor(path);
  const copy = getAdminHomeCopy(locale);
  const source = useMemo(() => providedSource ?? createAdminHomeSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, providedSource]);
  const initialBannersMatch = route === 'banners' && initialBanners !== undefined;
  const initialContentMatch = (route === 'tips' && initialContent?.namespace === 'tips') || (route === 'homepage' && initialContent?.namespace === 'homepage');
  const [state, setState] = useState<AdminHomeState>(() => route === 'banner_create' ? 'success' : route === 'not_found' ? 'not_found' : initialBannersMatch ? stateForItems(initialBanners.items) : initialContentMatch ? stateForItems(initialContent!.items) : 'loading');
  const [banners, setBanners] = useState<AdBannerListData | undefined>(initialBannersMatch ? initialBanners : undefined);
  const [content, setContent] = useState<AdminHomeCmsContent | undefined>(initialContentMatch ? initialContent : undefined);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<HomeContentItem | 'new' | undefined>();
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    const allowed = session.status === 'authenticated' && session.role === 'admin';
    if (!allowed) { setState('permission'); return undefined; }
    if (route === 'not_found' || route === 'banner_create') { setState(route === 'not_found' ? 'not_found' : 'success'); return undefined; }
    if ((route === 'banners' && initialBannersMatch && attempt === 0) || (route === 'tips' && initialContentMatch && attempt === 0) || (route === 'homepage' && initialContentMatch && attempt === 0)) return undefined;
    const controller = new AbortController();
    setState('loading');
    const request = route === 'banners' ? source.loadBanners({ page: 1, limit: 20 }, controller.signal) : source.loadContent(route === 'tips' ? 'tips' : 'homepage', controller.signal);
    void request.then(next => {
      if (controller.signal.aborted) return;
      if (route === 'banners') { const nextBanners = next as AdBannerListData; setBanners(nextBanners); setState(stateForItems(nextBanners.items)); }
      else { const nextContent = next as AdminHomeCmsContent; setContent(nextContent); setState(stateForItems(nextContent.items)); }
    }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, initialBannersMatch, initialContentMatch, route, sessionRole, session.status, source]);

  const refresh = () => setAttempt(value => value + 1);
  const cmsNamespace = route === 'tips' || route === 'homepage' ? route : undefined;
  const activeContent = cmsNamespace !== undefined && content?.namespace === cmsNamespace ? content : undefined;
  const addContent = () => setEditing('new');

  async function saveContent(next: AdminHomeCmsContent): Promise<void> { setContent(next); setState(stateForItems(next.items)); }

  return <section className="admin-home" data-screen-id={route === 'banners' ? 'ADM-46' : route === 'banner_create' ? 'ADM-47' : route === 'tips' ? 'ADM-48' : route === 'homepage' ? 'ADM-49' : undefined} data-route={path} data-device-scope="desktop" data-admin-home-state={state}><AdminNavigation locale={locale} activePath={path} /><div className="admin-home__content"><header className="admin-home__heading"><div><p className="admin-home__eyebrow">{copy.eyebrow}</p><h1>{route === 'banners' ? copy.banners : route === 'banner_create' ? copy.newBanner : route === 'tips' ? copy.tips : route === 'homepage' ? copy.homepage : copy.states.not_found.title}</h1><p>{route === 'banners' || route === 'banner_create' ? copy.bannerDescription : route === 'tips' ? copy.tipsDescription : copy.homepageDescription}</p></div>{route === 'banners' ? <a className="admin-home__primary-link" href={`${ADMIN_BANNERS_ROUTE}/new?lang=${encodeURIComponent(locale)}`}>{copy.newBanner}</a> : route === 'tips' || route === 'homepage' ? <Button type="button" onClick={addContent}>{copy.add}</Button> : null}</header><nav className="admin-home__tabs" aria-label={copy.eyebrow}><a href={`${ADMIN_BANNERS_ROUTE}?lang=${encodeURIComponent(locale)}`} data-active={route === 'banners' || route === 'banner_create' || undefined}>{copy.banners}</a><a href={`${ADMIN_CMS_TIPS_ROUTE}?lang=${encodeURIComponent(locale)}`} data-active={route === 'tips' || undefined}>{copy.tips}</a><a href={`${ADMIN_CMS_HOMEPAGE_ROUTE}?lang=${encodeURIComponent(locale)}`} data-active={route === 'homepage' || undefined}>{copy.homepage}</a></nav>{state === 'loading' || state === 'error' || state === 'retry' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={refresh} /> : null}{state === 'not_found' ? <section className="admin-home__state" data-state="not_found"><h2>{copy.states.not_found.title}</h2><p>{copy.states.not_found.body}</p></section> : null}{route === 'banner_create' && state === 'success' ? <BannerCreateForm locale={locale} source={source} onSaved={() => {}} /> : null}{route === 'banners' && state === 'empty' ? <section className="admin-home__state" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p><a className="admin-home__primary-link" href={`${ADMIN_BANNERS_ROUTE}/new?lang=${encodeURIComponent(locale)}`}>{copy.newBanner}</a></section> : null}{route === 'banners' && state === 'success' && banners !== undefined ? <BannerTable data={banners} locale={locale} source={source} onChanged={setBanners} /> : null}{cmsNamespace !== undefined && activeContent !== undefined && state === 'empty' ? <section className="admin-home__state" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p><Button type="button" onClick={addContent}>{copy.add}</Button></section> : null}{cmsNamespace !== undefined && activeContent !== undefined && state === 'success' ? <ContentTable data={activeContent} namespace={cmsNamespace} locale={locale} onEdit={item => setEditing(item)} /> : null}{cmsNamespace !== undefined && editing !== undefined ? <ContentForm namespace={cmsNamespace} {...(editing === 'new' ? {} : { item: editing })} locale={locale} source={source} onSaved={next => void saveContent(next)} onCancel={() => setEditing(undefined)} /> : null}<p className="admin-home__direction-note">{copy.directionNote}</p></div></section>;
}
