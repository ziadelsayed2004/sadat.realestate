import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface SeekerProfileCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly tabs: Readonly<Record<'preferences' | 'profile' | 'settings', string>>;
  readonly profile: {
    readonly heading: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
    readonly language: string;
    readonly save: string;
    readonly saved: string;
  };
  readonly preferences: {
    readonly heading: string;
    readonly purpose: string;
    readonly anyPurpose: string;
    readonly buy: string;
    readonly rent: string;
    readonly propertyTypes: string;
    readonly propertyTypesHelp: string;
    readonly locations: string;
    readonly locationsHelp: string;
    readonly minPrice: string;
    readonly maxPrice: string;
    readonly bedroomsMin: string;
    readonly bedroomsMax: string;
    readonly save: string;
    readonly saved: string;
    readonly noSavedPreferences: string;
    readonly invalid: string;
  };
  readonly settings: {
    readonly heading: string;
    readonly languageHeading: string;
    readonly languageBody: string;
    readonly securityHeading: string;
    readonly securityBody: string;
    readonly unavailable: string;
    readonly notificationHeading: string;
    readonly notificationBody: string;
    readonly sessionsHeading: string;
    readonly sessionsBody: string;
    readonly signOut: string;
    readonly signedOut: string;
    readonly accountHeading: string;
    readonly accountBody: string;
    readonly deleteAccount: string;
  };
  readonly states: Readonly<Record<'loading' | 'retry' | 'error' | 'permission', { readonly title: string; readonly body: string }>>;
  readonly retry: string;
  readonly validation: string;
  readonly unavailable: string;
  readonly saving: string;
}

