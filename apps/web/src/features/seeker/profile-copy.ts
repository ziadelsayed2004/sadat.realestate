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
    readonly budgetRange: string;
    readonly minPrice: string;
    readonly maxPrice: string;
    readonly areaRange: string;
    readonly minArea: string;
    readonly maxArea: string;
    readonly bedroomsMin: string;
    readonly bedroomsMax: string;
    readonly paymentMethod: string;
    readonly cash: string;
    readonly installment: string;
    readonly anyPayment: string;
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
      heading: 'المعلومات الشخصية', firstName: 'الاسم الأول', lastName: 'اسم العائلة', language: 'اللغة المفضلة', save: 'حفظ التغييرات', saved: 'تم حفظ البيانات الشخصية.'
    },
    preferences: {
      heading: 'تفضيلات البحث', purpose: 'نوع العملية', anyPurpose: 'شراء أو إيجار', buy: 'شراء', rent: 'إيجار', propertyTypes: 'أنواع العقارات', propertyTypesHelp: 'اختر أكثر من نوع.', locations: 'المناطق المفضلة', locationsHelp: 'اختر أكثر من منطقة.', budgetRange: 'نطاق الميزانية (ج.م)', minPrice: 'من', maxPrice: 'إلى', areaRange: 'المساحة المفضلة (م²)', minArea: 'من', maxArea: 'إلى', bedroomsMin: 'عدد غرف النوم', bedroomsMax: 'الحد الأقصى لغرف النوم', paymentMethod: 'طريقة الدفع المفضلة', cash: 'كاش', installment: 'تقسيط', anyPayment: 'كلاهما', save: 'حفظ التغييرات', saved: 'تم حفظ تفضيلات البحث.', noSavedPreferences: 'لم تحفظ تفضيلات بحث بعد. يمكنك البدء من الحقول أدناه.', invalid: 'راجع القيم المدخلة وتأكد من صحة النطاقات.'
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
      heading: 'Personal information', firstName: 'First name', lastName: 'Last name', language: 'Preferred language', save: 'Save changes', saved: 'Personal information saved.'
    },
    preferences: {
      heading: 'Search preferences', purpose: 'Transaction purpose', anyPurpose: 'Buy or rent', buy: 'Buy', rent: 'Rent', propertyTypes: 'Property types', propertyTypesHelp: 'Choose more than one type.', locations: 'Preferred locations', locationsHelp: 'Choose more than one area.', budgetRange: 'Budget range (EGP)', minPrice: 'From', maxPrice: 'To', areaRange: 'Preferred area (m²)', minArea: 'From', maxArea: 'To', bedroomsMin: 'Bedrooms', bedroomsMax: 'Maximum bedrooms', paymentMethod: 'Preferred payment method', cash: 'Cash', installment: 'Installment', anyPayment: 'Both', save: 'Save changes', saved: 'Search preferences saved.', noSavedPreferences: 'No search preferences are saved yet. Start with the fields below.', invalid: 'Review the entered values and make sure each range is valid.'
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
  },};

export function getSeekerProfileCopy(locale: SupportedLocale): SeekerProfileCopy {
  return copy[locale];
}
