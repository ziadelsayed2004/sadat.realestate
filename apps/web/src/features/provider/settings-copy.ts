import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderSettingsCopy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly tabs: { readonly account: string; readonly contact: string; readonly security: string };
  readonly account: { readonly heading: string; readonly email: string; readonly legalNotice: string; readonly saveEmail: string };
  readonly contact: { readonly heading: string; readonly whatsapp: string; readonly address: string; readonly website: string; readonly save: string };
  readonly security: { readonly heading: string; readonly password: string; readonly current: string; readonly next: string; readonly confirm: string; readonly update: string; readonly deleteHeading: string; readonly deleteBody: string; readonly deleteAction: string; readonly unavailable: string };
  readonly states: { readonly loading: { readonly title: string; readonly body: string }; readonly empty: { readonly title: string; readonly body: string }; readonly retry: { readonly title: string; readonly body: string }; readonly error: { readonly title: string; readonly body: string }; readonly permission: { readonly title: string; readonly body: string } };
  readonly feedback: { readonly saved: string; readonly validation: string; readonly conflict: string; readonly permission: string; readonly error: string };
  readonly retry: string;
  readonly unavailable: string;
};

const copy: Readonly<Record<SupportedLocale, ProviderSettingsCopy>> = {
  ar: {
    eyebrow: 'مساحة المزوّد', title: 'الإعدادات', description: 'راجع بيانات الحساب وتواصل معنا من خلال البيانات المسموح بها.', tabs: { account: 'بيانات الحساب', contact: 'بيانات التواصل', security: 'الأمان' },
    account: { heading: 'بيانات الحساب', email: 'البريد الإلكتروني', legalNotice: 'لا يمكن تغيير البيانات التجارية أو القانونية من هذه الصفحة.', saveEmail: 'حفظ البريد الإلكتروني' },
    contact: { heading: 'بيانات التواصل', whatsapp: 'واتساب', address: 'عنوان المكتب', website: 'الموقع الإلكتروني', save: 'حفظ بيانات التواصل' },
    security: { heading: 'الأمان', password: 'تغيير كلمة المرور', current: 'كلمة المرور الحالية', next: 'كلمة المرور الجديدة', confirm: 'تأكيد كلمة المرور', update: 'تحديث كلمة المرور', deleteHeading: 'طلب حذف الحساب', deleteBody: 'طلب حذف الحساب غير متاح من خلال هذه الواجهة حاليًا.', deleteAction: 'طلب حذف الحساب', unavailable: 'غير متاح حاليًا' },
    states: { loading: { title: 'جارٍ تحميل الإعدادات', body: 'يتم جلب بيانات إعدادات المزوّد.' }, empty: { title: 'الإعدادات غير متاحة', body: 'لا توجد بيانات إعدادات قابلة للعرض لهذا الحساب.' }, retry: { title: 'تعذر تحميل الإعدادات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, error: { title: 'الإعدادات غير متاحة', body: 'تعذر قراءة إعدادات حسابك الآن.' }, permission: { title: 'يلزم تسجيل الدخول', body: 'الإعدادات متاحة لحساب مزوّد موثّق فقط.' } },
    feedback: { saved: 'تم حفظ البيانات بنجاح.', validation: 'راجع الحقول وأدخل بيانات صحيحة.', conflict: 'تغيرت البيانات. أعد التحميل ثم حاول مرة أخرى.', permission: 'انتهت صلاحية الجلسة. سجّل الدخول وحاول مرة أخرى.', error: 'تعذر حفظ البيانات. حاول مرة أخرى.' }, retry: 'إعادة المحاولة', unavailable: 'غير متاح'
  },
  en: {
    eyebrow: 'Provider workspace', title: 'Settings', description: 'Review account details and update the contact fields available to your account.', tabs: { account: 'Account data', contact: 'Contact data', security: 'Security' },
    account: { heading: 'Account data', email: 'Email address', legalNotice: 'Commercial and legal data cannot be changed from this page.', saveEmail: 'Save email address' },
    contact: { heading: 'Contact data', whatsapp: 'WhatsApp number', address: 'Office address', website: 'Website', save: 'Save contact data' },
    security: { heading: 'Security', password: 'Change password', current: 'Current password', next: 'New password', confirm: 'Confirm password', update: 'Update password', deleteHeading: 'Account deletion request', deleteBody: 'Account deletion requests are not available from this interface yet.', deleteAction: 'Request account deletion', unavailable: 'Currently unavailable' },
    states: { loading: { title: 'Loading settings', body: 'Your provider settings are being retrieved.' }, empty: { title: 'Settings unavailable', body: 'No settings data is available for this account.' }, retry: { title: 'Settings could not load', body: 'Check the connection and try again.' }, error: { title: 'Settings are unavailable', body: 'Your settings could not be read right now.' }, permission: { title: 'Sign-in required', body: 'Settings are available only to a verified provider account.' } },
    feedback: { saved: 'Settings saved successfully.', validation: 'Review the fields and enter valid values.', conflict: 'The data changed. Reload it and try again.', permission: 'Your session has expired. Sign in and try again.', error: 'The settings could not be saved. Try again.' }, retry: 'Retry', unavailable: 'Unavailable'
  },};

export function getProviderSettingsCopy(locale: SupportedLocale): ProviderSettingsCopy {
  return copy[locale];
}
