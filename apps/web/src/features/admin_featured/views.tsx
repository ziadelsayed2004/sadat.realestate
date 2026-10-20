import { AdPlacementGuide } from '../admin_ads/placement-guide.tsx';
import { z } from 'zod';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { featuredOptionsSuccessEnvelopeSchema, type AdBanner, type AdAdminRequest, type FeaturedOptions, type LocalizedText, type SupportedLocale, type PublicHomepageBanner } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { createAdminSessionClient, adminSessionOptions } from '../admin_ads/data.ts';
import { AdminNavigation } from '../admin/index.ts';
import { Button } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { createAdminHomeSource, type AdminHomeSource, type AdminHomeAuthorizationSource } from '../admin_home/data.ts';
import { FeaturedCard, featuredText, FEATURED_CARD_SECONDS } from '../public/featured-card.tsx';
import { egyptInstant, egyptLocalDateTime } from '../public/egypt-time.ts';
import '../admin_home/styles.css';
import './styles.css';
import { FeaturedPreview } from './preview.tsx';
import { featuredOrder } from './order.ts';
import { FeaturedDisplaySettings } from './display-settings.tsx';

const dateLabel = (value: string, locale: SupportedLocale) => new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const placementKey = 'homepage.featured';
const cleanText = (value: LocalizedText): LocalizedText | undefined => { const entries = Object.entries(value).filter(([, text]) => text?.trim()).map(([locale, text]) => [locale, text?.trim()]); return entries.length ? Object.fromEntries(entries) : undefined; };
const failure = (error: unknown, ar: boolean) => {
  const messages: Record<number, string> = { 403: ar ? 'تحتاج صلاحية إدارة الإعلانات.' : 'Ad management permission required.', 401: ar ? 'انتهت الجلسة؛ سجّل دخولك.' : 'Session expired; sign in.', 409: ar ? 'السجل تغيّر؛ أعد المحاولة.' : 'Record changed; retry.' };
  return messages[error instanceof ApiClientError ? error.status ?? 0 : 0] ?? (ar ? 'تعذر التنفيذ؛ أعد المحاولة.' : 'Could not complete; retry.');
};
function TextFields({ label, value, set, locale, multiline = false }: { label: string; value: LocalizedText; set: (value: LocalizedText) => void; locale: SupportedLocale; multiline?: boolean }) {
  return <section className="admin-featured__texts" role="group" aria-label={label}><h3>{label}</h3><label dir={locale === 'ar' ? 'rtl' : 'ltr'}><span>{locale === 'ar' ? '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' : 'English'}</span>{multiline ? <textarea value={value[locale] ?? ''} maxLength={2000} onChange={event => set({ ...value, [locale]: event.target.value })} /> : <input value={value[locale] ?? ''} maxLength={500} onChange={event => set({ ...value, [locale]: event.target.value })} />}</label></section>;
}

