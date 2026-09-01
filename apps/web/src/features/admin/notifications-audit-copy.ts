import type { SupportedLocale } from '@sadat-real-estate/contracts';

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
  };
  readonly states: Readonly<Record<AdminNotificationsAuditState, StateCopy>>;
  readonly retry: string;
  readonly previous: string;
  readonly next: string;
  readonly pagination: string;
}

const copy: Readonly<Record<SupportedLocale, AdminNotificationsAuditCopy>> = {
  ar: {
    navLabel: 'الإشعارات وسجل التدقيق',
    notifications: {
      eyebrow: 'مركز التنبيهات', title: 'الإشعارات', description: 'راجع التنبيهات الموجهة إلى حسابك الإداري فقط.', listLabel: 'قائمة الإشعارات', unreadCount: 'غير مقروء', markAll: 'تحديد الكل كمقروء', markRead: 'تحديد كمقروء', openLink: 'فتح الرابط', tabs: { all: 'الكل', unread: 'غير مقروء' },
      empty: { all: { title: 'لا توجد إشعارات', body: 'ستظهر الإشعارات الحقيقية هنا عند توفرها.' }, unread: { title: 'لا توجد إشعارات غير مقروءة', body: 'تمت مراجعة جميع الإشعارات المتاحة.' } },
      mutation: { markedRead: 'تم تحديد الإشعار كمقروء.', markedAll: 'تم تحديد الإشعارات كمقروءة.', notFound: 'لم يعد هذا الإشعار متاحاً.', permission: 'لا تملك صلاحية تعديل هذا الإشعار.', error: 'تعذر تحديث الإشعار.' }
    },
    audit: {
      eyebrow: 'الحوكمة والتدقيق', title: 'سجل التدقيق', description: 'راجع الأحداث المسجلة مع لقطات قبل وبعد المنقحة من الخادم.', filters: 'تصفية السجل', actorId: 'معرف المسؤول', targetType: 'نوع الهدف', targetId: 'معرف الهدف', action: 'الإجراء', traceId: 'معرف التتبع', from: 'من', to: 'إلى', apply: 'تطبيق الفلاتر', clear: 'مسح', tableLabel: 'أحداث التدقيق', date: 'التاريخ والوقت', actor: 'المسؤول', target: 'الهدف', actionLabel: 'الإجراء', reason: 'السبب', details: 'التفاصيل', before: 'قبل', after: 'بعد', snapshotNotice: 'اللقطات قبل وبعد منقحة من الخادم ولا تعرض كلمات مرور أو رموز وصول أو مستندات خاصة.', metrics: { total: 'إجمالي الأحداث', onPage: 'المعروض في الصفحة', administrators: 'المسؤولون الفريدون', redactedSnapshots: 'لقطات منقحة' }, requestId: 'معرف الطلب', trace: 'التتبع', view: 'عرض التفاصيل', back: 'العودة إلى السجل', noEntries: 'لا توجد أحداث تدقيق مطابقة.'
    },
    states: { loading: { title: 'جارٍ التحميل', body: 'يتم جلب البيانات من مصدر المنصة الفعلي.' }, empty: { title: 'لا توجد بيانات', body: 'لا توجد سجلات فعلية لعرضها.' }, error: { title: 'تعذر تحميل البيانات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الخدمة غير متاحة مؤقتاً', body: 'يمكنك إعادة المحاولة عند عودة الاتصال.' }, permission: { title: 'الوصول غير مسموح', body: 'تتطلب هذه الصفحة جلسة مسؤول والصلاحية المناسبة.' }, not_found: { title: 'السجل غير موجود', body: 'لم يعد سجل التدقيق المطلوب متاحاً.' }, success: { title: 'تم التحميل', body: 'تم تحميل البيانات من المصدر الفعلي.' } },
    retry: 'إعادة المحاولة', previous: 'السابق', next: 'التالي', pagination: 'صفحات النتائج'
  },
  en: {
    navLabel: 'Notifications and audit log',
    notifications: {
      eyebrow: 'Notification center', title: 'Notifications', description: 'Review notifications addressed to the authenticated administrator only.', listLabel: 'Notification list', unreadCount: 'unread', markAll: 'Mark all as read', markRead: 'Mark as read', openLink: 'Open link', tabs: { all: 'All', unread: 'Unread' },
      empty: { all: { title: 'No notifications', body: 'Real notifications will appear here when they are available.' }, unread: { title: 'No unread notifications', body: 'All available notifications have been reviewed.' } },
      mutation: { markedRead: 'Notification marked as read.', markedAll: 'Notifications marked as read.', notFound: 'This notification is no longer available.', permission: 'You do not have permission to update this notification.', error: 'The notification could not be updated.' }
    },
    audit: {
      eyebrow: 'Governance and traceability', title: 'Audit log', description: 'Review recorded events with server-redacted before and after snapshots.', filters: 'Filter log', actorId: 'Administrator ID', targetType: 'Target type', targetId: 'Target ID', action: 'Action', traceId: 'Trace ID', from: 'From', to: 'To', apply: 'Apply filters', clear: 'Clear', tableLabel: 'Audit events', date: 'Date and time', actor: 'Administrator', target: 'Target', actionLabel: 'Action', reason: 'Reason', details: 'Details', before: 'Before', after: 'After', snapshotNotice: 'Before and after snapshots are redacted by the server; passwords, access tokens, and private documents are excluded.', metrics: { total: 'Total events', onPage: 'Shown on page', administrators: 'Unique administrators', redactedSnapshots: 'Redacted snapshots' }, requestId: 'Request ID', trace: 'Trace', view: 'View details', back: 'Back to audit log', noEntries: 'No audit events match the current filters.'
    },
    states: { loading: { title: 'Loading', body: 'Fetching data from the implemented platform source.' }, empty: { title: 'No data', body: 'There are no real records to display.' }, error: { title: 'Could not load data', body: 'Check the connection and try again.' }, retry: { title: 'The service is temporarily unavailable', body: 'Retry when the connection is available.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator with the required permission.' }, not_found: { title: 'Audit record not found', body: 'The requested audit record is no longer available.' }, success: { title: 'Loaded', body: 'Data was loaded from the implemented source.' } },
    retry: 'Retry', previous: 'Previous', next: 'Next', pagination: 'Result pages'
  },};

export function getAdminNotificationsAuditCopy(locale: SupportedLocale): AdminNotificationsAuditCopy {
  return copy[locale];
}
