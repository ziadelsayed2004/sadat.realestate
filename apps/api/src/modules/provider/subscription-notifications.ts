import { createHash } from 'node:crypto';
import { Types, type ClientSession, type Connection } from 'mongoose';

type Event = 'activated' | 'renewed' | 'scheduled' | 'expired' | 'stopped';
const messages: Record<Event, { ar: string; en: string }> = {
  activated: { ar: 'تم تفعيل اشتراك ظهور اسمك وصورتك. يمكنك تعديل بيانات العرض من إعدادات حسابك.', en: 'Your name and photo subscription is active. Edit your public profile in account settings.' },
  renewed: { ar: 'تم تجديد اشتراك ظهور اسمك وصورتك. راجع المدة الجديدة في إعدادات حسابك.', en: 'Your identity display subscription has been renewed. Check the new dates in account settings.' },
  scheduled: { ar: 'تم تأكيد اشتراك ظهور اسمك وصورتك وسيبدأ في الموعد المحدد في إعدادات حسابك.', en: 'Your identity subscription is confirmed and starts on the date in account settings.' },
  expired: { ar: 'انتهى اشتراك ظهور اسمك وصورتك. تواصل مع الإدارة للتجديد من إعدادات حسابك.', en: 'Your identity display subscription has expired. Contact administration from account settings to renew.' },
  stopped: { ar: 'تم إيقاف اشتراك ظهور اسمك وصورتك. راجع إدارة المنصة للتفاصيل.', en: 'Your identity display subscription has been stopped. Contact administration for details.' }
};

export async function notifyIdentitySubscription(connection: Connection, accountId: Types.ObjectId, version: number, event: Event, now: Date, session: ClientSession) {
  const id = new Types.ObjectId(createHash('sha256').update(`identity-subscription:${accountId}:${version}:${event}`).digest('hex').slice(0, 24));
  await connection.collection('notifications').updateOne({ _id: id }, { $setOnInsert: {
    recipientId: accountId, audience: 'provider', type: `provider.identity_subscription.${event}`,
    title: { ar: 'اشتراك ظهور الاسم والصورة', en: 'Identity display subscription' }, message: messages[event],
    link: '/provider/settings?tab=account#provider-display-subscription', readAt: null, createdAt: now
  } }, { upsert: true, session });
}

/** Date-based visibility is immediate; this sweep delivers each transition once per subscription version. */
export async function deliverDueIdentityNotifications(connection: Connection, now = new Date()) {
  const subscriptions = connection.collection('provider_identity_subscriptions');
  const rows = await subscriptions.find({ status: 'active', paymentConfirmed: true, startAt: { $lte: now }, $or: [
    { $expr: { $ne: [{ $ifNull: ['$expiryNotificationVersion', -1] }, '$version'] }, endAt: { $lte: now } },
    { $expr: { $ne: [{ $ifNull: ['$activationNotificationVersion', -1] }, '$version'] }, endAt: { $gt: now } }
  ] }).limit(100).toArray();
  for (const row of rows) await connection.transaction(async session => {
    const current = await subscriptions.findOne({ _id: row._id, version: row.version, status: 'active', paymentConfirmed: true }, { session });
    if (!current || !(current.endAt instanceof Date) || !(current.startAt instanceof Date) || current.startAt > now) return;
    const event = current.endAt <= now ? 'expired' : 'activated';
    const marker = event === 'expired' ? 'expiryNotificationVersion' : 'activationNotificationVersion';
    if (current[marker] === current.version) return;
    await notifyIdentitySubscription(connection, current._id, current.version, event, now, session);
    await subscriptions.updateOne({ _id: current._id, version: current.version }, { $set: { [marker]: current.version } }, { session });
  });
}

export function startIdentityNotificationWorker(connection: Connection) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await deliverDueIdentityNotifications(connection); }
    catch { process.stderr.write('Identity subscription notification delivery will retry.\n'); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => { void tick(); }, 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
