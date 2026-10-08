import { useEffect, useRef, useState } from 'react';
import type { Article, ArticleDelete, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';

export function ArticleDeletePanel({ article, locale, onCancel, onDelete }: { article: Article; locale: SupportedLocale; onCancel: () => void; onDelete: (input: ArticleDelete) => Promise<void> }) {
  const ar = locale === 'ar';
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'start' }); ref.current?.querySelector('textarea')?.focus({ preventScroll: true }); }, []);
  return <section ref={ref} className="admin-content__action-panel" data-testid="admin-article-delete">
    <h2>{ar ? 'حذف المقال' : 'Delete article'}: {article.title[locale] ?? article.title.ar ?? article.title.en}</h2>
    <p>{ar ? 'سيُحذف المقال من الإدارة والموقع، ولن يمكن استعادته من الأرشيف. لإخفائه مؤقتًا استخدم «إزالة من الموقع».' : 'This deletes the article from administration and the website. It cannot be restored from the archive. To hide it temporarily, use “Remove from website”.'}</p>
    <form onSubmit={event => { event.preventDefault(); if (busy || reason.trim().length < 5) return; setBusy(true); setError(false); void onDelete({ version: article.version, reason: reason.trim().replace(/\s+/gu, ' ') }).catch(() => setError(true)).finally(() => setBusy(false)); }}>
      <label>{ar ? 'سبب الحذف' : 'Deletion reason'}<textarea required minLength={5} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label>
      <div className="admin-content__inline-actions"><Button type="submit" variant="danger" disabled={busy} loading={busy}>{ar ? 'تأكيد حذف المقال' : 'Confirm article deletion'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>{ar ? 'إلغاء' : 'Cancel'}</Button></div>
      {error ? <p role="alert">{ar ? 'تعذر الحذف. حدّث قائمة المقالات ثم حاول مرة أخرى.' : 'Deletion failed. Refresh the article list and try again.'}</p> : null}
    </form>
  </section>;
}
