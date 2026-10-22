import type { RequestData, SupportedLocale } from '@sadat-real-estate/contracts';
import { getAdminRequestsCopy } from './copy.ts';

export function RequestTimeline({ request, locale }: { request: RequestData; locale: SupportedLocale }) {
  const copy = getAdminRequestsCopy(locale), ar = locale === 'ar';
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const events = [
    { at: request.createdAt, title: ar ? 'تم إنشاء الطلب' : 'Request created', body: '' },
    ...(request.customerUpdates ?? []).map(update => ({ at: update.createdAt, title: copy.statusLabel[update.status], body: update.authorRole === 'seeker' ? '' : update.message ?? '' })),
    ...(request.internalNotes ?? []).map(note => ({ at: note.createdAt, title: ar ? 'ملاحظة داخلية للإدارة' : 'Internal administration note', body: note.body }))
  ].sort((a, b) => a.at.localeCompare(b.at));
  return <section className="admin-requests__payload"><h3>{ar ? 'سجل متابعة الطلب' : 'Request activity'}</h3><ol>{events.map((event, index) => <li key={`${event.at}-${index}`}><strong>{event.title}</strong> — <time dateTime={event.at}>{date(event.at)}</time>{event.body ? <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{event.body}</p> : null}</li>)}</ol><p>{ar ? 'الملاحظات الداخلية متاحة للإدارة فقط. الرسالة الموجهة للعميل تظهر له ضمن تحديثات الطلب.' : 'Internal notes are visible to administration only. Customer messages appear in the customer’s request updates.'}</p></section>;
}
