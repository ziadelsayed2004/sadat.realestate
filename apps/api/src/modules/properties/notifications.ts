import { createHash } from 'node:crypto';
import { Types, type Connection, type ClientSession } from 'mongoose';

export async function notifyPropertyReview(connection: Connection, input: { id: string; providerId: string; version: number; status: string; occurredAt: Date }, session: ClientSession) {
  if (!['approved', 'published', 'rejected', 'needs_changes'].includes(input.status)) return;
  const title = input.status === 'published' ? { ar: 'تم قبول ونشر عقارك', en: 'Your property was approved and published' } : input.status === 'approved' ? { ar: 'تم قبول عقارك', en: 'Your property was approved' } : input.status === 'rejected' ? { ar: 'تم رفض العقار', en: 'Your property was rejected' } : { ar: 'عقارك يحتاج تعديلات', en: 'Your property needs changes' };
  const id = createHash('sha256').update(`property-review:${input.id}:${input.version}:${input.status}`).digest('hex').slice(0, 24);
  const notification = { _id: new Types.ObjectId(id), recipientId: new Types.ObjectId(input.providerId), audience: 'provider', type: `property.${input.status}`, title, message: { ar: 'افتح العقار لمراجعة الحالة وتفاصيل قرار الإدارة.', en: 'Open your property to review its status and the administrative decision.' }, link: `/provider/properties/${input.id}`, readAt: null, createdAt: input.occurredAt };
  await connection.collection('notifications').updateOne({ _id: notification._id }, { $setOnInsert: notification }, { session, upsert: true });
}
