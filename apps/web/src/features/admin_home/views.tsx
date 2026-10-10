import { BannerMediaLibrary } from './banner-media-library.tsx';
import { AdPlacementGuide, adPlacementName } from '../admin_ads/placement-guide.tsx';
import { BannerPlacementOptions } from './banner-placement-options.tsx';
import { BannerRotationHint } from './banner-rotation-hint.tsx';
import { ContentPreview } from './content-preview.tsx';
import { HomepageSectionVisibility, homepageSectionActionLabel, isHomepageSectionVisible } from './homepage-section-visibility.tsx';
import { useEffect, useMemo, useState, type FormEvent, useRef } from 'react';
import type {
  AdBanner,
  AdAdminRequest,
  AdBannerConfig,
  AdBannerCreate,
  AdBannerListData,
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
import { BannerDisplayControls, getBannerControlCopy } from './banner-controls.tsx';
import { RequestBannerContext, BannerDestinationHint } from './request-banner-context.tsx';
import { EGYPT_TIME_ZONE, egyptInstant, egyptLocalDateTime, egyptDurationLabel } from '../public/egypt-time.ts';
import { BannerGallery, type BannerImageSelection } from './banner-gallery.tsx';
import './styles.css';

type AdminHomeRoute = 'banners' | 'banner_create' | 'tips' | 'homepage' | 'not_found';
type DraftLocalized = Partial<Record<SupportedLocale, string>>;
type HomeContentItem = CmsAdminTip | CmsAdminHomepageSection;

function mutationMessage(error: unknown, copy: AdminHomeCopy, creating = false): string {
  if (error instanceof ApiClientError) {
    if (error.status === 404) return creating ? copy.mutation.placementNotFound : copy.mutation.notFound;
    if (error.status === 409) return copy.mutation.conflict;
    if (error.status === 401 || error.status === 403) return copy.states.permission.body;
    if (error.status === 400) return copy.validation;
    if (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED') return copy.states.retry.body;
  }
  return copy.mutation.failed;
}

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
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: EGYPT_TIME_ZONE }).format(new Date(value));
  } catch {
    return '—';
  }
}

function localDateParts(value: string): [string, string] { const local = egyptLocalDateTime(new Date(value)); return [local.slice(0, 10), local.slice(11, 16)]; }

type BannerTime = { clock: string; period: 'am' | 'pm' };

function bannerTimeDraft(time: string): BannerTime {
  const hour = Number(time.slice(0, 2));
  return { clock: time ? `${String(hour % 12 || 12).padStart(2, '0')}:${time.slice(3, 5)}` : '', period: hour >= 12 ? 'pm' : 'am' };
}

function scheduleInstant(date: string, time: BannerTime): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return undefined;
  if (time.clock === '') return egyptInstant(`${date}T00:00`);
  const parts = /^(0?[1-9]|1[0-2])(?::([0-5]\d))?$/u.exec(time.clock);
  if (!parts) return undefined;
  const hour = Number(parts[1]) % 12 + (time.period === 'pm' ? 12 : 0);
  return egyptInstant(`${date}T${String(hour).padStart(2, '0')}:${parts[2] ?? '00'}`);
}

function BannerTimeField({ id, label, locale, value, disabled, onChange }: { id: string; label: string; locale: SupportedLocale; value: BannerTime; disabled: boolean; onChange: (value: BannerTime) => void }) {
  return <div style={{ display: 'grid', gap: 6 }}><label htmlFor={id}>{label}</label><div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8 }}>
    <input id={id} type="text" dir="ltr" style={{ minWidth: 0 }} placeholder="02:30" pattern="(0?[1-9]|1[0-2])(:[0-5][0-9])?" maxLength={5} aria-describedby="admin-home-banner-schedule-hint" value={value.clock} disabled={disabled} onChange={event => onChange({ ...value, clock: event.target.value.replace(/[٠-٩۰-۹]/gu, digit => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0))) })} />
    <select id={`${id}-period`} aria-label={`${label} — ${locale === 'ar' ? 'صباحًا أو مساءً' : 'AM or PM'}`} value={value.period} disabled={disabled} onChange={event => onChange({ ...value, period: event.target.value as BannerTime['period'] })}>
      <option value="am">{locale === 'ar' ? 'صباحًا' : 'AM'}</option><option value="pm">{locale === 'ar' ? 'مساءً' : 'PM'}</option>
    </select>
  </div></div>;
}

function BannerSchedulePreview({ locale, startDate, startTime, endDate, endTime }: { locale: SupportedLocale; startDate: string; startTime: BannerTime; endDate: string; endTime: BannerTime }) {
  const start = scheduleInstant(startDate, startTime);
  const end = scheduleInstant(endDate, endTime);
  if (!start || !end || end <= start) return null;
  const copy = getAdminHomeCopy(locale);
  return <p className="admin-home__hint" role="status">{copy.start}: {dateLabel(start.toISOString(), locale)} — {copy.end}: {dateLabel(end.toISOString(), locale)} ({locale === 'ar' ? 'توقيت مصر' : 'Egypt time'})<br />{locale === 'ar' ? 'مدة العرض' : 'Display duration'}: {egyptDurationLabel(start, end, locale)}</p>;
}

function stateForError(error: unknown): Exclude<AdminHomeState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function stateForItems(items: readonly unknown[]): AdminHomeState {
  return items.length === 0 ? 'empty' : 'success';
}

