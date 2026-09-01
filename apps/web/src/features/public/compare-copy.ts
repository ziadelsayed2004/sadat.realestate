import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicPropertyComparisonCopy {
  readonly title: string;
  readonly description: string;
  readonly showAll: string;
  readonly showDifferences: string;
  readonly viewModeLabel: string;
  readonly selectedCount: (count: number) => string;
  readonly fieldColumn: string;
  readonly detailsTitle: string;
  readonly basicTitle: string;
  readonly priceTitle: string;
  readonly dimensionsTitle: string;
  readonly locationTitle: string;
  readonly remove: string;
  readonly viewDetails: string;
  readonly clearAll: string;
  readonly compareNow: string;
  readonly backToProperties: string;
  readonly property: string;
  readonly propertyType: string;
  readonly unit: string;
  readonly sale: string;
  readonly rent: string;
  readonly valueUnavailable: string;
  readonly imageUnavailable: string;
  readonly noDifferences: string;
  readonly loadingTitle: string;
  readonly loadingBody: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly errorTitle: string;
  readonly errorBody: string;
  readonly retryTitle: string;
  readonly retryBody: string;
  readonly retryLabel: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly permissionLink: string;
  readonly unavailableTitle: string;
  readonly unavailableBody: string;
  readonly name: string;
  readonly transactionType: string;
  readonly sourceName: string;
  readonly sourceType: string;
  readonly project: string;
  readonly developer: string;
  readonly reference: string;
  readonly price: string;
  readonly installment: string;
  readonly available: string;
  readonly area: string;
  readonly layout: string;
  readonly bedrooms: string;
  readonly bathrooms: string;
  readonly floor: string;
  readonly deliveryStatus: string;
  readonly location: string;
  readonly developerCompany: string;
  readonly brokerageOffice: string;
  readonly individualBroker: string;
  readonly sqm: string;
  readonly footerDescription: string;
  readonly footerLinks: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, PublicPropertyComparisonCopy>> = {
  ar: {
    title: 'مقارنة الوحدات',
    description: 'قارن بين تفاصيل وحدتين واختر الأنسب لاحتياجاتك.',
    showAll: 'إظهار كل التفاصيل',
    showDifferences: 'إظهار الاختلافات فقط',
    viewModeLabel: 'طريقة عرض المقارنة',
    selectedCount: count => String(count) + ' من 2 محدد',
    fieldColumn: 'البيان',
    detailsTitle: 'تفاصيل المقارنة',
    basicTitle: 'البيانات الأساسية',
    priceTitle: 'السعر والدفع',
    dimensionsTitle: 'المساحات والتقسيم',
    locationTitle: 'الموقع',
    remove: 'إزالة',
    viewDetails: 'عرض التفاصيل',
    clearAll: 'مسح الكل والعودة للبحث',
    compareNow: 'قارن الآن',
    backToProperties: 'تصفح العقارات',
    property: 'عقار',
    propertyType: 'نوع العقار',
    unit: 'وحدة',
    sale: 'بيع',
    rent: 'إيجار',
    valueUnavailable: 'غير متاح',
    imageUnavailable: 'الصورة غير متاحة',
    noDifferences: 'لا توجد اختلافات في الحقول المتاحة.',
    loadingTitle: 'جارٍ تحميل المقارنة',
    loadingBody: 'نجهز البيانات المنشورة للعقارات المحددة.',
    emptyTitle: 'اختر عقارات للمقارنة',
    emptyBody: 'أضف عقارًا واحدًا أو عقارين من نتائج البحث لعرض الحقول المتاحة.',
    errorTitle: 'تعذر تحميل المقارنة',
    errorBody: 'تحقق من الاتصال ثم حاول مرة أخرى.',
    retryTitle: 'خدمة المقارنة غير متاحة مؤقتًا',
    retryBody: 'يمكنك المحاولة مرة أخرى بعد عودة الاتصال.',
    retryLabel: 'إعادة المحاولة',
    permissionTitle: 'المقارنة غير متاحة',
    permissionBody: 'لم يسمح الخادم بالوصول إلى المقارنة العامة.',
    permissionLink: 'العودة إلى الرئيسية',
    unavailableTitle: 'أحد العقارات لم يعد متاحًا',
    unavailableBody: 'تم تحديث البيانات المنشورة. ارجع إلى النتائج واختر عقارات متاحة للمقارنة.',
    name: 'اسم العقار',
    transactionType: 'نوع المعاملة',
    sourceName: 'مقدم العقار',
    sourceType: 'نوع مقدم العقار',
    project: 'المشروع',
    developer: 'المطور العقاري',
    reference: 'الرقم المرجعي',
    price: 'السعر',
    installment: 'التقسيط',
    available: 'متاح',
    area: 'المساحة الإجمالية',
    layout: 'التقسيم',
    bedrooms: 'غرف النوم',
    bathrooms: 'الحمامات',
    floor: 'الدور',
    deliveryStatus: 'حالة التشطيب',
    location: 'الموقع',
    developerCompany: 'شركة تطوير عقاري',
    brokerageOffice: 'مكتب وساطة عقارية',
    individualBroker: 'وسيط عقاري',
    sqm: 'م²',
    footerDescription: 'مقارنة آمنة لبيانات العقارات المنشورة من مصادر معتمدة.',
    footerLinks: 'روابط المنصة'
  },
  en: {
    title: 'Unit comparison',
    description: 'Compare two properties and choose the one that fits your needs.',
    showAll: 'Show all details',
    showDifferences: 'Show differences only',
    viewModeLabel: 'Comparison view',
    selectedCount: count => String(count) + ' of 2 selected',
    fieldColumn: 'Field',
    detailsTitle: 'Comparison details',
    basicTitle: 'Basic information',
    priceTitle: 'Price and payment',
    dimensionsTitle: 'Area and layout',
    locationTitle: 'Location',
    remove: 'Remove',
    viewDetails: 'View details',
    clearAll: 'Clear all and return to search',
    compareNow: 'Compare now',
    backToProperties: 'Browse properties',
    property: 'Property',
    propertyType: 'Property type',
    unit: 'Unit',
    sale: 'For sale',
    rent: 'For rent',
    valueUnavailable: 'Unavailable',
    imageUnavailable: 'Image unavailable',
    noDifferences: 'No differences are available in the selected fields.',
    loadingTitle: 'Loading comparison',
    loadingBody: 'Preparing published data for the selected properties.',
    emptyTitle: 'Choose properties to compare',
    emptyBody: 'Add one or two properties from the search results to view the available fields.',
    errorTitle: 'Comparison could not be loaded',
    errorBody: 'Check your connection and try again.',
    retryTitle: 'Comparison service is temporarily unavailable',
    retryBody: 'You can try again when the connection is restored.',
    retryLabel: 'Retry',
    permissionTitle: 'Comparison is unavailable',
    permissionBody: 'The server did not allow access to the public comparison.',
    permissionLink: 'Return home',
    unavailableTitle: 'A property is no longer available',
    unavailableBody: 'Published data changed. Return to the results and choose available properties.',
    name: 'Property name',
    transactionType: 'Transaction type',
    sourceName: 'Provider',
    sourceType: 'Provider type',
    project: 'Project',
    developer: 'Developer',
    reference: 'Reference number',
    price: 'Price',
    installment: 'Installment plan',
    available: 'Available',
    area: 'Total area',
    layout: 'Layout',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    floor: 'Floor',
    deliveryStatus: 'Finish status',
    location: 'Location',
    developerCompany: 'Real-estate developer',
    brokerageOffice: 'Brokerage office',
    individualBroker: 'Individual broker',
    sqm: 'sqm',
    footerDescription: 'Safe comparison of published property data from approved sources.',
    footerLinks: 'Platform links'
  },};

export function getPublicPropertyComparisonCopy(locale: SupportedLocale): PublicPropertyComparisonCopy {
  return copyByLocale[locale];
}
