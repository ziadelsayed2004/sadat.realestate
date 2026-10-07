import { createHash } from 'node:crypto';
import { Types, type ClientSession, type Connection } from 'mongoose';

const messages = {
  approved: { title: { ar: 'تمت الموافقة على طلب إعلانك', en: 'Your advertising request was approved' }, message: { ar: 'وافقت الإدارة مبدئيًا على الطلب. ستحدد السعر والفترة قبل الدفع وتفعيل الإعلان.', en: 'Administration approved the request for pricing. The price and period will be agreed before payment and activation.' } },
  rejected: { title: { ar: 'تم رفض طلب إعلانك', en: 'Your advertising request was rejected' }, message: { ar: 'افتح تفاصيل الطلب للاطلاع على سبب الرفض.', en: 'Open the request to review the rejection reason.' } },
  quote_sent: { title: { ar: 'عرض سعر جديد لإعلانك', en: 'New quote for your advertisement' }, message: { ar: 'راجع السعر والفترة والشروط، ثم اقبل العرض من تفاصيل الطلب للانتقال إلى الدفع.', en: 'Review the price, period, and terms, then accept the quote in the request details to proceed to payment.' } },
  waiting_payment: { title: { ar: 'مطلوب دفع قيمة إعلانك', en: 'Payment required for your advertisement' }, message: { ar: 'تم قبول عرض السعر. سدّد القيمة المتفق عليها، ثم اختر إثبات الدفع واضغط «إرسال الطلب» لمراجعته.', en: 'The quote was accepted. Pay the agreed amount, then choose your payment proof and press “Send request” for review.' } },
  payment_approved: { title: { ar: 'تم اعتماد إثبات دفع إعلانك', en: 'Your advertisement payment proof was approved' }, message: { ar: 'تم اعتماد إثبات الدفع. ستحدد الإدارة جدولة الإعلان؛ الاعتماد وحده لا يعني أن الإعلان بدأ عرضه.', en: 'Payment proof was approved. Administration will schedule the advertisement; approval alone does not mean it is live.' } },
  payment_rejected: { title: { ar: 'إثبات دفع إعلانك يحتاج إلى تصحيح', en: 'Your advertisement payment proof needs correction' }, message: { ar: 'راجع سبب الرفض في تفاصيل الطلب وأرسل إثبات دفع صحيحًا.', en: 'Review the rejection reason in the request details and send a corrected payment proof.' } },
  scheduled: { title: { ar: 'تم قبول إعلانك وجدولته', en: 'Your advertisement was approved and scheduled' }, message: { ar: 'تم اعتماد الإعلان وجدولته للفترة المحددة. افتح التفاصيل لمراجعة موعد العرض.', en: 'Your advertisement was approved and scheduled for the agreed period. Open the details to check the dates.' } },
  payment_waived: { title: { ar: 'تم اعتماد إعلانك بدون دفع', en: 'Your advertisement was approved without payment' }, message: { ar: 'تم إعفاء الإعلان من الدفع وجدولته. افتح التفاصيل لمراجعة الفترة.', en: 'Payment was waived and your advertisement was scheduled. Open the details to review the period.' } }
} as const;

export interface AdvertisingNotificationInput {
  event: keyof typeof messages;
  requestId: string;
  providerId: string;
  version: number;
  occurredAt: Date;
  reason?: string;
  /** Payment-proof events have their own versions and identities. */
  sourceId?: string;
}

export function advertisingNotification(input: AdvertisingNotificationInput) {
  const text = messages[input.event];
  const id = createHash('sha256').update(`advertising:${input.requestId}:${input.providerId}:${input.event}:${input.sourceId ?? input.requestId}:${input.version}`).digest('hex').slice(0, 24);
  return {
    _id: new Types.ObjectId(id), recipientId: new Types.ObjectId(input.providerId), audience: 'provider',
    type: `advertising.${input.event}`, title: text.title,
    message: input.reason ? { ar: `${text.message.ar} ${input.reason}`, en: `${text.message.en} ${input.reason}` } : text.message,
    link: `/provider/ads/${input.requestId}`, createdAt: input.occurredAt, readAt: null
  };
}

export async function writeAdvertisingNotification(connection: Connection, input: AdvertisingNotificationInput, session: ClientSession): Promise<void> {
  const notification = advertisingNotification(input);
  await connection.collection('notifications').updateOne({ _id: notification._id }, { $setOnInsert: notification }, { upsert: true, session });
}