function StatePanel({ state, locale, onRetry, form }: { readonly state: Exclude<AdminHomeState, 'success' | 'empty' | 'not_found'>; readonly locale: SupportedLocale; readonly onRetry: () => void; readonly form: boolean }) {
  const copy = getAdminHomeCopy(locale);
  const message = copy.states[state];
  return (
    <section className="admin-home__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} loadingVariant={form ? 'form' : 'table'} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
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

function BannerStatusBadge({ banner, locale }: { banner: AdBanner; locale: SupportedLocale }) {
  const [now, setNow] = useState(Date.now);
  const end = Date.parse(banner.endAt);
  const published = banner.status === 'active' || banner.status === 'scheduled';
  const expired = published && end <= Date.now();
  useEffect(() => {
    if (!published || !Number.isFinite(end) || end <= Date.now()) return;
    // Refresh at the deadline, including schedules beyond the browser's timer limit.
    const timer = setTimeout(() => setNow(Date.now()), Math.min(end - Date.now(), 2_147_483_647));
    return () => clearTimeout(timer);
  }, [end, published, now]);
  return <StatusBadge status={expired ? 'ended' : banner.status} locale={locale} />;
}

function BannerTable({ data, locale, source, onChanged }: { readonly data: AdBannerListData; readonly locale: SupportedLocale; readonly source: AdminHomeSource; readonly onChanged: (data: AdBannerListData) => void }) {
  const copy = getAdminHomeCopy(locale);
  const [busyId, setBusyId] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();
  const [preview, setPreview] = useState<{ readonly banner: AdBanner; readonly imageUrls: string[] } | undefined>();

  useEffect(() => () => { preview?.imageUrls.filter(url => url.startsWith('blob:')).forEach(url => URL.revokeObjectURL(url)); }, [preview]);

  const controls = getBannerControlCopy(locale);
  const [editing, setEditing] = useState<AdBanner>();
  const [archiveId, setArchiveId] = useState<string>();
  async function transition(item: AdBanner, status: 'draft' | 'active' | 'scheduled' | 'archived') {
    if (status === 'active' || status === 'scheduled') {
      if (!(item.mediaIds ?? (item.mediaId ? [item.mediaId] : [])).length) { setFeedback(controls.mediaRequired); return; }
      if (new Date(item.endAt).getTime() <= Date.now()) { setFeedback(controls.expired); return; }
    }
    setBusyId(item.id); setFeedback(undefined);
    try {
      const updated = await source.updateBanner(item.id, { expectedVersion: item.version, status, reason: `Banner display: ${status}` });
      onChanged({ ...data, items: data.items.map(row => row.id === item.id ? updated : row) });
      setArchiveId(undefined); setEditing(undefined);
    } catch (error) { setFeedback(error instanceof ApiClientError && error.status === 409 ? controls.conflict : mutationMessage(error, copy)); } finally { setBusyId(undefined); }
  }

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
    } catch (error) { setFeedback(mutationMessage(error, copy)); } finally { setBusyId(undefined); }
  }

  async function showPreview(item: AdBanner): Promise<void> {
    setBusyId(item.id); setFeedback(undefined);
    try {
      const result = await source.previewBanner(item.id);
      const items = result.mediaItems ?? (result.media ? [result.media] : []);
      setPreview({ banner: result.banner, imageUrls: await Promise.all(items.map(item => source.loadMediaPreview(item.url))) });
    } catch (error) { setFeedback(mutationMessage(error, copy)); } finally { setBusyId(undefined); }
  }

  return (
    <section className="admin-home__panel" aria-labelledby="admin-home-banners-list-title">
      <div className="admin-home__panel-heading"><div><h2 id="admin-home-banners-list-title">{copy.banners}</h2><p>{copy.bannerDescription}</p></div><span>{data.total}</span></div>
      <BannerRotationHint locale={locale} />
      <div className="admin-home__table-wrap"><table className="admin-home__table"><caption className="a11y-visually-hidden">{copy.banners}</caption><thead><tr><th scope="col">{copy.order}</th><th scope="col">{copy.title}</th><th scope="col">{copy.placement}</th><th scope="col">{copy.status}</th><th scope="col">{copy.start}</th><th scope="col">{copy.end}</th><th scope="col">{copy.actions}</th></tr></thead><tbody>{data.items.map(item => { const placementItems = data.items.filter(candidate => candidate.placementKey === item.placementKey); const placementIndex = placementItems.findIndex(candidate => candidate.id === item.id); return <tr key={item.id} data-testid={`admin-home-banner-${item.id}`}><td>{item.sortOrder}</td><td><strong>{localeValue(item.title, locale)}</strong><small>{item.id}</small>{item.adRequestId ? <small><a href={`/admin/ads/requests?requestId=${item.adRequestId}&lang=${locale}`}>{locale === 'ar' ? 'طلب العميل' : 'Customer request'}: {item.adRequestId}</a></small> : null}</td><td>{adPlacementName(item.placementKey, locale)}</td><td><BannerStatusBadge banner={item} locale={locale} /></td><td>{dateLabel(item.startAt, locale)}</td><td>{dateLabel(item.endAt, locale)}</td><td><div className="admin-home__row-actions">{item.status !== "archived" ? <><Button size="sm" variant="secondary" disabled={busyId !== undefined} onClick={() => setEditing(item)}>{controls.edit}</Button>{item.status === "draft" ? <Button size="sm" disabled={busyId !== undefined} onClick={() => void transition(item, new Date(item.startAt).getTime() > Date.now() ? "scheduled" : "active")}>{controls.publish}</Button> : <Button size="sm" variant="secondary" disabled={busyId !== undefined} onClick={() => void transition(item, "draft")}>{controls.stop}</Button>}<Button size="sm" variant="ghost" disabled={busyId !== undefined} onClick={() => setArchiveId(item.id)}>{controls.archive}</Button></> : null}<Button size="sm" variant="secondary" disabled={busyId !== undefined} onClick={() => void showPreview(item)}>{copy.preview}</Button><Button size="sm" variant="ghost" disabled={busyId !== undefined || placementIndex <= 0} onClick={() => void reorder(item, -1)} aria-label={`${copy.moveUp}: ${localeValue(item.title, locale)}`}>↑</Button><Button size="sm" variant="ghost" disabled={busyId !== undefined || placementIndex === placementItems.length - 1} onClick={() => void reorder(item, 1)} aria-label={`${copy.moveDown}: ${localeValue(item.title, locale)}`}>↓</Button></div></td></tr>; })}</tbody></table></div>
      {feedback ? <p className="admin-home__feedback" role="alert">{feedback}</p> : null}
      {archiveId ? <div className="admin-home__preview" role="alertdialog" aria-label={controls.archive}><p>{controls.archiveNote}</p><Button disabled={busyId !== undefined} onClick={() => { const item = data.items.find(row => row.id === archiveId); if (item) void transition(item, "archived"); }}>{controls.confirm}</Button><Button variant="secondary" onClick={() => setArchiveId(undefined)}>{copy.cancel}</Button></div> : null}
      {editing ? <BannerCreateForm key={editing.id} locale={locale} source={source} initialBanner={editing} onSaved={updated => { if (updated) { onChanged({ ...data, items: data.items.map(row => row.id === updated.id ? updated : row) }); setEditing(updated); } }} /> : null}
      {preview ? <aside className="admin-home__preview" aria-label={copy.preview}><h3>{copy.preview}</h3><strong>{localeValue(preview.banner.title, locale)}</strong>{preview.imageUrls.length ? <div className="admin-home__banner-gallery">{preview.imageUrls.map((url, index) => <img key={url} src={url} alt={`${localeValue(preview.banner.altText ?? preview.banner.title, locale)} ${index + 1}`} />)}</div> : <p>{copy.mediaNote}</p>}<p><code>{preview.banner.targetUrl ?? copy.targetUrl}</code></p></aside> : null}
    </section>
  );
}

