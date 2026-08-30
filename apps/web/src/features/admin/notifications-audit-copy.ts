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
  },
  'zh-CN': {
    navLabel: '通知与审计日志',
    notifications: {
      eyebrow: '通知中心', title: '通知', description: '仅查看发送给当前管理员账户的通知。', listLabel: '通知列表', unreadCount: '未读', markAll: '全部标为已读', markRead: '标为已读', openLink: '打开链接', tabs: { all: '全部', unread: '未读' },
      empty: { all: { title: '暂无通知', body: '有真实通知时会显示在这里。' }, unread: { title: '没有未读通知', body: '所有可用通知都已查看。' } },
      mutation: { markedRead: '通知已标为已读。', markedAll: '通知已全部标为已读。', notFound: '此通知已不可用。', permission: '你没有更新此通知的权限。', error: '无法更新通知。' }
    },
    audit: {
      eyebrow: '治理与追踪', title: '审计日志', description: '查看记录的事件以及由服务器脱敏的变更前后快照。', filters: '筛选日志', actorId: '管理员 ID', targetType: '目标类型', targetId: '目标 ID', action: '操作', traceId: '追踪 ID', from: '开始时间', to: '结束时间', apply: '应用筛选', clear: '清除', tableLabel: '审计事件', date: '日期和时间', actor: '管理员', target: '目标', actionLabel: '操作', reason: '原因', details: '详情', before: '变更前', after: '变更后', snapshotNotice: '变更前后快照由服务器脱敏，不包含密码、访问令牌或私人文档。', metrics: { total: '事件总数', onPage: '当前页显示', administrators: '唯一管理员', redactedSnapshots: '脱敏快照' }, requestId: '请求 ID', trace: '追踪', view: '查看详情', back: '返回审计日志', noEntries: '没有符合当前筛选条件的审计事件。'
    },
    states: { loading: { title: '正在加载', body: '正在从已实现的平台数据源获取数据。' }, empty: { title: '暂无数据', body: '没有可显示的真实记录。' }, error: { title: '无法加载数据', body: '请检查连接后重试。' }, retry: { title: '服务暂时不可用', body: '连接恢复后可以重试。' }, permission: { title: '无权访问', body: '此页面需要具有相应权限的管理员会话。' }, not_found: { title: '找不到审计记录', body: '请求的审计记录已不可用。' }, success: { title: '已加载', body: '数据已从已实现的数据源加载。' } },
    retry: '重试', previous: '上一页', next: '下一页', pagination: '结果页'
  }
};

export function getAdminNotificationsAuditCopy(locale: SupportedLocale): AdminNotificationsAuditCopy {
  return copy[locale];
}
