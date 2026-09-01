import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderAccountCopy {
  readonly title: string;
  readonly description: string;
  readonly stepLabel: string;
  readonly providerTypeLabel: string;
  readonly accountOwnerFullNameLabel: string;
  readonly accountOwnerFullNamePlaceholder: string;
  readonly displayNameLabel: string;
  readonly displayNamePlaceholder: string;
  readonly emailLabel: string;
  readonly emailPlaceholder: string;
  readonly whatsappLabel: string;
  readonly secondaryPhoneLabel: string;
  readonly secondaryPhonePlaceholder: string;
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
    accountOwnerFullNameLabel: 'الاسم الكامل لصاحب الحساب',
    accountOwnerFullNamePlaceholder: 'اكتب الاسم كما يظهر في مستندات الهوية',
    displayNameLabel: 'اسم مقدم العقار أو العلامة التجارية',
    displayNamePlaceholder: 'الاسم الذي سيظهر في ملف مقدم العقار',
    emailLabel: 'البريد الإلكتروني للتواصل',
    emailPlaceholder: 'name@example.com',
    whatsappLabel: 'رقم واتساب',
    secondaryPhoneLabel: 'رقم هاتف إضافي (اختياري)',
    secondaryPhonePlaceholder: '+20 100 000 0000',
    preferredLocaleLabel: 'اللغة المفضلة',
    localeOptions: { ar: 'العربية', en: 'الإنجليزية',},
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
    invalidRegistrationBody: 'أعد التحقق من البريد الإلكتروني قبل إنشاء طلب مقدم العقار.',
    duplicateRegistrationTitle: 'يوجد طلب مقدم عقار بالفعل',
    duplicateRegistrationBody: 'استخدم جلسة مقدم العقار الحالية لاستكمال الطلب بدل إنشاء طلب آخر.',
    unsupportedFieldNote: 'يعتمد تسجيل الدخول على البريد الإلكتروني الموثق. لا نطلب كلمة مرور في هذا المسار.',
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
    accountOwnerFullNameLabel: 'Account owner full name',
    accountOwnerFullNamePlaceholder: 'Use the name shown on identity documents',
    displayNameLabel: 'Provider or brand name',
    displayNamePlaceholder: 'Name shown on the provider profile',
    emailLabel: 'Contact email',
    emailPlaceholder: 'name@example.com',
    whatsappLabel: 'WhatsApp number',
    secondaryPhoneLabel: 'Secondary phone (optional)',
    secondaryPhonePlaceholder: '+20 100 000 0000',
    preferredLocaleLabel: 'Preferred language',
    localeOptions: { ar: 'Arabic', en: 'English',},
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
    invalidRegistrationBody: 'Verify the email address again before creating a provider application.',
    duplicateRegistrationTitle: 'Provider application already exists',
    duplicateRegistrationBody: 'Use the existing provider session to continue instead of creating another application.',
    unsupportedFieldNote: 'Provider sign-in uses the verified email address. No password is requested in this flow.',
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
  },};

export function getProviderAccountCopy(locale: SupportedLocale): ProviderAccountCopy {
  return copyByLocale[locale];
}