function BannerCreateForm({ locale, source, onSaved, initialBanner, campaign }: { readonly locale: SupportedLocale; readonly source: AdminHomeSource; readonly onSaved: (banner?: AdBanner) => void; readonly initialBanner?: AdBanner; readonly campaign?: AdAdminRequest }) {
  const copy = getAdminHomeCopy(locale);
  const controls = getBannerControlCopy(locale);
  const [savedBanner, setSavedBanner] = useState(initialBanner);
  const [dirty, setDirty] = useState(false);
  const [placements, setPlacements] = useState<AdBannerConfig["placements"]>([]);
  useEffect(() => { let active = true; void source.loadBannerConfig().then(config => { if (active) setPlacements(config.placements); }).catch(() => {}); return () => { active = false; }; }, [source]);
  const uploadedUrls = useRef<string[]>([]);
  useEffect(() => () => uploadedUrls.current.forEach(url => URL.revokeObjectURL(url)), []);
  async function uploadedPreview(url: string) {
    const preview = await source.loadMediaPreview(url).catch(() => undefined);
    if (preview?.startsWith('blob:')) uploadedUrls.current.push(preview);
    return preview;
  }
  const [files, setFiles] = useState<File[]>([]);
  const [images, setImages] = useState<BannerImageSelection[]>((initialBanner?.mediaIds ?? (initialBanner?.mediaId ? [initialBanner.mediaId] : [])).map(id => ({ id })));
  const [displaySeconds, setDisplaySeconds] = useState(initialBanner?.displaySeconds ?? 8);
  const [title, setTitle] = useState<DraftLocalized>(draftLocalized(initialBanner?.title));
  const [altText, setAltText] = useState<DraftLocalized>(draftLocalized(initialBanner?.altText));
  const [bannerBody, setBannerBody] = useState<DraftLocalized>(draftLocalized(initialBanner?.body));
  const bannerContentHint = locale === 'ar' ? 'المحتوى هو السطر الظاهر تحت عنوان البانر في الصفحة الرئيسية. النص البديل وصف للصورة لقارئ الشاشة؛ لا يظهر كسطر تحت العنوان. احفظ التعديل، ثم انشر البانر أو تأكد أنه فعال وداخل فترة العرض.' : 'Content appears below the banner title on the homepage. Alternative text describes the image for screen readers; it does not appear below the title. Save your changes, then publish the banner or ensure it is active within its display period.';
  const linkedRequestId = initialBanner?.adRequestId ?? campaign?.request.id;
  const [placementKey, setPlacementKey] = useState(initialBanner?.placementKey ?? campaign?.request.placementKey ?? 'homepage.hero');
  const [targetUrl, setTargetUrl] = useState(initialBanner?.targetUrl ?? '');
  const start = initialBanner?.startAt ?? campaign?.request.intervalStart;
  const end = initialBanner?.endAt ?? campaign?.request.intervalEnd;
  const [startDate, setStartDate] = useState(start ? localDateParts(start)[0] : '');
  const [startTime, setStartTime] = useState(() => bannerTimeDraft(start ? localDateParts(start)[1] : ''));
  const [endDate, setEndDate] = useState(end ? localDateParts(end)[0] : '');
  const [endTime, setEndTime] = useState(() => bannerTimeDraft(end ? localDateParts(end)[1] : ''));
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ readonly tone: 'error' | 'success'; readonly text: string } | undefined>();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setFeedback(undefined);
    const parsedTitle = localizedInput(title);
    const startAt = linkedRequestId && start ? new Date(start) : scheduleInstant(startDate, startTime);
    const endAt = linkedRequestId && end ? new Date(end) : scheduleInstant(endDate, endTime);
    if (parsedTitle === undefined || startAt === undefined || endAt === undefined || ((savedBanner || files.length) && reason.trim().length < 2)) { setFeedback({ tone: 'error', text: copy.validation }); return; }
    if (images.length + files.length > 20) { setFeedback({ tone: 'error', text: controls.uploadHint }); return; }
    if (endAt <= startAt) { setFeedback({ tone: 'error', text: copy.schedule.invalidRange }); return; }
    if (linkedRequestId && !targetUrl.trim()) { setFeedback({ tone: 'error', text: locale === 'ar' ? 'حدد رابط صفحة العقار أو الشركة المطورة.' : 'Set the property or developer page URL.' }); return; }
    const input: AdBannerCreate = { ...(linkedRequestId ? { adRequestId: linkedRequestId } : {}), placementKey: placementKey.trim(), displaySeconds, title: parsedTitle, ...(localizedInput(bannerBody) ? { body: localizedInput(bannerBody) } : {}), ...(localizedInput(altText) === undefined ? {} : { altText: localizedInput(altText) }), ...(targetUrl.trim() === '' ? {} : { targetUrl: targetUrl.trim() }), startAt: startAt.toISOString(), endAt: endAt.toISOString() };
    const { adRequestId: _linkedId, ...editableInput } = input;
    void _linkedId;
    setSaving(true);
    let creating = savedBanner === undefined;
    try {
      let created = savedBanner ? await source.updateBanner(savedBanner.id, { ...editableInput, body: localizedInput(bannerBody) ?? null, altText: localizedInput(altText) ?? null, targetUrl: targetUrl.trim() || null, expectedVersion: savedBanner.version, reason: reason.trim() }) : await source.createBanner(input);
      setSavedBanner(created);
      creating = false;
      const selected = [...images];
      for (const file of files) {
        const attached = await source.uploadBannerImage(created.id, file);
        selected.push({ id: attached.id, url: await uploadedPreview(attached.url) });
        setImages([...selected]);
        setFiles(current => current.filter(item => item !== file));
      }
      created = await source.updateBanner(created.id, { expectedVersion: created.version, mediaIds: selected.map(item => item.id), reason: reason.trim() || 'Save banner images' });
      setSavedBanner(created);
      setDirty(false);
      setFeedback({ tone: 'success', text: created.status === 'draft' ? controls.draftSaved : copy.saved });
      onSaved(created);
    } catch (error) { setFeedback({ tone: 'error', text: mutationMessage(error, copy, creating) }); } finally { setSaving(false); }
  }

  useEffect(() => {
    if (!initialBanner) return;
    let active = true;
    const urls: string[] = [];
    void source.previewBanner(initialBanner.id).then(async result => {
      const items = result.mediaItems ?? (result.media ? [result.media] : []);
      const loaded = await Promise.all(items.map(async item => {
        const url = await source.loadMediaPreview(item.url).catch(() => undefined);
        if (url?.startsWith('blob:')) urls.push(url);
        return { id: item.id, url };
      }));
      if (active) setImages(loaded);
      else urls.forEach(url => URL.revokeObjectURL(url));
    }).catch(() => { if (active) setFeedback({ tone: 'error', text: controls.failed }); });
    return () => { active = false; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [initialBanner, source, controls.failed]);
  async function publish() {
    if (!savedBanner || !(savedBanner.mediaIds ?? (savedBanner.mediaId ? [savedBanner.mediaId] : [])).length) { setFeedback({ tone: 'error', text: controls.mediaRequired }); return; }
    if (new Date(savedBanner.endAt).getTime() <= Date.now()) { setFeedback({ tone: 'error', text: controls.expired }); return; }
    setSaving(true);
    try {
      const updated = await source.updateBanner(savedBanner.id, { expectedVersion: savedBanner.version, status: new Date(savedBanner.startAt).getTime() > Date.now() ? 'scheduled' : 'active', reason: 'Publish saved banner' });
      setSavedBanner(updated); onSaved(updated); setFeedback({ tone: 'success', text: controls.published });
    } catch (error) { setFeedback({ tone: 'error', text: error instanceof ApiClientError && error.status === 409 ? controls.conflict : mutationMessage(error, copy) }); } finally { setSaving(false); }
  }
  return <section className="admin-home__editor" data-testid="admin-home-banner-editor"><div className="admin-home__editor-heading"><div><h2>{initialBanner ? controls.edit : copy.newBanner}</h2><p>{copy.bannerDescription}</p></div><a className="admin-home__text-link" href={`${ADMIN_BANNERS_ROUTE}?lang=${encodeURIComponent(locale)}`}>{copy.cancel}</a></div><form onChange={() => setDirty(true)} onSubmit={event => { void submit(event); }}>{linkedRequestId ? <BannerDestinationHint requestId={linkedRequestId} locale={locale} /> : null}<div className="admin-home__form-grid"><label htmlFor="admin-home-banner-placement">{copy.placement}<select id="admin-home-banner-placement" disabled={Boolean(linkedRequestId)} value={placementKey} onChange={event => setPlacementKey(event.target.value)} required><BannerPlacementOptions placements={placements} placementKey={placementKey} campaign={campaign} locale={locale} /></select></label><label htmlFor="admin-home-banner-target">{copy.targetUrl}<input id="admin-home-banner-target" required={Boolean(linkedRequestId)} type="url" value={targetUrl} onChange={event => setTargetUrl(event.target.value)} placeholder="https://" /></label><label htmlFor="admin-home-banner-start">{copy.schedule.startDate}<input id="admin-home-banner-start" disabled={Boolean(linkedRequestId)} type="date" dir="ltr" aria-describedby="admin-home-banner-schedule-hint" value={startDate} onChange={event => setStartDate(event.target.value)} required /></label><BannerTimeField id="admin-home-banner-start-time" label={copy.schedule.startTime} locale={locale} value={startTime} disabled={Boolean(linkedRequestId)} onChange={setStartTime} /><label htmlFor="admin-home-banner-end">{copy.schedule.endDate}<input id="admin-home-banner-end" disabled={Boolean(linkedRequestId)} type="date" dir="ltr" aria-describedby="admin-home-banner-schedule-hint" value={endDate} onChange={event => setEndDate(event.target.value)} required /></label><BannerTimeField id="admin-home-banner-end-time" label={copy.schedule.endTime} locale={locale} value={endTime} disabled={Boolean(linkedRequestId)} onChange={setEndTime} /></div><AdPlacementGuide placementKey={placementKey} locale={locale} /><p className="admin-home__hint" id="admin-home-banner-schedule-hint">{copy.schedule.hint}</p><BannerSchedulePreview locale={locale} startDate={startDate} startTime={startTime} endDate={endDate} endTime={endTime} /><LocalizedFields prefix="admin-home-banner-title" label={copy.title} value={title} onChange={(key, value) => setTitle(current => ({ ...current, [key]: value }))} copy={copy} /><LocalizedFields prefix="admin-home-banner-body" label={copy.body} value={bannerBody} onChange={(key, value) => setBannerBody(current => ({ ...current, [key]: value }))} multiline copy={copy} /><p className="admin-home__hint">{bannerContentHint}</p><LocalizedFields prefix="admin-home-banner-alt" label={copy.altText} value={altText} onChange={(key, value) => setAltText(current => ({ ...current, [key]: value }))} copy={copy} /><fieldset className="admin-home__media-fields"><legend>{locale === 'ar' ? 'صور الإعلان' : 'Advertisement images'}</legend><label htmlFor="admin-home-banner-file">{controls.upload}<input id="admin-home-banner-file" type="file" multiple disabled={saving} accept="image/png,image/jpeg,image/webp" onChange={event => {
      const selected = Array.from(event.target.files ?? []);
      if (selected.some(file => file.size > 10 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) || images.length + files.length + selected.length > 20) {
        setFeedback({ tone: 'error', text: controls.uploadHint }); event.target.value = ''; return;
      }
      setFiles(current => [...current, ...selected]); event.target.value = '';
    }} /></label><p className="admin-home__hint">{controls.uploadHint}</p><Button type="button" variant="secondary" disabled={saving} aria-expanded={libraryOpen} onClick={() => setLibraryOpen(value => !value)}>{locale === 'ar' ? 'اختيار من مكتبة الوسائط' : 'Choose from media library'}</Button>{libraryOpen ? <BannerMediaLibrary source={source} locale={locale} disabled={saving || images.length + files.length >= 20} onPick={file => { setFiles(current => current.length + images.length >= 20 ? current : [...current, file]); setDirty(true); }} /> : null}<BannerGallery locale={locale} images={images} files={files} disabled={saving} onChange={value => { setImages(value); setDirty(true); }} onFilesChange={value => { setFiles(value); setDirty(true); }} /><p className="admin-home__hint">{locale === 'ar' ? 'يمكنك إضافة حتى 20 صورة. تتبدّل بالترتيب بعد النشر. المقاس المقترح 1200 × 400 بكسل، ويجب مطابقة المقاسات المسموحة في إعدادات الإعلانات.' : 'Add up to 20 images. They rotate in order after publication. Suggested size: 1200 × 400 px; match the sizes allowed in advertising settings.'}</p><label htmlFor="admin-home-banner-duration">{locale === 'ar' ? 'مدة عرض كل صورة (بالثواني)' : 'Seconds per image'}<input id="admin-home-banner-duration" type="number" min="3" max="60" step="1" required value={displaySeconds} onChange={event => setDisplaySeconds(Number(event.target.value))} /></label></fieldset>{savedBanner || files.length ? <label htmlFor="admin-home-banner-reason">{copy.reason}<textarea id="admin-home-banner-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={3} required placeholder={copy.reasonPlaceholder} /></label> : null}<div className="admin-home__inline-actions"><Button type="submit" loading={saving} disabled={saving}>{saving ? copy.saving : copy.save}</Button>{savedBanner?.status === "draft" ? <Button type="button" variant="secondary" disabled={saving || dirty} onClick={() => void publish()}>{controls.publish}</Button> : null}<a className="admin-home__text-link" href={`${ADMIN_BANNERS_ROUTE}?lang=${encodeURIComponent(locale)}`}>{copy.cancel}</a></div>{feedback ? <p className="admin-home__feedback" data-tone={feedback.tone} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.text}</p> : null}</form></section>;
}

function ContentForm({ namespace, item, locale, source, onSaved, onCancel }: { readonly namespace: 'tips' | 'homepage'; readonly item?: HomeContentItem; readonly locale: SupportedLocale; readonly source: AdminHomeSource; readonly onSaved: (data: AdminHomeCmsContent) => void; readonly onCancel: () => void }) {
  const copy = getAdminHomeCopy(locale);
  const isTip = namespace === 'tips';
  const tip = isTip && item !== undefined && 'active' in item ? item : undefined;
  const section = !isTip && item !== undefined && 'visible' in item ? item : undefined;
  const [key, setKey] = useState(item?.key ?? '');
  const [title, setTitle] = useState<DraftLocalized>(draftLocalized(item?.title));
  const [body, setBody] = useState<DraftLocalized>(draftLocalized(item?.body));
  const [order, setOrder] = useState(isTip ? '' : String(item?.order ?? 0));
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
    const common = { key: key.trim(), title: parsedTitle, body: parsedBody, ...(!isTip || order.trim() ? { order: Number(order) } : {}), status, reason: reason.trim(), ...(isTip ? { active } : { visible }) };
    const changes = { title: parsedTitle, body: parsedBody, ...(!isTip || order.trim() ? { order: Number(order) } : {}), status, reason: reason.trim(), ...(isTip ? { active } : { visible }) };
    setSaving(true);
    try {
      const next = item === undefined ? await source.updateContent(namespace, common) : await source.updateContent(namespace, { id: item.id, version: item.version, ...changes });
      onSaved(next); onCancel();
    } catch (error) { setFeedback(mutationMessage(error, copy)); } finally { setSaving(false); }
  }

  return <section className="admin-home__editor" data-testid={`admin-home-${namespace}-editor`}><div className="admin-home__editor-heading"><div><h2>{item === undefined ? `${copy.add}: ${isTip ? copy.tips : copy.homepage}` : `${copy.save}: ${localeValue(item.title, locale)}`}</h2><p>{isTip ? copy.tipsDescription : copy.homepageDescription}</p></div><Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div><div className={isTip ? "admin-home__tip-workspace" : undefined}><form onSubmit={event => { void submit(event); }}><div className="admin-home__form-grid"><label htmlFor={`admin-home-${namespace}-key`}>{copy.key}<input id={`admin-home-${namespace}-key`} value={key} onChange={event => setKey(event.target.value)} pattern="[a-z][a-z0-9_]{1,63}" disabled={item !== undefined} required /></label><label htmlFor={`admin-home-${namespace}-order`}><span id={`admin-home-${namespace}-order-label`}>{isTip ? (locale === 'ar' ? 'ترتيب الظهور (اختياري)' : 'Display order (optional)') : copy.order}</span><input aria-labelledby={`admin-home-${namespace}-order-label`} id={`admin-home-${namespace}-order`} type="number" min="0" max="100000" step="1" value={order} onChange={event => setOrder(event.target.value)} required={!isTip} aria-describedby={isTip ? "tip-order-help" : undefined} placeholder={isTip && item ? String(item.order) : undefined} />{isTip ? <small id="tip-order-help">{locale === 'ar' ? item ? 'سيبه فاضي للاحتفاظ بالترتيب الحالي. الرقم الأصغر يظهر أولاً.' : 'سيبه فاضي وهتتضاف آخر القائمة تلقائيًا. الرقم الأصغر يظهر أولاً.' : item ? 'Leave blank to keep the current order. Smaller numbers appear first.' : 'Leave blank to add at the end automatically. Smaller numbers appear first.'}</small> : null}</label></div><LocalizedFields prefix={`admin-home-${namespace}-title`} label={copy.title} value={title} onChange={(localeKey, value) => setTitle(current => ({ ...current, [localeKey]: value }))} copy={copy} /><LocalizedFields prefix={`admin-home-${namespace}-body`} label={copy.body} value={body} onChange={(localeKey, value) => setBody(current => ({ ...current, [localeKey]: value }))} multiline copy={copy} /><div className="admin-home__form-grid"><label htmlFor={`admin-home-${namespace}-status`}>{copy.status}<select id={`admin-home-${namespace}-status`} value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="draft">{copy.statuses.draft}</option><option value="published">{copy.statuses.published}</option><option value="inactive">{copy.statuses.inactive}</option></select></label><label className="admin-home__checkbox" htmlFor={`admin-home-${namespace}-${isTip ? 'active' : 'visible'}`}><input id={`admin-home-${namespace}-${isTip ? 'active' : 'visible'}`} type="checkbox" checked={isTip ? active : visible} onChange={event => isTip ? setActive(event.target.checked) : setVisible(event.target.checked)} />{isTip ? copy.active : copy.visible}</label></div><label htmlFor={`admin-home-${namespace}-reason`}>{copy.reason}<textarea id={`admin-home-${namespace}-reason`} value={reason} onChange={event => setReason(event.target.value)} minLength={3} required placeholder={copy.reasonPlaceholder} /></label><div className="admin-home__inline-actions">{canUpdate ? <Button type="submit" loading={saving} disabled={saving}>{saving ? copy.saving : copy.save}</Button> : <span className="admin-home__muted">{copy.states.permission.title}</span>}<Button type="button" variant="secondary" onClick={onCancel}>{copy.cancel}</Button></div>{feedback ? <p className="admin-home__feedback" data-tone="error" role="alert">{feedback}</p> : null}</form>{isTip ? <ContentPreview locale={locale} title={title} body={body} status={status} active={active} /> : null}</div></section>;
}

function ContentTable({ data, namespace, locale, source, onChanged, onEdit }: { readonly data: AdminHomeCmsContent; readonly namespace: 'tips' | 'homepage'; readonly locale: SupportedLocale; readonly source: AdminHomeSource; readonly onChanged: (data: AdminHomeCmsContent) => void; readonly onEdit: (item: HomeContentItem) => void }) {
  const copy = getAdminHomeCopy(locale);
  const items = data.items as readonly HomeContentItem[];
  const [preview, setPreview] = useState<HomeContentItem>();
  const [visibility, setVisibility] = useState<CmsAdminHomepageSection>();
  const [feedback, setFeedback] = useState<string>();
  const visibilityEditor = visibility ? <HomepageSectionVisibility key={`${visibility.id}-${visibility.version}`} item={visibility} locale={locale} source={source} onCancel={() => setVisibility(undefined)} onSaved={next => {
    onChanged(next); setVisibility(undefined);
    setFeedback(isHomepageSectionVisible(visibility)
      ? locale === 'ar' ? 'تم إيقاف القسم. يمكنك إعادة تشغيله لاحقًا.' : 'Section stopped. You can resume it later.'
      : locale === 'ar' ? 'تم تشغيل القسم ومحتواه ظاهر للزوار.' : 'Section resumed. Its content is visible to visitors.');
  }} /> : null;
  return <section className="admin-home__panel" aria-labelledby={`admin-home-${namespace}-list-title`}><div className="admin-home__panel-heading"><div><h2 id={`admin-home-${namespace}-list-title`}>{namespace === 'tips' ? copy.tips : copy.homepage}</h2><p>{namespace === 'tips' ? copy.tipsDescription : copy.homepageDescription}</p></div><span>{items.length}</span></div><div className="admin-home__table-wrap"><table className="admin-home__table"><caption className="a11y-visually-hidden">{namespace === 'tips' ? copy.tips : copy.homepage}</caption><thead><tr><th scope="col">{copy.order}</th><th scope="col">{copy.title}</th><th scope="col">{copy.status}</th><th scope="col">{namespace === 'tips' ? copy.active : copy.visible}</th><th scope="col">{copy.version}</th><th scope="col">{copy.actions}</th></tr></thead><tbody>{items.map(item => <tr key={item.id} data-testid={`admin-home-${namespace}-${item.id}`}><td>{item.order}</td><td><strong>{localeValue(item.title, locale)}</strong><small>{item.key}</small></td><td><StatusBadge status={namespace === 'homepage' && 'visible' in item && item.status !== 'draft' && !isHomepageSectionVisible(item) ? 'inactive' : item.status} locale={locale} /></td><td>{'active' in item ? (item.active ? copy.statuses.active : copy.statuses.inactive) : 'visible' in item ? (isHomepageSectionVisible(item) ? (locale === 'ar' ? 'ظاهر للزوار' : 'Visible to visitors') : (locale === 'ar' ? 'مخفي عن الزوار' : 'Hidden from visitors')) : '—'}</td><td>{item.version}</td><td><div className="admin-home__row-actions">{namespace === 'tips' ? <Button size="sm" variant="secondary" onClick={() => setPreview(item)}>{locale === 'ar' ? 'معاينة' : 'Preview'}</Button> : null}{item.availableActions.includes('update') ? <Button size="sm" disabled={visibility !== undefined} onClick={() => { setPreview(undefined); onEdit(item); }}>{copy.actionsByKey.update}</Button> : <span className="admin-home__muted">{copy.states.permission.title}</span>}{namespace === 'homepage' && 'visible' in item ? item.availableActions.includes(isHomepageSectionVisible(item) ? 'deactivate' : 'publish') ? <Button size="sm" variant="secondary" disabled={visibility !== undefined} onClick={() => { setPreview(undefined); setFeedback(undefined); setVisibility(item); }}>{homepageSectionActionLabel(item, locale)}</Button> : null : item.availableActions.includes('publish') ? <Button size="sm" variant="secondary" onClick={() => { setPreview(undefined); onEdit(item); }}>{copy.actionsByKey.publish}</Button> : null}</div></td></tr>)}</tbody></table></div>{feedback ? <p className="admin-home__feedback" data-tone="success" role="status">{feedback}</p> : null}{visibilityEditor}{preview ? <ContentPreview locale={locale} title={preview.title} body={preview.body ?? {}} status={preview.status} active={'active' in preview ? preview.active : false} saved onClose={() => setPreview(undefined)} /> : null}{items.length === 0 ? <p className="admin-home__empty-hint">{copy.states.empty.body}</p> : null}</section>;
}

export function AdminHome({ url, locale, session, authClient, apiOrigin, initialBanners, initialContent, source: providedSource }: AdminHomeProps) {
  const path = pathFor(url);
  const route = routeFor(path);
  const copy = getAdminHomeCopy(locale);
  const source = useMemo(() => providedSource ?? createAdminHomeSource({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, providedSource]);
  const query = new URL(url ?? (typeof window === 'undefined' ? path : window.location.href), 'http://sadat-real-estate.local').searchParams;
  const requestId = query.get('requestId') ?? undefined;
  const adRequestId = query.get('adRequestId') ?? undefined;
  const initialBannersMatch = route === 'banners' && initialBanners !== undefined && !adRequestId;
  const initialContentMatch = (route === 'tips' && initialContent?.namespace === 'tips') || (route === 'homepage' && initialContent?.namespace === 'homepage');
  const [state, setState] = useState<AdminHomeState>(() => session.status !== 'authenticated' || session.role !== 'admin' ? 'permission' : route === 'banner_create' ? 'success' : route === 'not_found' ? 'not_found' : initialBannersMatch ? stateForItems(initialBanners.items) : initialContentMatch ? stateForItems(initialContent!.items) : 'loading');
  const [banners, setBanners] = useState<AdBannerListData | undefined>(initialBannersMatch ? initialBanners : undefined);
  const [content, setContent] = useState<AdminHomeCmsContent | undefined>(initialContentMatch ? initialContent : undefined);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<HomeContentItem | 'new' | undefined>();
  const sessionRole = session.status === 'authenticated' ? session.role : undefined;

  useEffect(() => {
    const allowed = session.status === 'authenticated' && session.role === 'admin';
    if (!allowed) { setState('permission'); return undefined; }
    if (route === 'not_found' || route === 'banner_create') { setState(route === 'not_found' ? 'not_found' : 'success'); return undefined; }
    if ((route === 'banners' && initialBannersMatch && attempt === 0 && page === 1) || (route === 'tips' && initialContentMatch && attempt === 0) || (route === 'homepage' && initialContentMatch && attempt === 0)) return undefined;
    const controller = new AbortController();
    setState('loading');
    const request = route === 'banners' ? source.loadBanners({ page, limit: 20, placementKey: 'homepage.hero', ...(adRequestId ? { adRequestId } : {}) }, controller.signal) : source.loadContent(route === 'tips' ? 'tips' : 'homepage', controller.signal);
    void request.then(next => {
      if (controller.signal.aborted) return;
      if (route === 'banners') { const nextBanners = next as AdBannerListData; setBanners(nextBanners); setState(stateForItems(nextBanners.items)); }
      else { const nextContent = next as AdminHomeCmsContent; setContent(nextContent); setState(stateForItems(nextContent.items)); }
    }).catch(error => { if (!controller.signal.aborted) setState(stateForError(error)); });
    return () => controller.abort();
  }, [attempt, page, adRequestId, initialBannersMatch, initialContentMatch, route, sessionRole, session.status, source]);

  const refresh = () => setAttempt(value => value + 1);
  const cmsNamespace = route === 'tips' || route === 'homepage' ? route : undefined;
  const activeContent = cmsNamespace !== undefined && content?.namespace === cmsNamespace ? content : undefined;
  const addContent = () => setEditing('new');

  async function saveContent(next: AdminHomeCmsContent): Promise<void> { setContent(next); setState(stateForItems(next.items)); }

  return <section className="admin-home" data-screen-id={route === 'banners' ? 'ADM-46' : route === 'banner_create' ? 'ADM-47' : route === 'tips' ? 'ADM-48' : route === 'homepage' ? 'ADM-49' : undefined} data-route={path} data-device-scope="desktop" data-admin-home-state={state}><AdminNavigation locale={locale} activePath={path} /><div className="admin-home__content"><header className="admin-home__heading"><div><p className="admin-home__eyebrow">{copy.eyebrow}</p><h1>{route === 'banners' ? copy.banners : route === 'banner_create' ? copy.newBanner : route === 'tips' ? copy.tips : route === 'homepage' ? copy.homepage : copy.states.not_found.title}</h1><p>{route === 'banners' || route === 'banner_create' ? copy.bannerDescription : route === 'tips' ? copy.tipsDescription : copy.homepageDescription}</p></div>{route === 'banners' ? <a className="admin-home__primary-link" href={`${ADMIN_BANNERS_ROUTE}/new?lang=${encodeURIComponent(locale)}`}>{copy.newBanner}</a> : route === 'tips' || route === 'homepage' ? <Button type="button" onClick={addContent}>{copy.add}</Button> : null}</header><nav className="admin-home__tabs" aria-label={copy.eyebrow}><a href={`${ADMIN_BANNERS_ROUTE}?lang=${encodeURIComponent(locale)}`} data-active={route === 'banners' || route === 'banner_create' || undefined}>{copy.banners}</a><a href={`${ADMIN_CMS_TIPS_ROUTE}?lang=${encodeURIComponent(locale)}`} data-active={route === 'tips' || undefined}>{copy.tips}</a><a href={`${ADMIN_CMS_HOMEPAGE_ROUTE}?lang=${encodeURIComponent(locale)}`} data-active={route === 'homepage' || undefined}>{copy.homepage}</a></nav>{state === 'loading' || state === 'error' || state === 'retry' || state === 'permission' ? <StatePanel state={state} locale={locale} form={route === 'banner_create'} onRetry={refresh} /> : null}{state === 'not_found' ? <section className="admin-home__state" data-state="not_found"><h2>{copy.states.not_found.title}</h2><p>{copy.states.not_found.body}</p></section> : null}{(route === "banners" || route === "banner_create") && (state === "success" || state === "empty") ? <BannerDisplayControls locale={locale} source={source} /> : null}{route === 'banner_create' && state === 'success' ? requestId ? <RequestBannerContext requestId={requestId} locale={locale} source={source} render={campaign => <BannerCreateForm key={campaign.request.id} locale={locale} source={source} campaign={campaign} onSaved={() => {}} />} /> : <BannerCreateForm locale={locale} source={source} onSaved={() => {}} /> : null}{route === 'banners' && state === 'empty' ? <section className="admin-home__state" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p><a className="admin-home__primary-link" href={`${ADMIN_BANNERS_ROUTE}/new?lang=${encodeURIComponent(locale)}`}>{copy.newBanner}</a></section> : null}{route === 'banners' && state === 'success' && banners !== undefined ? <><BannerTable data={banners} locale={locale} source={source} onChanged={setBanners} />{banners.total > banners.limit ? <nav className="admin-home__inline-actions" aria-label={copy.banners}><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>{getBannerControlCopy(locale).previous}</Button><span>{page} / {Math.ceil(banners.total / banners.limit)}</span><Button variant="secondary" disabled={page * banners.limit >= banners.total} onClick={() => setPage(value => value + 1)}>{getBannerControlCopy(locale).next}</Button></nav> : null}</> : null}{cmsNamespace !== undefined && activeContent !== undefined && state === 'empty' ? <section className="admin-home__state" data-state="empty"><h2>{copy.states.empty.title}</h2><p>{copy.states.empty.body}</p><Button type="button" onClick={addContent}>{copy.add}</Button></section> : null}{cmsNamespace !== undefined && activeContent !== undefined && state === 'success' ? <ContentTable data={activeContent} namespace={cmsNamespace} locale={locale} source={source} onChanged={next => { void saveContent(next); setEditing(undefined); }} onEdit={item => setEditing(item)} /> : null}{cmsNamespace !== undefined && editing !== undefined ? <ContentForm namespace={cmsNamespace} {...(editing === 'new' ? {} : { item: editing })} locale={locale} source={source} onSaved={next => void saveContent(next)} onCancel={() => setEditing(undefined)} /> : null}<p className="admin-home__direction-note">{copy.directionNote}</p></div></section>;
}
