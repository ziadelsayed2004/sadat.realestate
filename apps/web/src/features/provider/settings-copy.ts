import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderSettingsCopy = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly tabs: { readonly account: string; readonly contact: string; readonly security: string };
  readonly account: { readonly heading: string; readonly email: string; readonly phone: string; readonly legalNotice: string; readonly saveEmail: string };
  readonly contact: { readonly heading: string; readonly phone: string; readonly whatsapp: string; readonly address: string; readonly website: string; readonly save: string };
  readonly security: { readonly heading: string; readonly password: string; readonly current: string; readonly next: string; readonly confirm: string; readonly update: string; readonly deleteHeading: string; readonly deleteBody: string; readonly deleteAction: string; readonly unavailable: string };
  readonly states: { readonly loading: { readonly title: string; readonly body: string }; readonly empty: { readonly title: string; readonly body: string }; readonly retry: { readonly title: string; readonly body: string }; readonly error: { readonly title: string; readonly body: string }; readonly permission: { readonly title: string; readonly body: string } };
  readonly feedback: { readonly saved: string; readonly validation: string; readonly conflict: string; readonly permission: string; readonly error: string };
  readonly retry: string;
  readonly unavailable: string;
};

const copy: Readonly<Record<SupportedLocale, ProviderSettingsCopy>> = {
  ar: {
    eyebrow: 'مساحة المزوّد', title: 'الإعدادات', description: 'راجع بيانات الحساب وتواصل معنا من خلال البيانات المسموح بها.', tabs: { account: 'بيانات الحساب', contact: 'بيانات التواصل', security: 'الأمان' },
    account: { heading: 'بيانات الحساب', email: 'البريد الإلكتروني', phone: 'رقم الهاتف', legalNotice: 'لا يمكن تغيير البيانات التجارية أو القانونية من هذه الصفحة.', saveEmail: 'حفظ البريد الإلكتروني' },
    contact: { heading: 'بيانات التواصل', phone: 'رقم الهاتف', whatsapp: 'واتساب', address: 'عنوان المكتب', website: 'الموقع الإلكتروني', save: 'حفظ بيانات التواصل' },
    security: { heading: 'الأمان', password: 'تغيير كلمة المرور', current: 'كلمة المرور الحالية', next: 'كلمة المرور الجديدة', confirm: 'تأكيد كلمة المرور', update: 'تحديث كلمة المرور', deleteHeading: 'طلب حذف الحساب', deleteBody: 'طلب حذف الحساب غير متاح من خلال هذه الواجهة حاليًا.', deleteAction: 'طلب حذف الحساب', unavailable: 'غير متاح حاليًا' },
    states: { loading: { title: 'جارٍ تحميل الإعدادات', body: 'يتم جلب بيانات إعدادات المزوّد.' }, empty: { title: 'الإعدادات غير متاحة', body: 'لا توجد بيانات إعدادات قابلة للعرض لهذا الحساب.' }, retry: { title: 'تعذر تحميل الإعدادات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, error: { title: 'الإعدادات غير متاحة', body: 'تعذر قراءة إعدادات حسابك الآن.' }, permission: { title: 'يلزم تسجيل الدخول', body: 'الإعدادات متاحة لحساب مزوّد موثّق فقط.' } },
    feedback: { saved: 'تم حفظ البيانات بنجاح.', validation: 'راجع الحقول وأدخل بيانات صحيحة.', conflict: 'تغيرت البيانات. أعد التحميل ثم حاول مرة أخرى.', permission: 'انتهت صلاحية الجلسة. سجّل الدخول وحاول مرة أخرى.', error: 'تعذر حفظ البيانات. حاول مرة أخرى.' }, retry: 'إعادة المحاولة', unavailable: 'غير متاح'
  },
  en: {
    eyebrow: 'Provider workspace', title: 'Settings', description: 'Review account details and update the contact fields available to your account.', tabs: { account: 'Account data', contact: 'Contact data', security: 'Security' },
    account: { heading: 'Account data', email: 'Email address', phone: 'Phone number', legalNotice: 'Commercial and legal data cannot be changed from this page.', saveEmail: 'Save email address' },
    contact: { heading: 'Contact data', phone: 'Phone number', whatsapp: 'WhatsApp number', address: 'Office address', website: 'Website', save: 'Save contact data' },
    security: { heading: 'Security', password: 'Change password', current: 'Current password', next: 'New password', confirm: 'Confirm password', update: 'Update password', deleteHeading: 'Account deletion request', deleteBody: 'Account deletion requests are not available from this interface yet.', deleteAction: 'Request account deletion', unavailable: 'Currently unavailable' },
    states: { loading: { title: 'Loading settings', body: 'Your provider settings are being retrieved.' }, empty: { title: 'Settings unavailable', body: 'No settings data is available for this account.' }, retry: { title: 'Settings could not load', body: 'Check the connection and try again.' }, error: { title: 'Settings are unavailable', body: 'Your settings could not be read right now.' }, permission: { title: 'Sign-in required', body: 'Settings are available only to a verified provider account.' } },
    feedback: { saved: 'Settings saved successfully.', validation: 'Review the fields and enter valid values.', conflict: 'The data changed. Reload it and try again.', permission: 'Your session has expired. Sign in and try again.', error: 'The settings could not be saved. Try again.' }, retry: 'Retry', unavailable: 'Unavailable'
  },
  'zh-CN': {
    eyebrow: '提供方工作区', title: '设置', description: '查看账户信息并更新账户允许修改的联系方式。', tabs: { account: '账户资料', contact: '联系资料', security: '安全' },
    account: { heading: '账户资料', email: '电子邮箱', phone: '电话号码', legalNotice: '商业和法律资料不能在此页面修改。', saveEmail: '保存电子邮箱' },
    contact: { heading: '联系资料', phone: '电话号码', whatsapp: 'WhatsApp', address: '办公地址', website: '网站', save: '保存联系资料' },
    security: { heading: '安全', password: '修改密码', current: '当前密码', next: '新密码', confirm: '确认密码', update: '更新密码', deleteHeading: '账户删除请求', deleteBody: '当前界面暂不支持账户删除请求。', deleteAction: '请求删除账户', unavailable: '当前不可用' },
    states: { loading: { title: '正在加载设置', body: '正在获取提供方设置。' }, empty: { title: '设置不可用', body: '此账户没有可显示的设置数据。' }, retry: { title: '无法加载设置', body: '请检查连接后重试。' }, error: { title: '设置不可用', body: '暂时无法读取您的设置。' }, permission: { title: '需要登录', body: '只有已验证的提供方账户可以查看设置。' } },
    feedback: { saved: '设置已保存。', validation: '请检查字段并输入有效值。', conflict: '数据已更改，请重新加载后重试。', permission: '会话已过期，请登录后重试。', error: '无法保存设置，请重试。' }, retry: '重试', unavailable: '不可用'
  }
};

export function getProviderSettingsCopy(locale: SupportedLocale): ProviderSettingsCopy {
  return copy[locale];
}
