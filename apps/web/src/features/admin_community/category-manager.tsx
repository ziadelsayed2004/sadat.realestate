import { useState, type FormEvent } from 'react';
import { communityCategoryCreateSchema, communityCategoryDeleteSchema, communityCategoryListSuccessEnvelopeSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { createAdminSessionClient, adminSessionOptions } from '../admin_ads/data.ts';
import { Button } from '../design_system/index.ts';
import { refreshCommunityCategories, useCommunityCategories } from '../community/categories.ts';

export function CommunityCategoryManager({ locale, authClient }: { locale: SupportedLocale; authClient?: { getAuthorizationHeader(): string | undefined } | undefined }) {
  const categories = useCommunityCategories(locale), ar = locale === 'ar';
  const [label, setLabel] = useState({ ar: '', en: '' }), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string>();
  const [selected, setSelected] = useState<{ key: string; label: string }>();
  const [deleteReason, setDeleteReason] = useState('');
  async function mutate(path: string, method: 'POST' | 'DELETE', json: unknown) {
    const options = { authorization: authClient };
    const result = await createAdminSessionClient(options).request(path, { ...adminSessionOptions(options), method, json, responseSchema: communityCategoryListSuccessEnvelopeSchema });
    refreshCommunityCategories(result.data.data.items);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const input = communityCategoryCreateSchema.safeParse({ label: Object.fromEntries(Object.entries(label).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()])), reason });
    if (!input.success) { setMessage(ar ? 'اكتب اسم التصنيف بالعربية أو الإنجليزية وسبب الإضافة.' : 'Enter the category name in Arabic or English and a reason.'); return; }
    setBusy(true); setMessage(undefined);
    try {
      await mutate('/admin/community/categories', 'POST', input.data);
      setLabel({ ar: '', en: '' }); setReason('');
      setMessage(ar ? 'تمت إضافة التصنيف.' : 'Category added.');
    } catch (error) { setMessage(error instanceof ApiClientError && error.status === 403 ? ar ? 'تحتاج صلاحية مراجعة محتوى المجتمع لإضافة تصنيفات.' : 'Community moderation permission is required to add categories.' : error instanceof ApiClientError && error.status === 409 ? ar ? 'الاسم موجود بالفعل أو تم الوصول للحد الأقصى للتصنيفات.' : 'This name already exists or the category limit was reached.' : ar ? 'تعذرت الإضافة. أعد المحاولة.' : 'Could not add the category. Retry.'); }
    finally { setBusy(false); }
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return;
    const input = communityCategoryDeleteSchema.safeParse({ reason: deleteReason, confirm: true });
    if (!input.success) { setMessage(ar ? 'اكتب سبب الحذف (٣ أحرف على الأقل).' : 'Enter a deletion reason (at least 3 characters).'); return; }
    setBusy(true); setMessage(undefined);
    try {
      await mutate(`/admin/community/categories/${selected.key}`, 'DELETE', input.data);
      setSelected(undefined); setDeleteReason('');
      setMessage(ar ? 'تم حذف التصنيف من الاختيارات. المنشورات القديمة محفوظة.' : 'Category removed from choices. Existing posts are preserved.');
    } catch (error) { setMessage(error instanceof ApiClientError && error.status === 403 ? ar ? 'تحتاج صلاحية مراجعة محتوى المجتمع لحذف التصنيفات.' : 'Community moderation permission is required to delete categories.' : ar ? 'تعذر حذف التصنيف. السبب محفوظ؛ أعد المحاولة.' : 'Could not delete the category. Your reason is preserved; retry.'); }
    finally { setBusy(false); }
  }
  return <details className="admin-community__panel admin-community__category-manager"><summary>{ar ? 'تصنيفات المجتمع — إضافة وحذف التصنيفات' : 'Community categories — add and delete categories'}</summary>
    <p>{ar ? 'التصنيف ينظم منشورات العملاء. يظهر في نموذج إضافة منشور وفلاتر المجتمع؛ مراجعة المنشورات تظل مطلوبة.' : 'Categories organize customer posts and appear in the post composer and community filters. Posts still require moderation.'}</p>
    <ul className="admin-community__category-list">{(categories ?? []).map(item => <li key={item.key}><span>{item.label}</span><Button type="button" size="sm" variant="danger" disabled={busy} aria-label={ar ? `حذف ${item.label}` : `Delete ${item.label}`} onClick={() => { setSelected(item); setDeleteReason(''); setMessage(undefined); }}>{ar ? 'حذف' : 'Delete'}</Button></li>)}</ul>
    {selected ? <form className="admin-community__category-delete" onSubmit={event => void remove(event)}><p>{ar ? `حذف تصنيف «${selected.label}» من الاختيارات؟ ستبقى المنشورات الموجودة وأسماؤها محفوظة.` : `Remove “${selected.label}” from choices? Existing posts and their category names will be preserved.`}</p><label>{ar ? 'سبب حذف التصنيف' : 'Category deletion reason'}<input value={deleteReason} onChange={event => setDeleteReason(event.target.value)} minLength={3} maxLength={500} required disabled={busy} /></label><div className="admin-community__inline-actions"><Button type="submit" variant="danger" loading={busy}>{ar ? 'تأكيد حذف التصنيف' : 'Confirm category deletion'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setSelected(undefined)}>{ar ? 'إلغاء' : 'Cancel'}</Button></div></form> : null}
    <form onSubmit={event => void submit(event)}><fieldset disabled={busy}><label>{ar ? 'اسم التصنيف بالعربية' : 'Arabic category name'}<input value={label.ar} onChange={event => setLabel(current => ({ ...current, ar: event.target.value }))} maxLength={160} /></label><label>{ar ? 'اسم التصنيف بالإنجليزية (اختياري)' : 'English category name (optional)'}<input value={label.en} onChange={event => setLabel(current => ({ ...current, en: event.target.value }))} maxLength={160} /></label><label>{ar ? 'سبب الإضافة' : 'Reason'}<input value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={500} required /></label><Button type="submit" loading={busy}>{ar ? 'إضافة التصنيف' : 'Add category'}</Button></fieldset></form>{message ? <p role="status">{message}</p> : null}
  </details>;
}
