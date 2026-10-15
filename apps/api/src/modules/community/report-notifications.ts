import { createHash } from 'node:crypto';
import { Types, type Connection, type ClientSession } from 'mongoose';
import type { CommunityAdminReport } from '@sadat-real-estate/contracts';

export async function notifyCommunityReporter(connection: Connection, report: CommunityAdminReport, session: ClientSession): Promise<void> {
  const recipient = await connection.collection('users').findOne({ _id: new Types.ObjectId(report.reporterId), deletedAt: null, roleType: { $in: ['provider', 'seeker'] } }, { session, projection: { roleType: 1 } });
  if (!recipient) return;
  const resolved = report.status === 'resolved';
  const key = createHash('sha256').update(`community-report:${report.id}:${report.version}:${report.status}`).digest('hex').slice(0, 24);
  const notice = {
    _id: new Types.ObjectId(key), recipientId: new Types.ObjectId(report.reporterId), audience: recipient.roleType,
    type: resolved ? 'community.report_resolved' : 'community.report_reviewed',
    title: resolved ? { ar: 'تم حل بلاغك', en: 'Your report was resolved' } : { ar: 'تمت مراجعة بلاغك', en: 'Your report was reviewed' },
    message: resolved ? { ar: 'راجعت الإدارة بلاغك واتخذت الإجراء اللازم. شكرًا لمساعدتك في تحسين المجتمع.', en: 'An administrator reviewed your report and took the required action. Thank you for helping improve the community.' } : { ar: 'راجعت الإدارة بلاغك وأغلقت المراجعة دون إجراء إضافي.', en: 'An administrator reviewed your report and closed the review without further action.' },
    link: '/community', createdAt: new Date(report.updatedAt), readAt: null
  };
  await connection.collection('notifications').updateOne({ _id: notice._id }, { $setOnInsert: notice }, { upsert: true, session });
}
