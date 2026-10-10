import { localizeCopy } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicPropertyDetailsCopy {
  readonly backToResults: string;
  readonly sale: string;
  readonly rent: string;
  readonly property: string;
  readonly unit: string;
  readonly code: string;
  readonly price: string;
  readonly area: string;
  readonly bedrooms: string;
  readonly bathrooms: string;
  readonly floor: string;
  readonly sqm: string;
  readonly galleryTitle: string;
  readonly imageUnavailable: string;
  readonly mediaUnavailable: string;
  readonly videoUnavailable: string;
  readonly mediaItem: (position: number) => string;
  readonly sourceTitle: string;
  readonly publishedSource: string;
  readonly sourceTypes: Readonly<Record<'individual_broker' | 'brokerage_office' | 'developer_company', string>>;
  readonly projectTitle: string;
  readonly projectUnavailable: string;
  readonly projectDescription: string;
  readonly descriptionTitle: string;
  readonly noDescription: string;
  readonly relatedTitle: string;
  readonly openMap: string;
  readonly contactTitle: string;
  readonly contactBody: string;
  readonly messageLabel: string;
  readonly messagePlaceholder: string;
  readonly submitContact: string;
  readonly requestViewing: string;
  readonly viewingTitle: string;
  readonly viewingBody: string;
  readonly requestedAt: string;
  readonly timezone: string;
  readonly timezonePlaceholder: string;
  readonly note: string;
  readonly notePlaceholder: string;
  readonly submitViewing: string;
  readonly cancel: string;
  readonly close: string;
  readonly contactValidation: string;
  readonly viewingValidation: string;
  readonly actionLoading: string;
  readonly actionSuccessTitle: string;
  readonly actionSuccessBody: string;
  readonly actionPermissionTitle: string;
  readonly actionPermissionBody: string;
  readonly actionForbiddenBody: string;
  readonly actionPermissionLink: string;
  readonly actionErrorTitle: string;
  readonly actionErrorBody: string;
  readonly retryLabel: string;
  readonly loadingTitle: string;
  readonly loadingBody: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly errorTitle: string;
  readonly errorBody: string;
  readonly retryTitle: string;
  readonly retryBody: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly permissionLink: string;
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly notFoundLink: string;
  readonly installments: string;
  readonly verified: string;
  readonly viewDeveloperProfile: string;
  readonly defaultContactMessage: string;
  readonly saveProperty: string;
  readonly propertySaved: string;
  readonly viewSavedProperties: string;
  readonly savePermission: string;
  readonly saveError: string;
  readonly fullName: string;
  readonly phoneNumber: string;
  readonly contactTime: string;
  readonly morning: string;
  readonly evening: string;
  readonly extraMessage: string;
  readonly contactWhatsapp: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, PublicPropertyDetailsCopy>> = {
  ar: {
    backToResults: 'العودة إلى النتائج',
    sale: 'بيع',
    rent: 'إيجار',
    property: 'عقار',
    unit: 'وحدة',
    code: 'الكود',
    price: 'السعر',
    area: 'المساحة',
    bedrooms: 'الغرف',
    bathrooms: 'الحمامات',
    floor: 'الدور',
    sqm: 'م²',
    galleryTitle: 'صور العقار',
    imageUnavailable: 'الصورة غير متاحة',
    mediaUnavailable: 'لا تتوفر وسائط عامة لهذا العقار حالياً.',
    videoUnavailable: 'تعذر تشغيل الفيديو. جرّب متصفحاً آخر أو تواصل للاستفسار عن العقار.' ,
    mediaItem: position => `الوسائط ${position}`,
    sourceTitle: 'مصدر هذا العقار',
    publishedSource: 'مصدر منشور معتمد',
    sourceTypes: {
      individual_broker: 'وسيط عقاري فردي',
      brokerage_office: 'مكتب وساطة عقارية',
      developer_company: 'شركة تطوير عقاري'
    },
    projectTitle: 'المشروع والمطور',
    projectUnavailable: 'لا يوجد مشروع منشور مرتبط بهذا العقار.',
    projectDescription: 'نبذة عن المشروع',
    descriptionTitle: 'وصف العقار',
    noDescription: 'لا يوجد وصف منشور لهذا العقار.',
    relatedTitle: 'عقارات مشابهة',
    openMap: 'فتح الموقع على الخريطة',
    contactTitle: 'استفسر عن هذا العقار',
    contactBody: 'أرسل طلب تواصل من خلال حساب الباحث عن عقار.',
    messageLabel: 'رسالتك',
    messagePlaceholder: 'اكتب سؤالك أو التفاصيل التي تريد معرفتها',
    submitContact: 'أرسل الطلب',
    requestViewing: 'طلب معاينة',
    viewingTitle: 'طلب معاينة العقار',
    viewingBody: 'الموعد ورقم التواصل اختياريان؛ يمكنك تركهما لتنسيق المعاينة مع الإدارة.',
    requestedAt: 'التاريخ والوقت (اختياري)',
    timezone: 'توقيت مصر (تلقائي)',
    timezonePlaceholder: 'اختر الموعد بتوقيت مصر؛ يتغير تلقائياً بين GMT+2 شتاءً وGMT+3 صيفاً.',
    note: 'ملاحظة إضافية',
    notePlaceholder: 'أي تفاصيل تساعد الفريق',
    submitViewing: 'إرسال طلب المعاينة',
    cancel: 'إلغاء',
    close: 'إغلاق',
    contactValidation: 'راجع الاسم ورقم التواصل إن أدخلته. الرسالة لا تزيد عن 2000 حرف.',
    viewingValidation: 'راجع رقم التواصل إن أدخلته، والموعد يجب أن يكون في المستقبل خلال السنة القادمة إن حددته.',
    actionLoading: 'جارٍ الإرسال',
    actionSuccessTitle: 'تم إرسال طلبك بنجاح',
    actionSuccessBody: 'تم حفظ طلبك في النظام للمراجعة.',
    actionPermissionTitle: 'يلزم تسجيل الدخول',
    actionPermissionBody: 'سجّل الدخول لإرسال الطلب.',
    actionForbiddenBody: 'حسابك لا يملك صلاحية هذا الإجراء. لم يتم تسجيل خروجك.',
    actionPermissionLink: 'تسجيل الدخول',
    actionErrorTitle: 'تعذر إرسال الطلب',
    actionErrorBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    retryLabel: 'إعادة المحاولة',
    loadingTitle: 'جارٍ تحميل تفاصيل العقار',
    loadingBody: 'يتم تجهيز البيانات المنشورة.',
    emptyTitle: 'لا توجد تفاصيل متاحة',
    emptyBody: 'لا تتوفر تفاصيل منشورة لهذا العقار حالياً.',
    errorTitle: 'تعذر تحميل تفاصيل العقار',
    errorBody: 'تحقق من الرابط والاتصال ثم حاول مرة أخرى.',
    retryTitle: 'خدمة العقار غير متاحة مؤقتاً',
    retryBody: 'يمكنك إعادة المحاولة عند توفر الاتصال.',
    permissionTitle: 'لا يمكن عرض هذه التفاصيل',
    permissionBody: 'لم يسمح الخادم بالوصول إلى تفاصيل العقار العامة.',
    permissionLink: 'العودة إلى الصفحة الرئيسية',
    notFoundTitle: 'العقار غير موجود',
    notFoundBody: 'ربما تم إخفاء العقار أو لم يعد منشوراً.',
    notFoundLink: 'تصفح العقارات',
    installments: 'تقسيط',
    verified: 'موثق',
    viewDeveloperProfile: 'عرض ملف المطور',
    defaultContactMessage: 'طلب تواصل واستفسار',
    saveProperty: 'حفظ العقار',
    propertySaved: 'تم حفظ العقار',
    viewSavedProperties: 'عرض العقارات المحفوظة',
    savePermission: 'الحفظ متاح لحساب الباحث عن عقار.',
    saveError: 'تعذر حفظ العقار. حاول مرة أخرى.',
    fullName: 'الاسم الكامل',
    phoneNumber: 'رقم الهاتف',
    contactTime: 'وقت التواصل',
    morning: 'صباحاً',
    evening: 'مساءً',
    extraMessage: 'رسالة إضافية',
    contactWhatsapp: 'تواصل عبر واتساب'
  },
  en: {
    backToResults: 'Back to results',
    sale: 'For sale',
    rent: 'For rent',
    property: 'Property',
    unit: 'Unit',
    code: 'Code',
    price: 'Price',
    area: 'Area',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    floor: 'Floor',
    sqm: 'sqm',
    galleryTitle: 'Property gallery',
    imageUnavailable: 'Image unavailable',
    mediaUnavailable: 'No public media is available for this property yet.',
    videoUnavailable: 'Unable to play this video. Try another browser or contact us about the property.',
    mediaItem: position => `Media item ${position}`,
    sourceTitle: 'Property source',
    publishedSource: 'Approved published source',
    sourceTypes: {
      individual_broker: 'Individual broker',
      brokerage_office: 'Brokerage office',
      developer_company: 'Developer company'
    },
    projectTitle: 'Project and developer',
    projectUnavailable: 'No published project is linked to this property.',
    projectDescription: 'Project overview',
    descriptionTitle: 'Property description',
    noDescription: 'No published description is available for this property.',
    relatedTitle: 'Similar properties',
    openMap: 'Open location on map',
    contactTitle: 'Ask about this property',
    contactBody: 'Send a contact request through your property-seeker account.',
    messageLabel: 'Your message',
    messagePlaceholder: 'Write your question or the details you need',
    submitContact: 'Send request',
    requestViewing: 'Request a viewing',
    viewingTitle: 'Request a property viewing',
    viewingBody: 'The appointment and contact number are optional. Leave them blank to arrange the viewing with the team.',
    requestedAt: 'Date and time (optional)',
    timezone: 'Egypt time (automatic)',
    timezonePlaceholder: 'Choose the time in Egypt: GMT+2 in winter and GMT+3 in summer, automatically.',
    note: 'Additional note',
    notePlaceholder: 'Any detail that may help the team',
    submitViewing: 'Send viewing request',
    cancel: 'Cancel',
    close: 'Close',
    contactValidation: 'Check your name and any contact number entered. The message must be no longer than 2,000 characters.',
    viewingValidation: 'Check any contact number entered. If you choose an appointment, it must be in the future within the next year.',
    actionLoading: 'Sending',
    actionSuccessTitle: 'Your request was sent successfully',
    actionSuccessBody: 'Your request was saved for review.',
    actionPermissionTitle: 'Sign-in required',
    actionPermissionBody: 'Sign in to send a request.',
    actionForbiddenBody: 'Your account cannot perform this action. You are still signed in.',
    actionPermissionLink: 'Sign in',
    actionErrorTitle: 'Request could not be sent',
    actionErrorBody: 'Check the connection and try again.',
    retryLabel: 'Retry',
    loadingTitle: 'Loading property details',
    loadingBody: 'Preparing the published property data.',
    emptyTitle: 'No property details available',
    emptyBody: 'No published details are available for this property yet.',
    errorTitle: 'Property details could not load',
    errorBody: 'Check the address and connection, then try again.',
    retryTitle: 'The property service is temporarily unavailable',
    retryBody: 'You can retry when the connection is available.',
    permissionTitle: 'These details are unavailable',
    permissionBody: 'The server did not allow access to the public property details.',
    permissionLink: 'Return to the homepage',
    notFoundTitle: 'Property not found',
    notFoundBody: 'It may have been hidden or is no longer published.',
    notFoundLink: 'Browse properties',
    installments: 'Installments',
    verified: 'Verified',
    viewDeveloperProfile: 'View developer profile',
    defaultContactMessage: 'Contact inquiry request',
    saveProperty: 'Save property',
    propertySaved: 'Property saved',
    viewSavedProperties: 'View saved properties',
    savePermission: 'Saving properties requires a seeker account.',
    saveError: 'Could not save the property. Please try again.',
    fullName: 'Full name',
    phoneNumber: 'Phone number',
    contactTime: 'Contact time',
    morning: 'Morning',
    evening: 'Evening',
    extraMessage: 'Additional message',
    contactWhatsapp: 'Contact on WhatsApp'
  },};

export function getPublicPropertyDetailsCopy(locale: SupportedLocale): PublicPropertyDetailsCopy {
  return localizeCopy('public/details-copy#getPublicPropertyDetailsCopy', locale, copyByLocale[locale]);
}
