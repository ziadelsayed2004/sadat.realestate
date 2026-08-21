import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderNotificationsCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly listLabel: string;
  readonly unreadCount: string;
  readonly markAll: string;
  readonly markingAll: string;
  readonly tabs: { readonly all: string; readonly unread: string };
  readonly unreadLabel: string;
  readonly markRead: string;
  readonly openLink: string;
  readonly previous: string;
  readonly next: string;
  readonly pagination: string;
  readonly empty: { readonly all: { readonly title: string; readonly body: string }; readonly unread: { readonly title: string; readonly body: string } };
  readonly states: {
    readonly loading: { readonly title: string; readonly body: string };
    readonly empty: { readonly title: string; readonly body: string };
    readonly retry: { readonly title: string; readonly body: string };
    readonly error: { readonly title: string; readonly body: string };
    readonly permission: { readonly title: string; readonly body: string };
  };
  readonly mutation: { readonly markedRead: string; readonly markedAll: string; readonly notFound: string; readonly permission: string; readonly error: string };
  readonly typeLabels: Readonly<Record<string, string>>;
  readonly retry: string;
}

const copy: Readonly<Record<SupportedLocale, ProviderNotificationsCopy>> = {
  ar: {
    eyebrow: 'مساحة المزوّد', title: 'الإشعارات', description: 'تابع تحديثات الحساب والطلبات المرتبطة بعملك.', listLabel: 'إشعارات المزوّد', unreadCount: 'إشعار غير مقروء', markAll: 'تحديد الكل كمقروء', markingAll: 'جارٍ التحديث…', tabs: { all: 'الكل', unread: 'غير مقروء' }, unreadLabel: 'غير مقروء', markRead: 'تحديد كمقروء', openLink: 'فتح التفاصيل', previous: 'الصفحة السابقة', next: 'الصفحة التالية', pagination: 'صفحات الإشعارات',
    empty: { all: { title: 'لا توجد إشعارات', body: 'ستظهر التحديثات الخاصة بحسابك هنا عند توفرها.' }, unread: { title: 'لا توجد إشعارات غير مقروءة', body: 'تمت قراءة كل الإشعارات المتاحة لحسابك.' } },
    states: { loading: { title: 'جارٍ تحميل الإشعارات', body: 'يتم جلب إشعارات حساب المزوّد.' }, empty: { title: 'لا توجد إشعارات متاحة', body: 'لا توجد تحديثات مرتبطة بحسابك في الوقت الحالي.' }, retry: { title: 'تعذر تحميل الإشعارات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, error: { title: 'الإشعارات غير متاحة', body: 'تعذر قراءة إشعارات حسابك الآن.' }, permission: { title: 'يلزم تسجيل الدخول', body: 'الإشعارات متاحة لحساب مزوّد موثّق فقط.' } },
    mutation: { markedRead: 'تم تحديد الإشعار كمقروء.', markedAll: 'تم تحديث الإشعارات غير المقروءة.', notFound: 'لم يعد هذا الإشعار متاحًا لحسابك.', permission: 'انتهت صلاحية الجلسة. سجّل الدخول وحاول مرة أخرى.', error: 'تعذر تحديث الإشعار. حاول مرة أخرى.' },
    typeLabels: { 'viewing.reminder': 'تذكير بموعد معاينة', 'request.updated': 'تحديث على طلب', 'property.updated': 'تحديث على عقار', 'profile.updated': 'تحديث الملف' }, retry: 'إعادة المحاولة'
  },
  en: {
    eyebrow: 'Provider workspace', title: 'Notifications', description: 'Keep up with account and request updates connected to your work.', listLabel: 'Provider notifications', unreadCount: 'unread notification', markAll: 'Mark all as read', markingAll: 'Updating…', tabs: { all: 'All', unread: 'Unread' }, unreadLabel: 'Unread', markRead: 'Mark as read', openLink: 'Open details', previous: 'Previous page', next: 'Next page', pagination: 'Notification pages',
    empty: { all: { title: 'No notifications', body: 'Updates connected to your account will appear here.' }, unread: { title: 'No unread notifications', body: 'You have read all notifications currently available to your account.' } },
    states: { loading: { title: 'Loading notifications', body: 'Your provider notifications are being retrieved.' }, empty: { title: 'No notifications available', body: 'There are no account updates available right now.' }, retry: { title: 'Notifications could not load', body: 'Check the connection and try again.' }, error: { title: 'Notifications are unavailable', body: 'Your provider notifications could not be read right now.' }, permission: { title: 'Sign-in required', body: 'Notifications are available only to a verified provider account.' } },
    mutation: { markedRead: 'Notification marked as read.', markedAll: 'Unread notifications were updated.', notFound: 'This notification is no longer available to your account.', permission: 'Your session has expired. Sign in and try again.', error: 'The notification could not be updated. Try again.' },
    typeLabels: { 'viewing.reminder': 'Viewing reminder', 'request.updated': 'Request update', 'property.updated': 'Property update', 'profile.updated': 'Profile update' }, retry: 'Retry'
  },
  'zh-CN': {
    eyebrow: '提供方工作区', title: '通知', description: '查看与您的账户和工作相关的更新。', listLabel: '提供方通知', unreadCount: '条未读通知', markAll: '全部标为已读', markingAll: '正在更新…', tabs: { all: '全部', unread: '未读' }, unreadLabel: '未读', markRead: '标为已读', openLink: '打开详情', previous: '上一页', next: '下一页', pagination: '通知分页',
    empty: { all: { title: '暂无通知', body: '账户相关更新将在此处显示。' }, unread: { title: '暂无未读通知', body: '当前账户中的通知均已读。' } },
    states: { loading: { title: '正在加载通知', body: '正在获取提供方通知。' }, empty: { title: '暂无可用通知', body: '当前没有账户更新。' }, retry: { title: '无法加载通知', body: '请检查连接后重试。' }, error: { title: '通知不可用', body: '暂时无法读取提供方通知。' }, permission: { title: '需要登录', body: '只有已验证的提供方账户可以查看通知。' } },
    mutation: { markedRead: '通知已标为已读。', markedAll: '未读通知已更新。', notFound: '此通知已不再对您的账户可用。', permission: '会话已过期，请登录后重试。', error: '无法更新通知，请重试。' },
    typeLabels: { 'viewing.reminder': '看房提醒', 'request.updated': '请求更新', 'property.updated': '房产更新', 'profile.updated': '资料更新' }, retry: '重试'
  }
};

export function getProviderNotificationsCopy(locale: SupportedLocale): ProviderNotificationsCopy {
  return copy[locale];
}
