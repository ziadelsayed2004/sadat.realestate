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
  },};

export function getProviderNotificationsCopy(locale: SupportedLocale): ProviderNotificationsCopy {
  return copy[locale];
}