export function FeaturedEditor({ item, campaign, options, loadOptions, source, locale, onSaved, onClose }: { item?: AdBanner | undefined; campaign?: AdAdminRequest['request'] | undefined; options: FeaturedOptions; loadOptions: (id?: string) => Promise<FeaturedOptions>; source: AdminHomeSource; locale: SupportedLocale; onSaved: () => void; onClose: () => void }) {
  const ar = locale === 'ar';
  const [saved, setSaved] = useState(item);
  const [provider, setProvider] = useState(() => {
    const id = item?.featured?.advertiserProviderId ?? campaign?.providerId ?? '';
    return id ? options.advertisers.find(value => value.id === id || value.aliases?.includes(id))?.id ?? id : options.advertisers.length === 1 ? options.advertisers[0]!.id : '';
  });
  const [loadedAdvertiser, setLoadedAdvertiser] = useState<FeaturedOptions['advertisers'][number]>();
  const [destinations, setDestinations] = useState<FeaturedOptions['destinations']>([]);
  const [destination, setDestination] = useState(item?.featured?.destination ? `${item.featured.destination.kind}:${item.featured.destination.id}` : '');
  const [texts, setTexts] = useState({ title: item?.title ?? {}, body: item?.body ?? {}, highlight: item?.featured?.highlight ?? {}, installment: item?.featured?.installment ?? {}, ctaLabel: item?.featured?.ctaLabel ?? {} });
  const { title, body, highlight, ctaLabel } = texts;
  const [editingLanguage, setEditingLanguage] = useState<SupportedLocale>(locale);
  const [installmentEnabled, setInstallmentEnabled] = useState(Object.values(item?.featured?.installment ?? {}).some(Boolean));
  const installment = installmentEnabled ? { ar: '\u0645\u062a\u0627\u062d \u0628\u0627\u0644\u062a\u0642\u0633\u064a\u0637', en: 'Installments available' } : {};
  const [start, setStart] = useState(egyptLocalDateTime(new Date(item?.startAt ?? campaign?.intervalStart ?? Date.now()))), [end, setEnd] = useState(egyptLocalDateTime(new Date(item?.endAt ?? campaign?.intervalEnd ?? Date.now() + 86400000 * 30)));
  const [imageIds, setImageIds] = useState<string[]>(item?.mediaIds ?? (item?.mediaId ? [item.mediaId] : []));
  const [image, setImage] = useState<string>(), [file, setFile] = useState<File>(), [filePreview, setFilePreview] = useState<string>();
  const [previewError, setPreviewError] = useState(false), [previewAttempt, setPreviewAttempt] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string>(), [feedback, setFeedback] = useState<string>(), [previewSize, setPreviewSize] = useState<'desktop' | 'mobile'>('desktop');
  useEffect(() => { let current = true; setDestinations([]); setError(undefined); if (!provider) return; void loadOptions(provider).then(value => { if (current) { setDestinations(value.destinations); setLoadedAdvertiser(value.advertisers.find(item => item.id === provider || item.aliases?.includes(provider))); if (value.destinations.length === 1) setDestination(current => current || `${value.destinations[0]!.kind}:${value.destinations[0]!.id}`); } }).catch(() => { if (current) setError(ar ? 'الحساب غير متاح للإعلان.' : 'Advertiser unavailable.'); }); return () => { current = false; }; }, [provider, loadOptions, ar]);
  useEffect(() => { if (!file) { setFilePreview(undefined); return; } const url = URL.createObjectURL(file); setFilePreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => {
    let current = true, objectUrl: string | undefined;
    setImage(undefined); setPreviewError(false);
    if (saved) void source.previewBanner(saved.id).then(async value => {
      if (!value.media) return;
      const url = await source.loadMediaPreview(value.media.url);
      if (!current) { if (url.startsWith('blob:')) URL.revokeObjectURL(url); return; }
      if (url.startsWith('blob:')) objectUrl = url;
      setImage(url);
    }).catch(() => { if (current) setPreviewError(true); });
    return () => { current = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [saved, source, previewAttempt]);
  const advertiser = options.advertisers.find(value => value.id === provider) ?? (loadedAdvertiser?.id === provider || loadedAdvertiser?.aliases?.includes(provider) ? loadedAdvertiser : undefined);
  const missingSelection = !provider ? (ar ? 'اختر حساب صاحب الإعلان أولًا.' : 'Choose the advertiser account first.') : !advertiser ? (ar ? 'حساب صاحب الطلب غير مؤهل حاليًا. افتح حسابه وراجع حالة الاعتماد.' : 'The request owner is not currently eligible. Open their account and review approval.') : !destinations.length ? (ar ? 'لا توجد صفحات منشورة لهذا الحساب لربط الإعلان بها. انشر عقارًا أو مشروعًا، أو راجع صفحة الشركة أولًا.' : 'This account has no published destination pages. Publish a property/project or review its company page first.') : !destinations.some(item => `${item.kind}:${item.id}` === destination) ? (ar ? 'اختر الصفحة التي سيفتحها الإعلان من القائمة أعلى النموذج.' : 'Choose the destination page from the list above.') : undefined;
  const selected = destinations.find(value => `${value.kind}:${value.id}` === destination);
  const preview: PublicHomepageBanner = { key: 'featured_preview', presentation: 'featured', title: cleanText(title), body: cleanText(body), highlight: cleanText(highlight), installment: cleanText(installment), ctaLabel: cleanText(ctaLabel), imageUrl: filePreview ?? image, targetUrl: selected?.href, advertiserName: advertiser?.name, advertiserImageUrl: advertiser?.imageUrl, advertiserVerified: advertiser?.verified ?? false, order: saved?.sortOrder ?? 0 };
  async function save(publish: boolean, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); setFeedback(undefined);
    const parsedTitle = cleanText(title), startAt = campaign?.intervalStart ? new Date(campaign.intervalStart) : egyptInstant(start), endAt = campaign?.intervalEnd ? new Date(campaign.intervalEnd) : egyptInstant(end);
    if (!advertiser || !selected || !parsedTitle || !startAt || !endAt || endAt <= startAt || publish && endAt.getTime() <= Date.now() || publish && !file && !imageIds.length) { setError(ar ? 'راجع الحساب والصفحة والعنوان والصورة والمواعيد.' : 'Check advertiser, page, title, image and dates.'); return; }
    const fields = { placementKey, title: parsedTitle, body: cleanText(body), featured: { advertiserProviderId: provider, destination: { kind: selected.kind, id: selected.id }, highlight: cleanText(highlight), installment: cleanText(installment), ctaLabel: cleanText(ctaLabel), ...(saved?.featured?.eyebrow ? { eyebrow: saved.featured.eyebrow } : {}) }, startAt: startAt.toISOString(), endAt: endAt.toISOString(), displaySeconds: FEATURED_CARD_SECONDS };
    setBusy(true);
    try {
      let record = saved ? await source.updateBanner(saved.id, { ...fields, body: fields.body ?? null, status: 'draft', expectedVersion: saved.version, reason: 'Save featured content' }) : await source.createBanner({ ...fields, ...(campaign ? { adRequestId: campaign.id } : {}) });
      setSaved(record);
      let selectedIds = imageIds;
      if (file) { const media = await source.uploadBannerImage(record.id, file); selectedIds = [media.id]; setImageIds(selectedIds); setFile(undefined); }
      record = await source.updateBanner(record.id, { mediaIds: selectedIds, expectedVersion: record.version, reason: 'Save featured card image' }); setSaved(record);
      if (publish) { record = await source.updateBanner(record.id, { status: new Date(record.startAt).getTime() > Date.now() ? 'scheduled' : 'active', expectedVersion: record.version, reason: 'Publish featured card' }); setSaved(record); }
      setFeedback(ar ? publish ? 'تم حفظ الإعلان ونشره حسب موعده.' : 'تم حفظ المسودة.' : publish ? 'Ad saved and published for its schedule.' : 'Draft saved.'); onSaved();
    } catch (cause) { setError(failure(cause, ar)); } finally { setBusy(false); }
  }
  return <section className="admin-home__editor" aria-label={ar ? 'تعديل الإعلان المميز' : 'Featured ad editor'}><div className="admin-home__editor-heading"><h2>{ar ? 'محتوى الكارت المميز' : 'Featured card content'}</h2><Button variant="secondary" disabled={busy} onClick={onClose}>{ar ? 'إغلاق' : 'Close'}</Button></div>
    <AdPlacementGuide placementKey={placementKey} locale={locale} /><form noValidate onSubmit={event => void save(false, event)}>{!options.advertisers.length ? <p role="status">{ar ? 'لا توجد حسابات متاحة للإعلان. راجع اعتماد حساب المزود واسم العرض في بياناته.' : 'No eligible advertisers. Check provider account approval and its display name.'} <a href={`/admin/providers?lang=${locale}`}>{ar ? 'إدارة مقدمي العقارات' : 'Manage providers'}</a></p> : null}<fieldset disabled={busy || !options.canManage} className="admin-featured__fields"><div className="admin-featured__account"><label>{ar ? 'المعلن من حسابات المنصة' : 'Advertiser account'}<select aria-describedby="featured-account-hint" value={provider} required disabled={!!campaign || !options.advertisers.length} onChange={event => { setProvider(event.target.value); setDestination(''); }}><option value="">{options.advertisers.length ? ar ? 'اختر الحساب' : 'Choose an account' : ar ? 'لا توجد حسابات' : 'No eligible accounts'}</option>{options.advertisers.map(value => <option key={value.id} value={value.id}>{featuredText(value.name, locale)}</option>)}</select></label><p id="featured-account-hint">{ar ? 'كل مزودي العقارات المعتمدين متاحون: المزود الفردي، والمكاتب، والشركات. اختر الحساب ثم صفحة من عقاراته المنشورة.' : 'All approved providers are eligible: individuals, offices and developers. Select an account, then one of its published pages.'}</p></div>
      <label>{ar ? 'الصفحة التي يفتحها الإعلان' : 'Page opened by the ad'}<select required value={destination} onChange={event => setDestination(event.target.value)}><option value="">{ar ? 'اختر الصفحة' : 'Choose a page'}</option>{destinations.map(value => <option key={`${value.kind}:${value.id}`} value={`${value.kind}:${value.id}`}>{featuredText(value.name, locale)}</option>)}</select></label>
      <label>{ar ? 'صورة الإعلان' : 'Ad image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setFile(event.target.files?.[0])} /></label>
      <div className="admin-featured__languages" role="tablist" aria-label={ar ? '\u0644\u063a\u0629 \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0625\u0639\u0644\u0627\u0646' : 'Ad content language'}>{(['ar', 'en'] as const).map(language => <button type="button" role="tab" aria-selected={editingLanguage === language} key={language} onClick={() => setEditingLanguage(language)}>{language === 'ar' ? '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' : 'English'}</button>)}</div>
      <label className="admin-featured__installment"><input type="checkbox" role="switch" checked={installmentEnabled} onChange={event => setInstallmentEnabled(event.target.checked)} />{ar ? '\u0645\u062a\u0627\u062d \u0628\u0627\u0644\u062a\u0642\u0633\u064a\u0637' : 'Installments available'}</label>
      {(['title', 'body', 'highlight', 'ctaLabel'] as const).map((key, index) => <TextFields key={key} locale={editingLanguage} label={(ar ? ['عنوان الإعلان', 'الوصف', 'السعر أو العرض', 'نص الزر'] : ['Ad title', 'Description', 'Price or offer', 'Button label'])[index]!} value={texts[key]} set={value => setTexts(current => ({ ...current, [key]: value }))} multiline={key === 'body'} />)}
      <div className="admin-home__form-grid"><label>{ar ? 'بداية العرض — توقيت مصر' : 'Starts — Egypt time'}<input type="datetime-local" required disabled={!!campaign} value={start} onChange={event => setStart(event.target.value)} /></label><label>{ar ? 'نهاية العرض — توقيت مصر' : 'Ends — Egypt time'}<input type="datetime-local" required disabled={!!campaign} value={end} onChange={event => setEnd(event.target.value)} /></label></div><p>{ar ? 'الإعلانات المميزة تتبدّل تلقائيًا كل 10 ثوانٍ، ويمكن التنقل بالأسهم والنقاط.' : 'Ads rotate every 10 seconds; use arrows or dots.'}</p>
      {campaign ? <p>{ar ? 'هذا الإعلان مرتبط بطلب العميل. النشر يتطلب اعتماد الدفع والجدولة.' : 'This ad belongs to a customer request. Approved payment and scheduling are required to publish.'}</p> : null}
      {missingSelection && (provider || options.advertisers.length > 0) ? <p role="status">{missingSelection}{provider ? <a href={`/admin/providers/${provider}?lang=${locale}`} target="_blank" rel="noreferrer">{ar ? ' فتح الحساب' : ' Open account'}</a> : null}</p> : null}
      <div className="admin-home__inline-actions">{[false, true].map(publish => <Button key={String(publish)} type="submit" disabled={busy || !advertiser || !selected} onClick={event => { event.preventDefault(); if (event.currentTarget.form) void save(publish, { preventDefault() {} } as FormEvent<HTMLFormElement>); }}>{ar ? publish ? 'حفظ ونشر' : 'حفظ مسودة' : publish ? 'Save and publish' : 'Save draft'}</Button>)}</div>
    </fieldset></form>{error ? <p role="alert">{error}</p> : null}{feedback ? <p role="status">{feedback}</p> : null}
    <div className="admin-home__inline-actions"><h3>{ar ? 'معاينة مباشرة' : 'Live preview'}</h3><Button variant="secondary" onClick={() => setPreviewSize('desktop')}>{ar ? 'كمبيوتر' : 'Desktop'}</Button><Button variant="secondary" onClick={() => setPreviewSize('mobile')}>{ar ? 'موبايل' : 'Mobile'}</Button></div>
    {previewError && !filePreview ? <div role="alert"><p>{ar ? 'تعذر تحميل صورة المعاينة. التعديلات محفوظة في النموذج؛ أعد المحاولة أو اختر صورة بديلة إذا كان الملف غير متاح.' : 'Could not load the preview image. Your edits are kept in the form; retry or select a replacement image if the file is unavailable.'}</p><Button variant="secondary" disabled={busy} onClick={() => setPreviewAttempt(value => value + 1)}>{ar ? 'إعادة تحميل المعاينة' : 'Reload preview'}</Button></div> : null}
    <div className="admin-featured__preview public-homepage__section--banners" data-size={previewSize}><div className="public-homepage__banner-card"><FeaturedCard banner={preview} locale={editingLanguage} preview /></div></div>
  </section>;
}

export function AdminFeatured({ locale, session, authClient, apiOrigin, url, source: providedSource, loadOptions: providedOptions }: { locale: SupportedLocale; session: RouteSession; authClient?: AdminHomeAuthorizationSource | undefined; apiOrigin?: string | undefined; url?: string | undefined; source?: AdminHomeSource | undefined; loadOptions?: ((id?: string) => Promise<FeaturedOptions>) | undefined }) {
  const ar = locale === 'ar';
  const source = useMemo(() => providedSource ?? createAdminHomeSource({ authorization: authClient, apiOrigin }), [authClient, apiOrigin, providedSource]);
  const client = useMemo(() => createAdminSessionClient({ apiOrigin, authorization: authClient }), [apiOrigin, authClient]);
  const loadOptions = useMemo(() => providedOptions ?? (async (id?: string) => (await client.request('/admin/banners/featured-options', { responseSchema: featuredOptionsSuccessEnvelopeSchema, ...(id ? { query: { providerId: id } } : {}), ...adminSessionOptions({ authorization: authClient }) })).data.data), [client, authClient, providedOptions]);
  const [items, setItems] = useState<AdBanner[]>([]), [options, setOptions] = useState<FeaturedOptions>({ advertisers: [], destinations: [], canManage: false }), [editing, setEditing] = useState<AdBanner | 'new'>(), [error, setError] = useState<string>(), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0), [campaign, setCampaign] = useState<AdAdminRequest['request']>(), [page, setPage] = useState(1), [total, setTotal] = useState(0);
  const requestId = new URL(url ?? 'http://localhost/admin/ads/featured', 'http://localhost').searchParams.get('requestId');
  useEffect(() => { if (session.status !== 'authenticated' || session.role !== 'admin') { setError(ar ? 'يلزم تسجيل دخول إداري.' : 'An administrator session is required.'); return; } const controller = new AbortController(); setBusy(true); void Promise.all([source.loadBanners({ placementKey, page, limit: 100 }, controller.signal), loadOptions(), requestId ? source.loadAdRequest(requestId, controller.signal) : Promise.resolve(undefined)]).then(([list, choices, request]) => { if (controller.signal.aborted) return; setItems(list.items); setTotal(list.total); setOptions(choices); setCampaign(request?.request); if (request && request.request.placementKey === placementKey) setEditing(list.items.find(item => item.adRequestId === request.request.id) ?? 'new'); setError(undefined); }).catch(cause => { if (!controller.signal.aborted) setError(failure(cause, ar)); }).finally(() => { if (!controller.signal.aborted) setBusy(false); }); return () => controller.abort(); }, [session.status, session.status === 'authenticated' ? session.role : undefined, source, loadOptions, requestId, attempt, page, ar]);
  const refresh = () => setAttempt(value => value + 1);
  const [previewing, setPreviewing] = useState<AdBanner>(), [panelAttempt, setPanelAttempt] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editing && !previewing) return;
    panel.current?.scrollIntoView?.({ block: 'start' });
    panel.current?.focus({ preventScroll: true });
  }, [editing, previewing, panelAttempt]);
  function openEditor(value: AdBanner | 'new') { setPreviewing(undefined); setEditing(value); setPanelAttempt(value => value + 1); }
  function openPreview(value: AdBanner) { setEditing(undefined); setPreviewing(value); setPanelAttempt(value => value + 1); }
  const [feedback, setFeedback] = useState<string>(), [retry, setRetry] = useState<(() => Promise<void>)>();
  async function run(task: () => Promise<void>, retryable = false) { setBusy(true); setError(undefined); setFeedback(undefined); setRetry(undefined); try { await task(); refresh(); } catch (cause) { if (retryable) setRetry(() => task); setError(failure(cause, ar)); } finally { setBusy(false); } }
  const [settingsOpen, setSettingsOpen] = useState(false);
  async function setup() {
    const config = await source.loadBannerConfig();
    const updated = await source.updateBannerConfig({ enabled: true, featuredActive: true, expectedVersion: config.version, reason: 'Enable featured placement' });
    setSettingsOpen(true);
    if (!updated.enabled || !updated.placements.some(value => value.key === placementKey && value.active)) throw new Error('Featured placement inactive');
    setFeedback(ar ? 'تم تشغيل العرض؛ انشر إعلانًا بموعد ساري.' : 'Display enabled; publish a scheduled ad.');
  }
  async function stop(item: AdBanner) { await run(async () => { await source.updateBanner(item.id, { status: 'draft', expectedVersion: item.version, reason: 'Stop featured card' }); }); }
  async function move(index: number, offset: number) { const order = featuredOrder(items, index, offset, page); if (!order) return; await run(async () => { await source.reorderBanners(order); setFeedback(ar ? 'تم تغيير ترتيب الإعلانات.' : 'Ad order updated.'); }); }
  async function importOld() {
    const { data } = await client.request('/admin/banners/featured-import', { method: 'POST', json: {}, responseSchema: z.object({ data: z.object({ imported: z.boolean(), count: z.number().int().nonnegative() }) }).passthrough(), ...adminSessionOptions({ authorization: authClient }) });
    setFeedback(data.data.count ? ar ? `تم استيراد ${data.data.count} كارت كمسودة.` : `${data.data.count} cards imported as drafts.` : ar ? 'لا توجد كروت قديمة جديدة للاستيراد.' : 'No new legacy cards to import.');
    const list = await source.loadBanners({ placementKey, page: 1, limit: 100 });
    setPage(1); setItems(list.items); setTotal(list.total);
    const draft = list.items.find(value => value.status === 'draft' && !value.featured?.advertiserProviderId);
    if (draft) openEditor(draft);
  }
  return <section className="admin-home admin-featured" dir={ar ? 'rtl' : 'ltr'}><AdminNavigation locale={locale} activePath="/admin/ads/featured" /><div className="admin-home__content"><header className="admin-home__heading"><div><h1>{ar ? 'إعلانات الرئيسية المميزة' : 'Featured homepage ads'}</h1><p>{ar ? 'كروت بصور ونصوص كاملة تتبادل العرض أسفل أعلى الرئيسية.' : 'Complete image and text cards rotating below the homepage hero.'}</p></div><Button disabled={busy || !options.canManage} onClick={() => openEditor('new')}>{ar ? 'إضافة إعلان مميز' : 'Add featured ad'}</Button></header><nav className="admin-home__tabs"><a href={`/admin/ads/requests?lang=${locale}`}>{ar ? 'طلبات الإعلانات' : 'Ad requests'}</a><a href={`/admin/banners?lang=${locale}`}>{ar ? 'بانرات أعلى الصفحة' : 'Homepage hero banners'}</a></nav>
    <div className="admin-featured__actions">
      <div><Button variant="secondary" disabled={busy || !options.canManage} onClick={() => void run(setup, true)}>{ar ? 'تشغيل عرض الكروت' : 'Enable card display'}</Button><Button variant="secondary" disabled={busy || !options.canManage} onClick={() => setSettingsOpen(value => !value)}>{ar ? '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0639\u0631\u0636 \u0627\u0644\u0643\u0631\u0648\u062a' : 'Card display settings'}</Button><p>{ar ? 'يفعّل إعلانات الرئيسية والكروت؛ المسودات تحتاج نشرًا.' : 'Enables homepage ads and cards; drafts still need publishing.'}</p></div>
      <div><Button variant="secondary" disabled={busy || !options.canManage} onClick={() => void run(importOld, true)}>{ar ? 'استيراد الكروت القديمة' : 'Import legacy cards'}</Button><p>{ar ? 'ينقل القديم لمسودات ويوقف عرضه حتى تنشره؛ دون تكرار.' : 'Moves old cards to drafts, hiding them until republished; no duplicates.'}</p></div>
    </div>
    {settingsOpen ? <FeaturedDisplaySettings locale={locale} source={source} onClose={() => setSettingsOpen(false)} onSaved={refresh} /> : null}

    {error ? <p role="alert">{error}<Button variant="secondary" disabled={busy} onClick={() => retry ? void run(retry, true) : refresh()}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></p> : null}{feedback || busy ? <p role="status">{feedback ?? (ar ? 'جارٍ التنفيذ…' : 'Working…')}</p> : null}<div className="admin-featured__work-panel" ref={panel} tabIndex={-1}>{previewing ? <FeaturedPreview key={previewing.id} item={previewing} options={options} loadOptions={loadOptions} source={source} locale={locale} onClose={() => setPreviewing(undefined)} /> : null}{editing ? <FeaturedEditor key={editing === 'new' ? 'new' : editing.id} {...(editing === 'new' ? { campaign } : { item: editing })} options={options} loadOptions={loadOptions} source={source} locale={locale} onSaved={refresh} onClose={() => setEditing(undefined)} /> : null}</div>
    <section className="admin-home__panel"><div className="admin-home__panel-heading"><h2>{ar ? 'الإعلانات ومواعيدها' : 'Ads and schedules'}</h2><Button variant="secondary" disabled={busy} onClick={refresh}>{ar ? 'تحديث' : 'Refresh'}</Button></div>{items.length === 0 ? <div className="admin-featured__empty"><span className="admin-featured__empty-icon" aria-hidden="true" /><h3>{ar ? 'لا توجد إعلانات بعد' : 'No ads yet'}</h3><p>{ar ? 'لا توجد كروت محفوظة. أضف إعلانًا أو انقل السجلات القديمة للمراجعة.' : 'No saved cards. Add an ad or import legacy records for review.'}</p></div> : null}{items.length ? <><div className="admin-home__table-wrap"><table className="admin-home__table" role="table"><thead role="rowgroup"><tr role="row">{(ar ? ['الإعلان', 'الحالة', 'البداية', 'النهاية', 'الإجراءات'] : ['Ad', 'Status', 'Starts', 'Ends', 'Actions']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody role="rowgroup">{items.map((item, index) => <FeaturedRow key={item.id} item={item} index={index} count={items.length} locale={locale} source={source} disabled={busy || !options.canManage} onPreview={() => openPreview(item)} onEdit={() => openEditor(item)} onStop={() => void stop(item)} onMove={offset => void move(index, offset)} />)}</tbody></table></div><div className="admin-home__inline-actions"><Button disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>{ar ? 'السابق' : 'Previous'}</Button><span>{page} / {Math.max(1, Math.ceil(total / 100))}</span><Button disabled={page * 100 >= total || busy} onClick={() => setPage(value => value + 1)}>{ar ? 'التالي' : 'Next'}</Button></div></> : null}</section></div></section>;
}
function FeaturedRow({ item, index, count, locale, source, disabled, onPreview, onEdit, onStop, onMove }: { onPreview: () => void; item: AdBanner; index: number; count: number; locale: SupportedLocale; source: AdminHomeSource; disabled: boolean; onEdit: () => void; onStop: () => void; onMove: (offset: number) => void }) {
  const [image, setImage] = useState<string>();
  useEffect(() => { let current = true, objectUrl: string | undefined; void source.previewBanner(item.id).then(async preview => { if (!preview.media) return; const url = await source.loadMediaPreview(preview.media.url); if (!current) { if (url.startsWith('blob:')) URL.revokeObjectURL(url); return; } if (url.startsWith('blob:')) objectUrl = url; setImage(url); }).catch(() => {}); return () => { current = false; if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [source, item.id, item.version]);
  const ar = locale === 'ar', states = ar ? { draft: 'مسودة', scheduled: 'مجدول', active: 'منشور', paused: 'موقوف', ended: 'انتهى', archived: 'مؤرشف' } : { draft: 'Draft', scheduled: 'Scheduled', active: 'Published', paused: 'Stopped', ended: 'Ended', archived: 'Archived' };
  const visible = ['active', 'scheduled'].includes(item.status) && item.publiclyVisible === true;
  const visibility = item.status === 'draft' ? ar ? 'مسودة؛ انشرها بعد اختيار الحساب والصفحة.' : 'Draft; select an advertiser and page before publishing.' : item.publiclyVisible === undefined ? ar ? 'تعذر تأكيد الظهور؛ حدّث القائمة.' : 'Could not verify visibility; refresh the list.' : !visible ? ar ? 'الإعلان غير ظاهر حاليًا؛ راجع الموعد والصورة والحساب وتشغيل العرض.' : 'Not currently visible; check dates, image, advertiser and display configuration.' : '';
  return <tr role="row" data-testid={`featured-row-${item.id}`}><td>{image ? <img className="admin-featured__thumbnail" src={image} alt="" /> : null}<strong>{featuredText(item.title, locale)}</strong>{!item.featured?.advertiserProviderId ? <small>{ar ? 'غير مرتبط — عارض مبهم حتى تختار الحساب' : 'Unlinked — anonymous until an account is selected'}</small> : null}</td><td data-label={ar ? 'الحالة' : 'Status'}><span className="admin-home__badge" data-tone={visible ? 'success' : item.status === 'draft' ? 'warning' : 'neutral'}>{new Date(item.endAt).getTime() <= Date.now() && ['active', 'scheduled'].includes(item.status) ? states.ended : states[item.status]}</span></td><td data-label={ar ? 'البداية' : 'Starts'}>{dateLabel(item.startAt, locale)}</td><td data-label={ar ? 'النهاية' : 'Ends'}>{dateLabel(item.endAt, locale)}</td><td><div className="admin-home__row-actions"><Button disabled={disabled} onClick={onEdit}>{ar ? 'تعديل' : 'Edit'}</Button><Button variant="secondary" onClick={onPreview}>{ar ? 'معاينة' : 'Preview'}</Button>{visible ? <a className="admin-featured__view-link" href={`/?lang=${locale}&featuredAd=${item.id}#homepage-featured`} target="_blank" rel="noopener noreferrer">{ar ? 'عرض في الموقع' : 'View on site'}</a> : <span><Button variant="secondary" disabled title={visibility}>{ar ? 'عرض في الموقع' : 'View on site'}</Button><small>{visibility}</small></span>}{['active', 'scheduled'].includes(item.status) ? <Button variant="secondary" disabled={disabled} onClick={onStop}>{ar ? 'إيقاف' : 'Stop'}</Button> : null}<Button variant="secondary" aria-label={ar ? 'تحريك الإعلان لأعلى' : 'Move ad up'} disabled={disabled || index === 0} onClick={() => onMove(-1)}>↑</Button><Button variant="secondary" aria-label={ar ? 'تحريك الإعلان لأسفل' : 'Move ad down'} disabled={disabled || index === count - 1} onClick={() => onMove(1)}>↓</Button></div></td></tr>;
}
