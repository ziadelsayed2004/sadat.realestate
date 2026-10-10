import { getEditableCopyCatalog, localizeCopy } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { getSimpleAuditCopy } from './audit-presentation.ts';

export type AdminNotificationsAuditState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';
export type AdminNotificationFilter = 'all' | 'unread';

interface StateCopy { readonly title: string; readonly body: string; }

export interface AdminNotificationsAuditCopy {
  readonly navLabel: string;
  readonly notifications: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly listLabel: string;
    readonly unreadCount: string;
    readonly markAll: string;
    readonly markRead: string;
    readonly openLink: string;
    readonly tabs: Readonly<Record<AdminNotificationFilter, string>>;
    readonly empty: Readonly<Record<AdminNotificationFilter, { readonly title: string; readonly body: string }>>;
    readonly mutation: Readonly<Record<'markedRead' | 'markedAll' | 'notFound' | 'permission' | 'error', string>>;
  };
  readonly audit: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly filters: string;
    readonly actorId: string;
    readonly targetType: string;
    readonly targetId: string;
    readonly action: string;
    readonly traceId: string;
    readonly from: string;
    readonly to: string;
    readonly apply: string;
    readonly clear: string;
    readonly tableLabel: string;
    readonly date: string;
    readonly actor: string;
    readonly target: string;
    readonly actionLabel: string;
    readonly reason: string;
    readonly details: string;
    readonly before: string;
    readonly after: string;
    readonly snapshotNotice: string;
    readonly metrics: {
      readonly total: string;
      readonly onPage: string;
      readonly administrators: string;
      readonly redactedSnapshots: string;
    };
    readonly requestId: string;
    readonly trace: string;
    readonly view: string;
    readonly back: string;
    readonly noEntries: string;
    readonly exportLog: string;
  };
  readonly states: Readonly<Record<AdminNotificationsAuditState, StateCopy>>;
  readonly retry: string;
  readonly previous: string;
  readonly next: string;
  readonly pagination: string;
}

export function getAdminNotificationsAuditCopy(locale: SupportedLocale) {
  const simple = getSimpleAuditCopy(locale);
  const base = getEditableCopyCatalog(locale)['admin/notifications-audit-copy#getAdminNotificationsAuditCopy'] as unknown as AdminNotificationsAuditCopy;
  const fallback = { ...base, audit: { ...base.audit, ...simple, metrics: {
    total: simple.total, onPage: simple.onPage, administrators: simple.administrators, redactedSnapshots: simple.redactedSnapshots
  } } };
  return localizeCopy('admin/notifications-audit-copy#getAdminNotificationsAuditCopy', locale, fallback);
}
