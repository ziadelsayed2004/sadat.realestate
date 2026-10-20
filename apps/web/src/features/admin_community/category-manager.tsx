import { useState, type FormEvent } from 'react';
import { communityCategoryCreateSchema, communityCategoryListSuccessEnvelopeSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { createAdminSessionClient, adminSessionOptions } from '../admin_ads/data.ts';
import { Button } from '../design_system/index.ts';
import { useCommunityCategories } from '../community/categories.ts';

export function CommunityCategoryManager({ locale, authClient }: { locale: SupportedLocale; authClient?: { getAuthorizationHeader(): string | undefined } | undefined }) {
  const categories = useCommunityCategories(locale), ar = locale === 'ar';
  const [label, setLabel] = useState({ ar: '', en: '' }), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string>(), [created, setCreated] = useState<string[]>([]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = communityCategoryCreateSchema.safeParse({ label: Object.fromEntries(Object.entries(label).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()])), reason });
    if (!input.success) { setMessage(ar ? 'اكتب اسم التصنيف بالعربية أو الإنجليزية وسبب الإضافة.' : 'Enter the category name in Arabic or English and a reason.'); return; }
    setBusy(true); setMessage(undefined);
    try {
      const options = { authorization: authClient };
      const result = await createAdminSessionClient(options).request('/admin/community/categories', { ...adminSessionOptions(options), method: 'POST', json: input.data, responseSchema: communityCategoryListSuccessEnvelopeSchema });
      setCreated(result.data.data.items.filter(item => item.key.startsWith('custom_')).map(item => item.label[locale] ?? item.label.ar ?? item.label.en ?? item.key));
      setLabel({ ar: '', en: '' }); setReason('');
      setMessage(ar ? 'تمت إضافة التصنيف. يظهر للعميل في اختيار تصنيف المنشور عند فتح المجتمع أو الرجوع إليه.' : 'Category added. It appears in the post category selector when customers open or return to Community.');
    } catch (error) { setMessage(error instanceof ApiClientError && error.status === 403 ? ar ? 'تحتاج صلاحية مراجعة محتوى المجتمع لإضافة تصنيفات.' : 'Community moderation permission is required to add categories.' : error instanceof ApiClientError && error.status === 409 ? ar ? 'الاسم موجود بالفعل أو تم الوصول للحد الأقصى للتصنيفات.' : 'This name already exists or the category limit was reached.' : ar ? 'تعذرت الإضافة. أعد المحاولة.' : 'Could not add the category. Retry.'); }
    finally { setBusy(false); }
  }
  return <details className="admin-community__panel admin-community__category-manager"><summary>{ar ? 'تصنيفات المجتمع — إضافة تصنيف جديد' : 'Community categories — add a category'}</summary><p>{ar ? 'التصنيف ينظم منشورات العملاء. يظهر في نموذج إضافة منشور وفلاتر المجتمع؛ مراجعة المنشورات تظل مطلوبة.' : 'Categories organize customer posts and appear in the post composer and community filters. Posts still require moderation.'}</p><p>{[...new Set([...categories.map(item => item.label), ...created])].join(' · ')}</p><form onSubmit={event => void submit(event)}><fieldset disabled={busy}><label>{ar ? 'اسم التصنيف بالعربية' : 'Arabic category name'}<input value={label.ar} onChange={event => setLabel(current => ({ ...current, ar: event.target.value }))} maxLength={160} /></label><label>{ar ? 'اسم التصنيف بالإنجليزية (اختياري)' : 'English category name (optional)'}<input value={label.en} onChange={event => setLabel(current => ({ ...current, en: event.target.value }))} maxLength={160} /></label><label>{ar ? 'سبب الإضافة' : 'Reason'}<input value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={500} required /></label><Button type="submit" loading={busy}>{ar ? 'إضافة التصنيف' : 'Add category'}</Button></fieldset></form>{message ? <p role="status">{message}</p> : null}</details>;
}
