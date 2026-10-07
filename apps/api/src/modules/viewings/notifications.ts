import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import type { ViewingRecord } from './service.js';

const labels = {
  requested: { ar: 'طلب معاينة جديد', en: 'New viewing request' },
  confirmed: { ar: 'تم تأكيد المعاينة', en: 'Viewing confirmed' },
  rescheduled: { ar: 'تم تعديل موعد المعاينة', en: 'Viewing rescheduled' },
  cancelled: { ar: 'تم إلغاء المعاينة', en: 'Viewing cancelled' },
  completed: { ar: 'تمت المعاينة', en: 'Viewing completed' }
};

export function viewingNotifications(row: ViewingRecord, actorId: string) {
  const recipients = [{ id: row.seekerId, audience: 'seeker' }, ...(row.providerId ? [{ id: row.providerId, audience: 'provider' }] : [])];
  return recipients.filter(recipient => recipient.id !== actorId).map(recipient => {
    const date = (locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(row.requestedAt);
    const id = createHash('sha256').update(`viewing:${row.id}:${row.version}:${recipient.audience}`).digest('hex').slice(0, 24);
    return {
      _id: new Types.ObjectId(id), recipientId: new Types.ObjectId(recipient.id), audience: recipient.audience,
      type: `viewing.${row.status}`, title: labels[row.status],
      message: { ar: `${date('ar')} بتوقيت مصر. افتح طلبات المعاينة للاطلاع على التفاصيل.`, en: `${date('en')} Egypt time. Open your viewings to see the details.` },
      link: `/${recipient.audience}/viewings`, readAt: null, createdAt: row.updatedAt
    };
  });
}
