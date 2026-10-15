import { createHash } from 'node:crypto';
import { Types, type ClientSession, type Connection } from 'mongoose';
import type { CommissionAccountOverride } from '@sadat-real-estate/contracts';

export function commissionAccountNotification(override: CommissionAccountOverride, previousStatus?: unknown) {
  const active = override.status === 'active';
  if (!active && !(previousStatus === 'active' && ['inactive', 'archived'].includes(override.status))) return undefined;
  const value = override.kind === 'percentage' ? `${(override.percentageBps ?? 0) / 100}%` : override.kind === 'fixed' ? `${(override.fixedAmountMinor ?? 0) / 100} ${override.currency}` : '0%';
  const key = createHash('sha256').update(`commission-account:${override.id}:${override.version}:${override.status}`).digest('hex').slice(0, 24);
  return {
    _id: new Types.ObjectId(key), recipientId: new Types.ObjectId(override.accountId), audience: 'provider',
    type: active ? 'commission.account_changed' : 'commission.account_stopped',
    title: active ? { ar: 'تحديث عمولة حسابك', en: 'Account commission updated' } : { ar: 'تم إلغاء تخصيص عمولتك', en: 'Account commission assignment stopped' },
    message: active
      ? { ar: `حفظت الإدارة تخصيصًا بقيمة ${value} يبدأ في ${override.effectiveFrom.slice(0, 10)}. راجع صفحة العمولة لمعرفة القيمة السارية؛ الاستثناء المعتمد له الأولوية.`, en: `An assignment of ${value} was saved, starting ${override.effectiveFrom.slice(0, 10)}. Check your commission page for the effective value; approved exceptions take priority.` }
      : { ar: 'ألغت الإدارة تخصيص عمولة الحساب. راجع صفحة العمولة لمعرفة القيمة التي تنطبق الآن.', en: 'Your account commission assignment was stopped. Check your commission page for the value that now applies.' },
    link: '/provider/commission', createdAt: new Date(override.updatedAt), readAt: null
  };
}

export async function writeCommissionAccountNotification(connection: Connection, override: CommissionAccountOverride, previousStatus: unknown, session: ClientSession) {
  const notification = commissionAccountNotification(override, previousStatus);
  if (notification) await connection.collection('notifications').updateOne({ _id: notification._id }, { $setOnInsert: notification }, { upsert: true, session });
}
