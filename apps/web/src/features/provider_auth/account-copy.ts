import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderAccountCopy {
  readonly title: string;
  readonly description: string;
  readonly stepLabel: string;
  readonly providerTypeLabel: string;
  readonly phoneLabel: string;
  readonly verifiedPhoneNote: string;
  readonly accountOwnerFullNameLabel: string;
  readonly accountOwnerFullNamePlaceholder: string;
  readonly displayNameLabel: string;
  readonly displayNamePlaceholder: string;
  readonly emailLabel: string;
  readonly emailPlaceholder: string;
  readonly whatsappLabel: string;
  readonly secondaryPhoneLabel: string;
  readonly secondaryPhonePlaceholder: string;
  readonly samePhoneLabel: string;
  readonly preferredLocaleLabel: string;
  readonly localeOptions: Readonly<Record<SupportedLocale, string>>;
  readonly termsLabel: string;
  readonly privacyLabel: string;
  readonly requirementsTitle: string;
  readonly requirementsBody: string;
  readonly unavailableLocationBody: string;
  readonly saveDraftAction: string;
  readonly saveContinueAction: string;
  readonly savingAction: string;
  readonly retryAction: string;
  readonly backAction: string;
  readonly loadingTitle: string;
  readonly loadingBody: string;
  readonly invalidFormTitle: string;
  readonly invalidFormBody: string;
  readonly savedTitle: string;
  readonly savedBody: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly networkTitle: string;
  readonly networkBody: string;
  readonly conflictTitle: string;
  readonly conflictBody: string;
  readonly unavailableTitle: string;
  readonly unavailableBody: string;
  readonly invalidRegistrationTitle: string;
  readonly invalidRegistrationBody: string;
  readonly duplicateRegistrationTitle: string;
  readonly duplicateRegistrationBody: string;
  readonly unsupportedFieldNote: string;
  readonly missingFieldLabels: Readonly<Record<string, string>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderAccountCopy>> = {
  ar: {
    title: 'بيانات الحساب',
    description: 'أكمل بيانات الحساب الأساسية حتى نتمكن من حفظ طلب مقدم العقار بأمان.',
    stepLabel: '3 / 4',
    providerTypeLabel: 'نوع مقدم العقار',
    phoneLabel: 'رقم الهاتف الموثق',
    verifiedPhoneNote: 'يُستخدم هذا الرقم لتسجيل الدخول إلى حساب مقدم العقار ولا يمكن تغييره في هذه الخطوة.',
    accountOwnerFullNameLabel: 'الاسم الكامل لصاحب الحساب',
    accountOwnerFullNamePlaceholder: 'اكتب الاسم كما يظهر في مستندات الهوية',
    displayNameLabel: 'اسم مقدم العقار أو العلامة التجارية',
    displayNamePlaceholder: 'الاسم الذي سيظهر في ملف مقدم العقار',
    emailLabel: 'البريد الإلكتروني للتواصل',
    emailPlaceholder: 'name@example.com',
    whatsappLabel: 'رقم واتساب',
    secondaryPhoneLabel: 'رقم هاتف إضافي (اختياري)',
    secondaryPhonePlaceholder: '+20 100 000 0000',
    samePhoneLabel: 'استخدم الرقم الموثق لواتساب',
    preferredLocaleLabel: 'اللغة المفضلة',
    localeOptions: { ar: 'العربية', en: 'الإنجليزية', 'zh-CN': 'الصينية المبسطة' },
    termsLabel: 'أوافق على شروط الاستخدام',
    privacyLabel: 'أوافق على سياسة الخصوصية',
    requirementsTitle: 'بيانات إضافية مطلوبة لاحقًا',
    requirementsBody: 'يعرض الخادم الحقول المتبقية المطلوبة لكل نوع مقدم عقار. لن نعتبر الطلب مكتملًا قبل استيفائها.',
    unavailableLocationBody: 'اختيار الموقع الرئيسي ومناطق الخدمة يحتاج إلى مصدر المواقع المعتمد، وهو غير متاح لهذا السطح حاليًا. لم يتم اختلاق معرفات أو بيانات بديلة.',
    saveDraftAction: 'حفظ كمسودة',
    saveContinueAction: 'حفظ ومتابعة',
    savingAction: 'جارٍ الحفظ…',
    retryAction: 'إعادة المحاولة',
    backAction: 'العودة إلى اختيار النوع',
    loadingTitle: 'جارٍ تحميل الطلب',
    loadingBody: 'نستعيد آخر نسخة محفوظة من بيانات الحساب.',
    invalidFormTitle: 'راجع البيانات المطلوبة',
    invalidFormBody: 'أدخل القيم المطلوبة ووافق على الشروط وسياسة الخصوصية قبل الحفظ.',
    savedTitle: 'تم حفظ بيانات الحساب',
    savedBody: 'حُفظت البيانات عبر طلب مقدم العقار. يمكنك المتابعة عندما تتوفر الخطوة التالية.',
    permissionTitle: 'لا يمكن الوصول إلى هذا الطلب',
    permissionBody: 'يلزم بدء تسجيل مقدم العقار أو امتلاك جلسة مقدم العقار للوصول إلى هذه البيانات.',
    notFoundTitle: 'طلب مقدم العقار غير موجود',
    notFoundBody: 'ابدأ تسجيل مقدم العقار من جديد لإنشاء طلب آمن.',
    networkTitle: 'تعذر تحميل الطلب',
    networkBody: 'تحقق من الاتصال ثم أعد المحاولة. لم يتم عرض بيانات غير مؤكدة.',
    conflictTitle: 'تغيرت البيانات المحفوظة',
    conflictBody: 'حمّل النسخة الأحدث من الطلب ثم أعد إدخال التعديل قبل الحفظ.',
    unavailableTitle: 'لا يمكن متابعة التسجيل',
    unavailableBody: 'لم يكتمل التحقق المطلوب لإنشاء طلب مقدم العقار. ابدأ من اختيار النوع.',
    invalidRegistrationTitle: 'انتهت صلاحية التحقق',
    invalidRegistrationBody: 'أعد التحقق من رقم الهاتف قبل إنشاء طلب مقدم العقار.',
    duplicateRegistrationTitle: 'يوجد طلب مقدم عقار بالفعل',
    duplicateRegistrationBody: 'استخدم جلسة مقدم العقار الحالية لاستكمال الطلب بدل إنشاء طلب آخر.',
    unsupportedFieldNote: 'يعتمد تسجيل الدخول على رقم الهاتف الموثق. لا نطلب كلمة مرور لأن هذا الحقل غير موجود في العقد الحالي.',
    missingFieldLabels: {
      accountOwnerFullName: 'الاسم الكامل لصاحب الحساب',
      displayName: 'اسم مقدم العقار',
      email: 'البريد الإلكتروني',
      primaryLocationId: 'الموقع الرئيسي',
      serviceAreaIds: 'مناطق الخدمة',
      preferredLocale: 'اللغة المفضلة',
      termsAcceptedAt: 'الموافقة على الشروط',
      privacyAcceptedAt: 'الموافقة على الخصوصية'
    }
  },
  en: {
    title: 'Account details',
    description: 'Complete the core account details so your provider application can be saved safely.',
    stepLabel: '3 / 4',
    providerTypeLabel: 'Provider type',
    phoneLabel: 'Verified phone number',
    verifiedPhoneNote: 'This number is the provider sign-in identifier and cannot be changed in this step.',
    accountOwnerFullNameLabel: 'Account owner full name',
    accountOwnerFullNamePlaceholder: 'Use the name shown on identity documents',
    displayNameLabel: 'Provider or brand name',
    displayNamePlaceholder: 'Name shown on the provider profile',
    emailLabel: 'Contact email',
    emailPlaceholder: 'name@example.com',
    whatsappLabel: 'WhatsApp number',
    secondaryPhoneLabel: 'Secondary phone (optional)',
    secondaryPhonePlaceholder: '+20 100 000 0000',
    samePhoneLabel: 'Use the verified phone for WhatsApp',
    preferredLocaleLabel: 'Preferred language',
    localeOptions: { ar: 'Arabic', en: 'English', 'zh-CN': 'Simplified Chinese' },
    termsLabel: 'I agree to the Terms of Use',
    privacyLabel: 'I agree to the Privacy Policy',
    requirementsTitle: 'Additional details required later',
    requirementsBody: 'The API reports the remaining fields required for each provider type. The application is not treated as complete until they are supplied.',
    unavailableLocationBody: 'Primary location and service-area selection require the approved locations source, which is not available on this surface yet. No IDs or replacement data are fabricated.',
    saveDraftAction: 'Save draft',
    saveContinueAction: 'Save and continue',
    savingAction: 'Saving…',
    retryAction: 'Retry',
    backAction: 'Back to provider type',
    loadingTitle: 'Loading application',
    loadingBody: 'Restoring the latest saved account details.',
    invalidFormTitle: 'Review the required fields',
    invalidFormBody: 'Enter the required values and accept the terms and privacy policy before saving.',
    savedTitle: 'Account details saved',
    savedBody: 'The details were saved through the provider application API. You can continue when the next step is available.',
    permissionTitle: 'Application access unavailable',
    permissionBody: 'Start provider registration or use an authenticated provider session to access these details.',
    notFoundTitle: 'Provider application not found',
    notFoundBody: 'Restart provider registration to create a secure application.',
    networkTitle: 'Application could not be loaded',
    networkBody: 'Check your connection and retry. Unconfirmed data is never displayed.',
    conflictTitle: 'Saved data changed',
    conflictBody: 'Load the latest application version and re-enter your change before saving.',
    unavailableTitle: 'Registration cannot continue',
    unavailableBody: 'The verification required to create a provider application is not available. Start from provider type selection.',
    invalidRegistrationTitle: 'Verification expired',
    invalidRegistrationBody: 'Verify the phone number again before creating a provider application.',
    duplicateRegistrationTitle: 'Provider application already exists',
    duplicateRegistrationBody: 'Use the existing provider session to continue instead of creating another application.',
    unsupportedFieldNote: 'Provider sign-in uses the verified phone number. No password is requested because that field is not in the current contract.',
    missingFieldLabels: {
      accountOwnerFullName: 'Account owner full name',
      displayName: 'Provider name',
      email: 'Contact email',
      primaryLocationId: 'Primary location',
      serviceAreaIds: 'Service areas',
      preferredLocale: 'Preferred language',
      termsAcceptedAt: 'Terms acceptance',
      privacyAcceptedAt: 'Privacy acceptance'
    }
  },
  'zh-CN': {
    title: '账户信息',
    description: '填写核心账户信息，以便安全保存房产服务提供方申请。',
    stepLabel: '3 / 4',
    providerTypeLabel: '服务提供方类型',
    phoneLabel: '已验证的手机号',
    verifiedPhoneNote: '此号码是服务提供方登录标识，本步骤不能修改。',
    accountOwnerFullNameLabel: '账户负责人姓名',
    accountOwnerFullNamePlaceholder: '请使用身份证件上的姓名',
    displayNameLabel: '提供方或品牌名称',
    displayNamePlaceholder: '将在提供方资料中显示的名称',
    emailLabel: '联系邮箱',
    emailPlaceholder: 'name@example.com',
    whatsappLabel: 'WhatsApp 号码',
    secondaryPhoneLabel: '备用手机号（可选）',
    secondaryPhonePlaceholder: '+20 100 000 0000',
    samePhoneLabel: '将已验证手机号用于 WhatsApp',
    preferredLocaleLabel: '首选语言',
    localeOptions: { ar: '阿拉伯语', en: '英语', 'zh-CN': '简体中文' },
    termsLabel: '我同意使用条款',
    privacyLabel: '我同意隐私政策',
    requirementsTitle: '后续需要的其他信息',
    requirementsBody: 'API 会根据提供方类型返回剩余必填字段。提交这些字段前，申请不会被视为完整。',
    unavailableLocationBody: '主位置和服务区域选择需要已批准的位置数据源，目前此页面没有该来源。不会伪造 ID 或替代数据。',
    saveDraftAction: '保存草稿',
    saveContinueAction: '保存并继续',
    savingAction: '正在保存…',
    retryAction: '重试',
    backAction: '返回提供方类型',
    loadingTitle: '正在加载申请',
    loadingBody: '正在恢复最近保存的账户信息。',
    invalidFormTitle: '请检查必填项',
    invalidFormBody: '保存前请输入必填信息并同意使用条款和隐私政策。',
    savedTitle: '账户信息已保存',
    savedBody: '信息已通过提供方申请 API 保存。下一步可用后即可继续。',
    permissionTitle: '无法访问申请',
    permissionBody: '请开始提供方注册，或使用已认证的提供方会话访问这些信息。',
    notFoundTitle: '未找到提供方申请',
    notFoundBody: '重新开始提供方注册以创建安全申请。',
    networkTitle: '无法加载申请',
    networkBody: '请检查网络并重试。未经确认的信息不会显示。',
    conflictTitle: '保存的信息已变化',
    conflictBody: '请加载最新申请版本，再重新输入修改后保存。',
    unavailableTitle: '无法继续注册',
    unavailableBody: '创建提供方申请所需的验证不可用。请从类型选择开始。',
    invalidRegistrationTitle: '验证已过期',
    invalidRegistrationBody: '重新验证手机号后再创建提供方申请。',
    duplicateRegistrationTitle: '提供方申请已存在',
    duplicateRegistrationBody: '请使用现有提供方会话继续，而不是创建新的申请。',
    unsupportedFieldNote: '提供方使用已验证手机号登录。当前合同不包含密码字段，因此不会请求密码。',
    missingFieldLabels: {
      accountOwnerFullName: '账户负责人姓名',
      displayName: '提供方名称',
      email: '联系邮箱',
      primaryLocationId: '主位置',
      serviceAreaIds: '服务区域',
      preferredLocale: '首选语言',
      termsAcceptedAt: '使用条款同意',
      privacyAcceptedAt: '隐私政策同意'
    }
  }
};

export function getProviderAccountCopy(locale: SupportedLocale): ProviderAccountCopy {
  return copyByLocale[locale];
}
