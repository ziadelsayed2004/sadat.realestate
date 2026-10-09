import { useEffect, useMemo, useState } from 'react';
import { propertyCoreStepSchema, propertyDetailsStepSchema, propertyPricingStepSchema, propertyDataSchema, propertyMediaDataSchema, successEnvelopeSchema, type PropertyData, type PropertyMediaData, type SupportedLocale } from '@sadat-real-estate/contracts';
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
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const client = useMemo(() => new ApiClient(apiOrigin ? { baseUrl: apiOrigin } : {}), [apiOrigin]);
  const path = `/admin/properties/${property.id}`;
  const changeReason = () => reason.trim().replace(/\s+/gu, ' ');
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
    if (reason.trim().length < 5) { setFailed(true); setFeedback(ar ? 'اكتب سبب التعديل من 5 أحرف على الأقل.' : 'Enter a change reason of at least 5 characters.'); return; }
    setBusy(true); setFeedback(''); setFailed(false);
    try { const message = await action(); setFeedback(message ?? (ar ? 'تم حفظ التعديل.' : 'Changes saved.')); }
    catch (error) { setFailed(true); setFeedback(error instanceof ApiClientError && error.status === 409 ? (ar ? 'تغير العقار في جلسة أخرى. أعد تحميله قبل الحفظ.' : 'This property changed in another session. Reload before saving.') : ar ? 'تعذر الحفظ. راجع القيم وصلاحية التعديل؛ المدخلات محفوظة.' : 'Could not save. Check your values and edit permission; your entries are preserved.'); }
    finally { setBusy(false); }
  }
  async function refreshPropertyAfterMedia(): Promise<string | undefined> {
    try {
      const result = await client.request(path, { headers: headers(), responseSchema: successEnvelopeSchema(propertyDataSchema) });
      setProperty(result.data.data); onSaved(result.data.data);
    } catch { return ar ? 'تم حفظ الصور، لكن تعذر تحديث بيانات العقار المعروضة. أعد فتح العقار لتحديثها.' : 'Images were saved, but the property summary could not refresh. Reopen the property to update it.'; }
  }
  async function save(step: 'basic' | 'details' | 'price-payment', changes: Record<string, unknown>) {
    const raw = { version: property.version, reason: reason.trim().replace(/\s+/gu, ' '), ...changes };
    const json = step === 'basic' ? propertyCoreStepSchema.parse(raw) : step === 'details' ? propertyDetailsStepSchema.parse(raw) : propertyPricingStepSchema.parse(raw);
    const result = await client.request(`${path}/steps/${step}`, { method: 'PATCH', json, headers: headers(), responseSchema: successEnvelopeSchema(propertyDataSchema) });
    setProperty(result.data.data); onSaved(result.data.data);
  }
  async function order(next: readonly PropertyMediaData[]) {
    const result = await client.request(`${path}/media/order`, { method: 'PATCH', headers: headers(), json: { version: property.version, reason: changeReason(), items: next.map((item, index) => ({ mediaId: item.id, sortOrder: index, isCover: item.isCover })) }, responseSchema: mediaList });
    setMedia(result.data.data.items);
    return refreshPropertyAfterMedia();
  }
  async function upload(file: File) {
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) throw new Error('INVALID_IMAGE');
    const result = await client.request(`${path}/media`, { method: 'POST', headers: { ...headers(), 'content-type': file.type, 'x-media-kind': 'image', 'x-file-name': encodeURIComponent(file.name) }, body: file, responseSchema: successEnvelopeSchema(propertyMediaDataSchema) });
    setMedia(current => [...current.filter(item => item.id !== result.data.data.id), result.data.data]);
    return refreshPropertyAfterMedia();
  }
  return <section className="admin-property-editor"><h2>{ar ? 'تعديل العقار والصور' : 'Edit property and photos'}</h2><p>{ar ? 'تعديلات الإدارة على العقار المنشور تظهر في الموقع بعد الحفظ.' : 'Administrative edits to published properties appear on the website after saving.'}</p><fieldset disabled={busy}><label>{ar ? 'سبب التعديل' : 'Edit reason'}<textarea value={reason} maxLength={500} onChange={event => setReason(event.target.value)} /></label>
    <div className="admin-property-editor__grid">{(['ar', 'en'] as const).map(language => <label key={language}>{ar ? 'عنوان العقار' : 'Property title'} {language.toUpperCase()}<input value={name[language]} onChange={event => setName(current => ({ ...current, [language]: event.target.value }))} /></label>)}</div><Button type="button" onClick={() => { void run(() => save('basic', { name: localize(name) })); }}>{ar ? 'حفظ العنوان' : 'Save title'}</Button>
    <div className="admin-property-editor__grid">{(['ar', 'en'] as const).map(language => <label key={language}>{ar ? 'وصف العقار' : 'Property description'} {language.toUpperCase()}<textarea value={description[language]} onChange={event => setDescription(current => ({ ...current, [language]: event.target.value }))} /></label>)}</div><Button type="button" onClick={() => { void run(() => save('details', { description: Object.values(description).some(text => text.trim()) ? localize(description) : null })); }}>{ar ? 'حفظ الوصف' : 'Save description'}</Button>
    <label>{ar ? 'السعر' : 'Price'}<input type="number" min="1" value={amount} onChange={event => setAmount(event.target.value)} /></label><Button type="button" onClick={() => { void run(() => save('price-payment', { price: { amount: Number(amount), currency: property.price?.currency ?? 'EGP' }, ...(property.paymentPlans ? { paymentPlans: property.paymentPlans } : {}) })); }}>{ar ? 'حفظ السعر' : 'Save price'}</Button>
    <label>{ar ? 'نوع العرض' : 'Listing type'}<select value={transactionType} onChange={event => setTransactionType(event.target.value as typeof transactionType)}><option value="sale">{ar ? 'للبيع' : 'For sale'}</option><option value="rent">{ar ? 'للإيجار' : 'For rent'}</option></select></label><Button type="button" onClick={() => { void run(() => save('basic', { transactionType })); }}>{ar ? 'حفظ نوع العرض' : 'Save listing type'}</Button>
    <h3>{ar ? 'مساحة وتفاصيل العقار' : 'Property area and layout'}</h3><div className="admin-property-editor__grid"><label>{ar ? 'المساحة بالمتر المربع' : 'Area in square meters'}<input type="number" min="0.01" max="1000000" step="any" value={area} onChange={event => setArea(event.target.value)} /></label>{(['bedrooms', 'bathrooms', 'floor', 'totalFloors'] as const).map(key => <label key={key}>{({ bedrooms: ar ? 'عدد الغرف' : 'Bedrooms', bathrooms: ar ? 'عدد الحمامات' : 'Bathrooms', floor: ar ? 'الدور' : 'Floor', totalFloors: ar ? 'عدد أدوار المبنى' : 'Building floors' })[key]}<input type="number" min={key === 'totalFloors' ? 1 : 0} value={layout[key]} onChange={event => setLayout(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div><Button type="button" onClick={() => { void run(() => save('details', { area: area.trim() ? { value: Number(area), unit: 'sqm' } : null, layout: Object.fromEntries(Object.entries(layout).filter(([, value]) => value.trim()).map(([key, value]) => [key, Number(value)])) })); }}>{ar ? 'حفظ المساحة والتفاصيل' : 'Save area and layout'}</Button>
    {property.imageUrl && mediaReady && media.length === 0 ? <div><img src={property.imageUrl} alt="" className="admin-property-editor__image" /><Button type="button" variant="secondary" onClick={() => { void run(() => save('basic', { imageUrl: null })); }}>{ar ? 'إزالة الصورة القديمة' : 'Remove old image'}</Button></div> : null}
    <h3>{ar ? 'صور وفيديوهات العقار' : 'Property images and videos'}</h3>{!mediaReady ? <Button type="button" size="sm" variant="secondary" onClick={() => setMediaAttempt(value => value + 1)}>{ar ? 'إعادة تحميل الصور' : 'Reload images'}</Button> : media.length === 0 ? <p>{ar ? 'لا توجد صور مرفوعة للعقار. يمكنك إضافة صورة من جهازك.' : 'There are no uploaded images for this property. Add an image from your device.'}</p> : null}<div className="admin-property-editor__grid">{media.map(item => <article key={item.id}>{item.kind === 'image' ? <AdminPropertyPhoto propertyId={property.id} mediaId={item.id} filename={item.originalFilename} locale={locale} authorization={authorization} apiOrigin={apiOrigin} /> : item.kind === 'video' ? <AdminPropertyVideo propertyId={property.id} mediaId={item.id} filename={item.originalFilename} locale={locale} authorization={authorization} apiOrigin={apiOrigin} /> : null}<p>{item.isCover || property.imageUrl?.includes(`/media/${item.id}/content`) ? (ar ? 'صورة الغلاف' : 'Cover image') : item.originalFilename}</p>{item.kind === 'image' && !item.isCover && !property.imageUrl?.includes(`/media/${item.id}/content`) ? <Button type="button" size="sm" onClick={() => { void run(() => order(media.map(photo => ({ ...photo, isCover: photo.id === item.id })))); }}>{ar ? 'تعيين كغلاف' : 'Use as cover'}</Button> : null}<Button type="button" variant="secondary" size="sm" onClick={() => { void run(async () => { await client.request(`${path}/media/${item.id}`, { method: 'DELETE', headers: headers(), responseSchema: successEnvelopeSchema(propertyMediaDataSchema) }); setMedia(current => current.filter(photo => photo.id !== item.id)); return refreshPropertyAfterMedia(); }); }}>{ar ? 'إزالة' : 'Remove'}</Button></article>)}</div>
    <label>{ar ? 'إضافة صورة (JPG / PNG، حتى 10 ميجابايت)' : 'Add image (JPG / PNG, up to 10 MB)'}<input type="file" accept="image/jpeg,image/png" disabled={!mediaReady} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void run(() => upload(file)); }} /></label></fieldset>{feedback ? <p role={failed ? 'alert' : 'status'}>{feedback}</p> : null}</section>;
}
