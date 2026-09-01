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
    viewingBody: 'اختر الوقت المناسب وسيراجع الفريق طلبك.',
    requestedAt: 'التاريخ والوقت',
    timezone: 'المنطقة الزمنية',
    timezonePlaceholder: 'مثال: Africa/Cairo',
    note: 'ملاحظة إضافية',
    notePlaceholder: 'أي تفاصيل تساعد الفريق',
    submitViewing: 'إرسال طلب المعاينة',
    cancel: 'إلغاء',
    close: 'إغلاق',
    contactValidation: 'اكتب رسالة قبل إرسال الطلب.',
    viewingValidation: 'أدخل وقتاً مستقبلياً ومنطقة زمنية صحيحة.',
    actionLoading: 'جارٍ الإرسال',
    actionSuccessTitle: 'تم إرسال الطلب',
    actionSuccessBody: 'تم حفظ طلبك في النظام للمراجعة.',
    actionPermissionTitle: 'يلزم تسجيل الدخول',
    actionPermissionBody: 'سجّل الدخول بحساب باحث عن عقار لإرسال الطلب.',
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
    notFoundLink: 'تصفح العقارات'
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
    viewingBody: 'Choose a suitable time and the team will review your request.',
    requestedAt: 'Date and time',
    timezone: 'Time zone',
    timezonePlaceholder: 'Example: Africa/Cairo',
    note: 'Additional note',
    notePlaceholder: 'Any detail that may help the team',
    submitViewing: 'Send viewing request',
    cancel: 'Cancel',
    close: 'Close',
    contactValidation: 'Write a message before sending the request.',
    viewingValidation: 'Enter a future time and a valid time zone.',
    actionLoading: 'Sending',
    actionSuccessTitle: 'Request sent',
    actionSuccessBody: 'Your request was saved for review.',
    actionPermissionTitle: 'Sign-in required',
    actionPermissionBody: 'Sign in with a property-seeker account to send a request.',
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
    notFoundLink: 'Browse properties'
  },};

export function getPublicPropertyDetailsCopy(locale: SupportedLocale): PublicPropertyDetailsCopy {
  return copyByLocale[locale];
}
