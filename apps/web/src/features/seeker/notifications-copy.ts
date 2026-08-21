import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface SeekerNotificationsCopy {
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
  readonly markedRead: string;
  readonly openLink: string;
  readonly previous: string;
  readonly next: string;
  readonly pagination: string;
  readonly empty: { readonly all: { readonly title: string; readonly body: string }; readonly unread: { readonly title: string; readonly body: string } };
  readonly states: {
    readonly loading: { readonly title: string; readonly body: string };
    readonly retry: { readonly title: string; readonly body: string };
    readonly error: { readonly title: string; readonly body: string };
    readonly permission: { readonly title: string; readonly body: string };
  };
  readonly mutation: {
    readonly markedRead: string;
    readonly markedAll: string;
    readonly notFound: string;
    readonly permission: string;
    readonly error: string;
  };
  readonly typeLabels: Readonly<Record<string, string>>;
  readonly retry: string;
}

const copy: Readonly<Record<SupportedLocale, SeekerNotificationsCopy>> = {
  ar: {
    eyebrow: 'مساحة الباحث عن عقار',
    title: 'الإشعارات',
    description: 'تابع آخر التحديثات المرتبطة بحسابك وطلباتك.',
    listLabel: 'إشعارات الحساب',
    unreadCount: 'إشعار غير مقروء',
    markAll: 'تعليم الكل كمقروء',
    markingAll: 'جارٍ التعليم كمقروء…',
    tabs: { all: 'الكل', unread: 'غير مقروء' },
    unreadLabel: 'غير مقروء',
    markRead: 'تعليم كمقروء',
    markedRead: 'تم تعليم الإشعار كمقروء.',
    openLink: 'فتح التفاصيل',
    previous: 'الصفحة السابقة',
    next: 'الصفحة التالية',
    pagination: 'صفحات الإشعارات',
    empty: {
      all: { title: 'لا توجد إشعارات', body: 'ستظهر التحديثات المرتبطة بحسابك هنا.' },
      unread: { title: 'لا توجد إشعارات غير مقروءة', body: 'لقد قرأت كل التحديثات المتاحة لحسابك.' }
    },
    states: {
      loading: { title: 'جارٍ تحميل الإشعارات', body: 'يتم جلب إشعارات حسابك من المنصة.' },
      retry: { title: 'تعذر تحميل الإشعارات', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      error: { title: 'الإشعارات غير متاحة', body: 'تعذر قراءة إشعارات حسابك حالياً. حاول لاحقاً.' },
      permission: { title: 'يلزم تسجيل الدخول', body: 'الإشعارات متاحة لحساب الباحث الموثق فقط.' }
    },
    mutation: {
      markedRead: 'تم تعليم الإشعار كمقروء.',
      markedAll: 'تم تحديث الإشعارات غير المقروءة.',
      notFound: 'لم يعد هذا الإشعار متاحاً لحسابك.',
      permission: 'انتهت صلاحية الجلسة. سجّل الدخول وحاول مرة أخرى.',
      error: 'تعذر تحديث الإشعار. حاول مرة أخرى.'
    },
    typeLabels: {
      'viewing.reminder': 'تذكير بموعد معاينة',
      'request.updated': 'تحديث على طلب',
      'community.reply': 'رد على منشور',
      'property.saved': 'تحديث على عقار محفوظ',
      'profile.updated': 'تحديث الملف الشخصي'
    },
    retry: 'إعادة المحاولة'
  },
  en: {
    eyebrow: 'Seeker workspace',
    title: 'Notifications',
    description: 'Keep up with updates connected to your account and requests.',
    listLabel: 'Account notifications',
    unreadCount: 'unread notification',
    markAll: 'Mark all as read',
    markingAll: 'Marking as read…',
    tabs: { all: 'All', unread: 'Unread' },
    unreadLabel: 'Unread',
    markRead: 'Mark as read',
    markedRead: 'Notification marked as read.',
    openLink: 'Open details',
    previous: 'Previous page',
    next: 'Next page',
    pagination: 'Notification pages',
    empty: {
      all: { title: 'No notifications', body: 'Updates connected to your account will appear here.' },
      unread: { title: 'No unread notifications', body: 'You have read all notifications currently available to your account.' }
    },
    states: {
      loading: { title: 'Loading notifications', body: 'Your account notifications are being retrieved from the platform.' },
      retry: { title: 'Notifications could not load', body: 'Check the connection and try again.' },
      error: { title: 'Notifications are unavailable', body: 'Your account notifications could not be read. Try again later.' },
      permission: { title: 'Sign-in required', body: 'Notifications are available only to a verified seeker account.' }
    },
    mutation: {
      markedRead: 'Notification marked as read.',
      markedAll: 'Unread notifications were updated.',
      notFound: 'This notification is no longer available to your account.',
      permission: 'Your session has expired. Sign in and try again.',
      error: 'The notification could not be updated. Try again.'
    },
    typeLabels: {
      'viewing.reminder': 'Viewing reminder',
      'request.updated': 'Request update',
      'community.reply': 'Community reply',
      'property.saved': 'Saved property update',
      'profile.updated': 'Profile update'
    },
    retry: 'Retry'
  },
  'zh-CN': {
    eyebrow: '求购者工作区',
    title: '通知',
    description: '查看与你的账户和请求相关的最新更新。',
    listLabel: '账户通知',
    unreadCount: '条未读通知',
    markAll: '全部标记为已读',
    markingAll: '正在标记为已读…',
    tabs: { all: '全部', unread: '未读' },
    unreadLabel: '未读',
    markRead: '标记为已读',
    markedRead: '通知已标记为已读。',
    openLink: '打开详情',
    previous: '上一页',
    next: '下一页',
    pagination: '通知分页',
    empty: {
      all: { title: '暂无通知', body: '与你的账户相关的更新会显示在这里。' },
      unread: { title: '暂无未读通知', body: '你已读完当前账户可用的所有通知。' }
    },
    states: {
      loading: { title: '正在加载通知', body: '正在从平台获取你的账户通知。' },
      retry: { title: '无法加载通知', body: '请检查连接后重试。' },
      error: { title: '通知暂不可用', body: '无法读取账户通知，请稍后重试。' },
      permission: { title: '需要登录', body: '只有已验证的求购者账户才能查看通知。' }
    },
    mutation: {
      markedRead: '通知已标记为已读。',
      markedAll: '未读通知已更新。',
      notFound: '该通知已不再对你的账户可用。',
      permission: '会话已过期，请登录后重试。',
      error: '无法更新通知，请重试。'
    },
    typeLabels: {
      'viewing.reminder': '看房提醒',
      'request.updated': '请求更新',
      'community.reply': '社区回复',
      'property.saved': '已保存房产更新',
      'profile.updated': '个人资料更新'
    },
    retry: '重试'
  }
};

export function getSeekerNotificationsCopy(locale: SupportedLocale): SeekerNotificationsCopy {
  return copy[locale];
}
