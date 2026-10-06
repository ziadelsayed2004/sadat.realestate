import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import type { RequestStatus } from '@sadat-real-estate/contracts';
import type { RequestRecord } from './service.js';

const statuses: Record<RequestStatus, { ar: string; en: string }> = {
  new: { ar: 'جديد', en: 'New' }, under_review: { ar: 'قيد المراجعة', en: 'Under review' },
  contacted: { ar: 'تم التواصل', en: 'Contacted' }, scheduled: { ar: 'مجدول', en: 'Scheduled' },
  needs_information: { ar: 'يحتاج معلومات', en: 'Needs information' }, in_progress: { ar: 'قيد التنفيذ', en: 'In progress' },
  resolved: { ar: 'تم الحل', en: 'Resolved' }, cancelled: { ar: 'ملغى', en: 'Cancelled' }, closed: { ar: 'مغلق', en: 'Closed' }
};

export function requestCustomerNotification(request: RequestRecord, actorId: string, customerMessage?: string) {
  const recipient = request.seekerId ? { id: request.seekerId, audience: 'seeker' as const }
    : request.source === 'provider' && request.providerId ? { id: request.providerId, audience: 'provider' as const } : undefined;
  if (!recipient || recipient.id === actorId) return undefined;
  const status = statuses[request.status];
  const id = createHash('sha256').update(`request:${request.id}:${request.version}:${recipient.audience}`).digest('hex').slice(0, 24);
  return {
    _id: new Types.ObjectId(id), recipientId: new Types.ObjectId(recipient.id), audience: recipient.audience,
    type: 'request.updated', title: { ar: `تحديث طلبك: ${status.ar}`, en: `Request update: ${status.en}` },
    message: customerMessage ? { ar: customerMessage, en: customerMessage } : { ar: 'تم تحديث حالة طلبك. افتح التفاصيل لمتابعة الطلب.', en: 'Your request status changed. Open the details to follow its progress.' },
    link: recipient.audience === 'seeker' ? `/seeker/requests/${request.id}` : `/provider/customer-requests/${request.id}`,
    readAt: null, createdAt: request.updatedAt
  };
}
