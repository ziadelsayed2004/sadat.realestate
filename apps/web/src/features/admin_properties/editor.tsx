import { useEffect, useMemo, useRef, useState } from 'react';
import { propertyAdminEditSchema, propertyDataSchema, propertyMediaDataSchema, successEnvelopeSchema, type PropertyData, type PropertyMediaData, type SupportedLocale } from '@sadat-real-estate/contracts';
import { z } from 'zod';
import { ApiClient, ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import type { AdminPropertiesAuthorizationSource } from './data.ts';
import { AdminPropertyPhoto } from './photo.tsx';
import AdminPropertyVideo from './video.tsx';

const mediaList = successEnvelopeSchema(z.object({ items: z.array(propertyMediaDataSchema) }));
export function AdminPropertyEditor({ initialProperty, locale, authorization, apiOrigin, onSaved }: { readonly initialProperty: PropertyData; readonly locale: SupportedLocale; readonly authorization?: AdminPropertiesAuthorizationSource | undefined; readonly apiOrigin?: string | undefined; readonly onSaved: (property: PropertyData) => void }) {
  const ar = locale === 'ar';
  const [property, setProperty] = useState(initialProperty);
  const [name, setName] = useState({ ar: property.name.ar ?? '', en: property.name.en ?? '' });
  const [description, setDescription] = useState({ ar: property.description?.ar ?? '', en: property.description?.en ?? '' });
  const [amount, setAmount] = useState(String(property.price?.amount ?? ''));
  const [transactionType, setTransactionType] = useState(property.transactionType);
  const [area, setArea] = useState(String(property.area?.value ?? ''));
  const [layout, setLayout] = useState({ bedrooms: String(property.layout?.bedrooms ?? ''), bathrooms: String(property.layout?.bathrooms ?? ''), floor: String(property.layout?.floor ?? ''), totalFloors: String(property.layout?.totalFloors ?? '') });
  const [reason, setReason] = useState('');
  const [media, setMedia] = useState<readonly PropertyMediaData[]>([]);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaAttempt, setMediaAttempt] = useState(0);
  const [uploads, setUploads] = useState<readonly File[]>([]);
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [cover, setCover] = useState<string>();
  const [removeLegacy, setRemoveLegacy] = useState(false);
  const refreshNeeded = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (feedback) feedbackRef.current?.focus(); }, [failed, feedback]);
  const client = useMemo(() => new ApiClient(apiOrigin ? { baseUrl: apiOrigin } : {}), [apiOrigin]);
  const path = `/admin/properties/${property.id}`;
  const changeReason = () => reason.trim().replace(/\s+/gu, ' ') || 'Administrative property edit';
  const headers = () => { const token = authorization?.getAuthorizationHeader(); return { ...(token ? { authorization: token } : {}), 'x-edit-reason': encodeURIComponent(changeReason()) }; };
  const localize = (value: { ar: string; en: string }) => Object.fromEntries(Object.entries(value).filter(([, text]) => text.trim()).map(([key, text]) => [key, text.trim()]));
  useEffect(() => { setProperty(initialProperty); }, [initialProperty]);
  useEffect(() => {
    const controller = new AbortController();
    setMediaReady(false);
    const token = authorization?.getAuthorizationHeader();
    void client.request(`${path}/media`, { responseSchema: mediaList, headers: token ? { authorization: token } : {}, signal: controller.signal }).then(result => { if (!controller.signal.aborted) { setMedia(result.data.data.items.filter(item => item.active && item.processingState === 'ready')); setMediaReady(true); } }).catch(() => { if (!controller.signal.aborted) { setFeedback(ar ? 'تعذر تحميل الصور. أعد فتح العقار للمحاولة.' : 'Could not load images. Reopen this property to retry.'); setFailed(true); } });
    return () => controller.abort();
  }, [client, path, authorization, ar, mediaAttempt]);
  async function run(action: () => Promise<void | string>) {
    if (busy) return;
    if (changeReason().length < 5) { setFailed(true); setFeedback(ar ? 'اكتب 5 أحرف أو اترك السبب فارغًا.' : 'Use 5 characters or leave the reason blank.'); reasonRef.current?.focus(); return; }
    setBusy(true); setFeedback(''); setFailed(false);
    try { const message = await action(); setFeedback(message ?? (ar ? 'تم حفظ التعديل.' : 'Changes saved.')); }
    catch (error) { setFailed(true); setFeedback(errorMessage(error)); }
    finally { setBusy(false); }
  }
  function errorMessage(error: unknown): string {
    if (error instanceof z.ZodError) {
      const field = String(error.issues[0]?.path[0] ?? '');
      const labels: Record<string, string> = { name: ar ? 'عنوان العقار' : 'property title', description: ar ? 'وصف العقار' : 'property description', price: ar ? 'السعر' : 'price', area: ar ? 'المساحة' : 'area', layout: ar ? 'الغرف والأدوار' : 'rooms and floors' };
      return ar ? `راجع ${labels[field] ?? 'الحقول'}؛ قيمة غير صالحة. لم يتم الحفظ.` : `Check ${labels[field] ?? 'the fields'}: invalid value. Nothing saved.`;
    }
    if (error instanceof ApiClientError && error.status === 409) return ar ? 'تغير العقار في جلسة أخرى. أعد تحميله قبل الحفظ.' : 'This property changed in another session. Reload before saving.';
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return ar ? 'تحتاج صلاحية تعديل العقارات؛ المدخلات محفوظة.' : 'Property edit permission is required. Your entries are preserved.';
    return ar ? 'تعذر الحفظ. المدخلات محفوظة؛ أعد المحاولة.' : 'Could not save. Your entries are preserved; retry.';
  }
  async function save(json: unknown) {
    const result = await client.request(path, { method: 'PATCH', json, headers: headers(), responseSchema: successEnvelopeSchema(propertyDataSchema) });
    setProperty(result.data.data); onSaved(result.data.data);
    return result.data.data;
  }
  async function saveAll(): Promise<string | void> {
    const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const basic: Record<string, unknown> = {};
    const details: Record<string, unknown> = {};
    const pricing: Record<string, unknown> = {};
    if (!equal(localize(name), localize({ ar: property.name.ar ?? '', en: property.name.en ?? '' }))) basic.name = localize(name);
    if (transactionType !== property.transactionType) basic.transactionType = transactionType;
    const nextDescription = Object.values(description).some(text => text.trim()) ? localize(description) : null;
    const oldDescription = property.description ? localize({ ar: property.description.ar ?? '', en: property.description.en ?? '' }) : null;
    if (!equal(nextDescription, oldDescription)) details.description = nextDescription;
    if (area.trim() !== String(property.area?.value ?? '')) details.area = area.trim() ? { value: Number(area), unit: 'sqm' } : null;
    const nextLayout = Object.fromEntries(Object.entries(layout).filter(([, value]) => value.trim()).map(([key, value]) => [key, Number(value)]));
    const oldLayout = Object.fromEntries(Object.keys(layout).filter(key => property.layout?.[key as keyof typeof property.layout] !== undefined).map(key => [key, property.layout?.[key as keyof typeof property.layout]]));
    if (!equal(nextLayout, oldLayout)) details.layout = nextLayout;
    if (amount.trim() !== String(property.price?.amount ?? '')) { pricing.price = { amount: Number(amount), currency: property.price?.currency ?? 'EGP' }; if (property.paymentPlans) pricing.paymentPlans = property.paymentPlans; }
    if (removeLegacy) basic.imageUrl = null;
    const changes = { ...basic, ...details, ...pricing };
    const json = Object.keys(changes).length ? propertyAdminEditSchema.parse({ version: property.version, reason: changeReason(), ...changes }) : undefined;
    if (uploads.some(file => !['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) { setFailed(true); return ar ? 'اختر صور JPG/PNG حتى 10 ميجابايت.' : 'Choose JPG/PNG images up to 10 MB.'; }
    if (!json && !uploads.length && !removed.length && !cover && !refreshNeeded.current) return ar ? 'لا توجد تعديلات جديدة لحفظها.' : 'No new changes to save.';
    let current = property;
    let saved = 0;
    try {
      // The field update is atomic; completed media operations leave the queue
      // immediately so retrying a later failure cannot upload a file twice.
      if (json) { current = await save(json); setRemoveLegacy(false); saved++; }
      for (const file of uploads) {
        const result = await client.request(`${path}/media`, { method: 'POST', headers: { ...headers(), 'content-type': file.type, 'x-media-kind': 'image', 'x-file-name': encodeURIComponent(file.name) }, body: file, responseSchema: successEnvelopeSchema(propertyMediaDataSchema) });
        setMedia(items => [...items.map(item => result.data.data.isCover ? { ...item, isCover: false } : item), result.data.data]);
        setUploads(files => files.filter(item => item !== file)); refreshNeeded.current = true; saved++;
      }
      for (const id of removed) {
        await client.request(`${path}/media/${id}`, { method: 'DELETE', headers: headers(), responseSchema: successEnvelopeSchema(propertyMediaDataSchema) });
        setMedia(items => items.filter(item => item.id !== id)); setRemoved(ids => ids.filter(item => item !== id)); refreshNeeded.current = true; saved++;
      }
      if (cover) {
        await client.request(`${path}/media/order`, { method: 'PATCH', headers: headers(), json: { version: current.version, reason: changeReason(), items: [{ mediaId: cover, sortOrder: media.find(item => item.id === cover)!.sortOrder, isCover: true }] }, responseSchema: mediaList });
        setMedia(items => items.map(item => ({ ...item, isCover: item.id === cover }))); setCover(undefined); refreshNeeded.current = true; saved++;
      }
      if (refreshNeeded.current) {
        const result = await client.request(path, { headers: headers(), responseSchema: successEnvelopeSchema(propertyDataSchema) });
        setProperty(result.data.data); onSaved(result.data.data); refreshNeeded.current = false;
      }
    } catch (error) {
      if (!saved) throw error;
      setFailed(true);
      return (ar ? 'تم حفظ جزء من التعديلات؛ اضغط الحفظ لاستكمال الباقي. ' : 'Some changes were saved; save again to finish. ') + errorMessage(error);
    }
  }
  return <section id="admin-property-editor" className="admin-property-editor"><h2>{ar ? 'تعديل العقار والصور' : 'Edit property and photos'}</h2><fieldset disabled={busy} onChange={() => setFeedback('')} onClickCapture={() => setFeedback('')}><label>{ar ? 'سبب التعديل (اختياري)' : 'Edit reason (optional)'}<textarea ref={reasonRef} minLength={5} value={reason} maxLength={500} onChange={event => setReason(event.target.value)} /></label>
    <div className="admin-property-editor__grid">{(['ar', 'en'] as const).map(language => <label key={language}>{ar ? 'عنوان العقار' : 'Property title'} {language.toUpperCase()}<input value={name[language]} onChange={event => setName(current => ({ ...current, [language]: event.target.value }))} /></label>)}</div>
    <div className="admin-property-editor__grid">{(['ar', 'en'] as const).map(language => <label key={language}>{ar ? 'وصف العقار' : 'Property description'} {language.toUpperCase()}<textarea value={description[language]} onChange={event => setDescription(current => ({ ...current, [language]: event.target.value }))} /></label>)}</div>
    <label>{ar ? 'السعر' : 'Price'}<input type="number" min="1" value={amount} onChange={event => setAmount(event.target.value)} /></label>
    <label>{ar ? 'نوع العرض' : 'Listing type'}<select value={transactionType} onChange={event => setTransactionType(event.target.value as typeof transactionType)}><option value="sale">{ar ? 'للبيع' : 'For sale'}</option><option value="rent">{ar ? 'للإيجار' : 'For rent'}</option></select></label>
    <h3>{ar ? 'مساحة وتفاصيل العقار' : 'Property area and layout'}</h3><div className="admin-property-editor__grid"><label>{ar ? 'المساحة بالمتر المربع' : 'Area in square meters'}<input type="number" min="0.01" max="1000000" step="any" value={area} onChange={event => setArea(event.target.value)} /></label>{(['bedrooms', 'bathrooms', 'floor', 'totalFloors'] as const).map(key => <label key={key}>{({ bedrooms: ar ? 'عدد الغرف' : 'Bedrooms', bathrooms: ar ? 'عدد الحمامات' : 'Bathrooms', floor: ar ? 'الدور' : 'Floor', totalFloors: ar ? 'عدد أدوار المبنى' : 'Building floors' })[key]}<input type="number" min={key === 'totalFloors' ? 1 : 0} value={layout[key]} onChange={event => setLayout(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
    {property.imageUrl && mediaReady && media.length === 0 && !removeLegacy ? <div><img src={property.imageUrl} alt="" className="admin-property-editor__image" /><Button type="button" variant="secondary" onClick={() => setRemoveLegacy(true)}>{ar ? 'إزالة الصورة القديمة' : 'Remove old image'}</Button></div> : null}
    <h3>{ar ? 'صور وفيديوهات العقار' : 'Property images and videos'}</h3>{!mediaReady ? <Button type="button" size="sm" variant="secondary" onClick={() => setMediaAttempt(value => value + 1)}>{ar ? 'إعادة تحميل الصور' : 'Reload images'}</Button> : null}<div className="admin-property-editor__grid">{media.filter(item => !removed.includes(item.id)).map(item => <article key={item.id}>{item.kind === 'image' ? <AdminPropertyPhoto propertyId={property.id} mediaId={item.id} filename={item.originalFilename} locale={locale} authorization={authorization} apiOrigin={apiOrigin} /> : <AdminPropertyVideo propertyId={property.id} mediaId={item.id} filename={item.originalFilename} locale={locale} authorization={authorization} apiOrigin={apiOrigin} />}<p>{(cover ? cover === item.id : item.isCover || property.imageUrl?.includes(`/media/${item.id}/content`)) ? (ar ? 'صورة الغلاف' : 'Cover image') : item.originalFilename}</p>{item.kind === 'image' ? <Button type="button" size="sm" onClick={() => setCover(item.id)}>{ar ? 'تعيين كغلاف' : 'Use as cover'}</Button> : null}<Button type="button" variant="secondary" size="sm" onClick={() => { setRemoved(ids => [...ids, item.id]); if (cover === item.id) setCover(undefined); }}>{ar ? 'إزالة' : 'Remove'}</Button></article>)}</div>
    <label>{ar ? 'إضافة صورة (JPG / PNG، حتى 10 ميجابايت)' : 'Add image (JPG / PNG, up to 10 MB)'}<input type="file" multiple accept="image/jpeg,image/png" disabled={!mediaReady} onChange={event => { setUploads(files => [...files, ...Array.from(event.target.files ?? [])]); event.target.value = ''; }} /></label>
    {uploads.map((file, index) => <div key={index}>{file.name} <Button type="button" variant="secondary" size="sm" onClick={() => setUploads(files => files.filter((_, position) => position !== index))}>{ar ? 'إزالة' : 'Remove'}</Button></div>)}
    <div className="admin-property-editor__save"><p>{ar ? 'زر واحد يحفظ البيانات والصور والغلاف. السبب اختياري.' : 'One button saves details, images and cover. The reason is optional.'}</p><Button type="button" loading={busy} onClick={() => { void run(saveAll); }}>{ar ? 'حفظ التعديلات' : 'Save changes'}</Button>{feedback ? <p ref={feedbackRef} tabIndex={-1} role={failed ? 'alert' : 'status'} style={{ color: failed ? '#b42318' : '#145649' }}>{feedback}</p> : null}</div></fieldset></section>;
}