const copy: Readonly<Record<SupportedLocale, SeekerProfileCopy>> = {
  ar: {
    eyebrow: 'مساحة الباحث عن عقار',
    title: 'الملف الشخصي والتفضيلات',
    description: 'أدر بياناتك الشخصية وتفضيلات البحث وإعدادات حسابك.',
    tabs: { preferences: 'تفضيلات البحث', profile: 'المعلومات الشخصية', settings: 'إعدادات الحساب' },
    profile: {
      heading: 'المعلومات الشخصية', firstName: 'الاسم الأول', lastName: 'اسم العائلة', phone: 'رقم الهاتف', language: 'اللغة المفضلة', save: 'حفظ التغييرات', saved: 'تم حفظ البيانات الشخصية.'
    },
    preferences: {
      heading: 'تفضيلات البحث', purpose: 'نوع العملية', anyPurpose: 'شراء أو إيجار', buy: 'شراء', rent: 'إيجار', propertyTypes: 'أنواع العقارات', propertyTypesHelp: 'اكتب القيم مفصولة بفواصل.', locations: 'المناطق المفضلة', locationsHelp: 'اكتب المعرفات أو القيم المعتمدة مفصولة بفواصل.', minPrice: 'الحد الأدنى للسعر', maxPrice: 'الحد الأقصى للسعر', bedroomsMin: 'الحد الأدنى لغرف النوم', bedroomsMax: 'الحد الأقصى لغرف النوم', save: 'حفظ التفضيلات', saved: 'تم حفظ تفضيلات البحث.', noSavedPreferences: 'لم تحفظ تفضيلات بحث بعد. يمكنك البدء من الحقول أدناه.', invalid: 'راجع القيم المدخلة وتأكد من صحة النطاقات.'
    },
    settings: {
      heading: 'إعدادات الحساب', languageHeading: 'لغة الحساب', languageBody: 'تُحفظ اللغة على حسابك وتُستخدم في الواجهات التالية.', securityHeading: 'الأمان والوصول', securityBody: 'تغيير كلمة المرور وإدارة الأجهزة تحتاج إلى عمليات API غير متاحة على هذا السطح بعد.', unavailable: 'هذه الوظيفة غير متاحة حالياً وفق العقود المنفذة.', notificationHeading: 'إعدادات الإشعارات', notificationBody: 'خيارات الإشعارات التفصيلية تحتاج إلى عقد إعدادات منفصل.', sessionsHeading: 'الأجهزة الأخرى', sessionsBody: 'إدارة الجلسات الأخرى غير متاحة حتى يتم تنفيذ عقد الجلسات.', signOut: 'تسجيل الخروج', signedOut: 'تم تسجيل الخروج من الحساب.', accountHeading: 'الحساب', accountBody: 'حذف الحساب إجراء غير قابل للتراجع ويتطلب عقداً صريحاً غير متاح.', deleteAccount: 'حذف الحساب نهائياً'
    },
    states: {
      loading: { title: 'جارٍ تحميل الملف الشخصي', body: 'يتم جلب بياناتك من الحساب الموثق.' },
      retry: { title: 'تعذر تحميل بيانات الحساب', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      error: { title: 'بيانات الحساب غير متاحة', body: 'تعذر قراءة البيانات. حاول مرة أخرى لاحقاً.' },
      permission: { title: 'يلزم تسجيل الدخول', body: 'هذه البيانات متاحة لحساب الباحث الموثق فقط.' }
    },
    retry: 'إعادة المحاولة', validation: 'راجع الحقول المطلوبة والقيم غير الصحيحة.', unavailable: 'غير متاح', saving: 'جارٍ الحفظ...'
  },
  en: {
    eyebrow: 'Seeker workspace',
    title: 'Profile and preferences',
    description: 'Manage your personal data, search preferences, and account settings.',
    tabs: { preferences: 'Search preferences', profile: 'Personal information', settings: 'Account settings' },
    profile: {
      heading: 'Personal information', firstName: 'First name', lastName: 'Last name', phone: 'Phone number', language: 'Preferred language', save: 'Save changes', saved: 'Personal information saved.'
    },
    preferences: {
      heading: 'Search preferences', purpose: 'Transaction purpose', anyPurpose: 'Buy or rent', buy: 'Buy', rent: 'Rent', propertyTypes: 'Property types', propertyTypesHelp: 'Enter values separated by commas.', locations: 'Preferred locations', locationsHelp: 'Enter approved identifiers or values separated by commas.', minPrice: 'Minimum price', maxPrice: 'Maximum price', bedroomsMin: 'Minimum bedrooms', bedroomsMax: 'Maximum bedrooms', save: 'Save preferences', saved: 'Search preferences saved.', noSavedPreferences: 'No search preferences are saved yet. Start with the fields below.', invalid: 'Review the entered values and make sure each range is valid.'
    },
    settings: {
      heading: 'Account settings', languageHeading: 'Account language', languageBody: 'The language is saved to your account and used by subsequent surfaces.', securityHeading: 'Security and access', securityBody: 'Password changes and device management require API operations that are not implemented on this surface yet.', unavailable: 'This feature is currently unavailable under the implemented contracts.', notificationHeading: 'Notification settings', notificationBody: 'Detailed notification choices require a separate settings contract.', sessionsHeading: 'Other devices', sessionsBody: 'Other-session management is unavailable until the sessions contract is implemented.', signOut: 'Sign out', signedOut: 'You have been signed out.', accountHeading: 'Account', accountBody: 'Account deletion is irreversible and requires an explicit contract that is not implemented.', deleteAccount: 'Delete account permanently'
    },
    states: {
      loading: { title: 'Loading profile', body: 'Your verified account data is being retrieved.' },
      retry: { title: 'The account data could not load', body: 'Check the connection and try again.' },
      error: { title: 'Account data is unavailable', body: 'The data could not be read. Try again later.' },
      permission: { title: 'Sign-in required', body: 'This data is available only to a verified seeker account.' }
    },
    retry: 'Retry', validation: 'Review the required fields and invalid values.', unavailable: 'Unavailable', saving: 'Saving...'
  },
  'zh-CN': {
    eyebrow: '购房者工作区',
    title: '个人资料与偏好',
    description: '管理个人信息、找房偏好和账户设置。',
    tabs: { preferences: '找房偏好', profile: '个人信息', settings: '账户设置' },
    profile: {
      heading: '个人信息', firstName: '名字', lastName: '姓氏', phone: '电话号码', language: '首选语言', save: '保存更改', saved: '个人信息已保存。'
    },
    preferences: {
      heading: '找房偏好', purpose: '交易目的', anyPurpose: '买房或租房', buy: '买房', rent: '租房', propertyTypes: '房产类型', propertyTypesHelp: '请输入以逗号分隔的值。', locations: '偏好区域', locationsHelp: '请输入以逗号分隔的已批准标识或值。', minPrice: '最低价格', maxPrice: '最高价格', bedroomsMin: '最少卧室数', bedroomsMax: '最多卧室数', save: '保存偏好', saved: '找房偏好已保存。', noSavedPreferences: '尚未保存找房偏好。请从下方字段开始设置。', invalid: '请检查输入值并确认每个范围有效。'
    },
    settings: {
      heading: '账户设置', languageHeading: '账户语言', languageBody: '语言会保存到你的账户，并用于后续页面。', securityHeading: '安全与访问', securityBody: '密码修改和设备管理需要当前页面尚未实现的 API 操作。', unavailable: '根据当前已实现的合同，此功能暂不可用。', notificationHeading: '通知设置', notificationBody: '详细通知选项需要单独的设置合同。', sessionsHeading: '其他设备', sessionsBody: '会话合同实现前，其他会话管理暂不可用。', signOut: '退出登录', signedOut: '你已退出登录。', accountHeading: '账户', accountBody: '删除账户不可撤销，需要当前尚未实现的明确合同。', deleteAccount: '永久删除账户'
    },
    states: {
      loading: { title: '正在加载个人资料', body: '正在获取已验证账户数据。' },
      retry: { title: '无法加载账户数据', body: '请检查连接后重试。' },
      error: { title: '账户数据不可用', body: '无法读取数据，请稍后重试。' },
      permission: { title: '需要登录', body: '只有已验证的购房者账户才能查看这些数据。' }
    },
    retry: '重试', validation: '请检查必填字段和无效值。', unavailable: '不可用', saving: '正在保存...'
  }
};

export function getSeekerProfileCopy(locale: SupportedLocale): SeekerProfileCopy {
  return copy[locale];
}
