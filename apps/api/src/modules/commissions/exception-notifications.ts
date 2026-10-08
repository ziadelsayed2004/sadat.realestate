import { createHash } from 'node:crypto';
import { Types, type Connection, type ClientSession } from 'mongoose';
import type { CommissionException } from '@sadat-real-estate/contracts';

export function commissionExceptionNotification(exception: CommissionException, previousStatus: string) {
  if (exception.status !== 'active' && !(previousStatus === 'active' && (exception.status === 'inactive' || exception.status === 'archived'))) return undefined;
  const active = exception.status === 'active';
  const value = exception.kind === 'percentage' ? `${(exception.percentageBps ?? 0) / 100}%` : exception.kind === 'fixed' ? `${(exception.fixedAmountMinor ?? 0) / 100} ${exception.currency ?? 'EGP'}` : '0%';
  const id = createHash('sha256').update(`commission-exception:${exception.id}:${exception.version}:${exception.status}`).digest('hex').slice(0, 24);
  return {
    _id: new Types.ObjectId(id), recipientId: new Types.ObjectId(exception.accountId), audience: 'provider',
    type: active ? 'commission.exception_activated' : 'commission.exception_stopped',
    title: active ? { ar: 'تم تعديل عمولتك', en: 'Your commission has changed' } : { ar: 'تم إيقاف استثناء العمولة', en: 'Your commission exception has stopped' },
    message: active ? { ar: `اعتمدت الإدارة استثناء بقيمة ${value}. افتح صفحة العمولة لمراجعة القيمة التي تنطبق الآن.`, en: `An exception of ${value} was approved. Open your commission page to review the commission that now applies.` } : { ar: 'أوقفت الإدارة الاستثناء. راجع صفحة العمولة لمعرفة القيمة التي تنطبق الآن.', en: 'The exception was stopped. Open your commission page to review the commission that now applies.' },
    link: '/provider/commission', createdAt: new Date(exception.updatedAt), readAt: null
  };
}

export async function writeCommissionExceptionNotification(connection: Connection, exception: CommissionException, previousStatus: string, session: ClientSession): Promise<void> {
  const notification = commissionExceptionNotification(exception, previousStatus);
  if (!notification) return;
  await connection.collection('notifications').updateOne({ _id: notification._id }, { $setOnInsert: notification }, { upsert: true, session });
}
