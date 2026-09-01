import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicDevelopersCopy {
  readonly introEyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly resultCount: (count: number) => string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly searchAction: string;
  readonly resetFilters: string;
  readonly kindLabel: string;
  readonly allKinds: string;
  readonly developerCompany: string;
  readonly brokerageOffice: string;
  readonly sortLabel: string;
  readonly sortName: string;
  readonly sortSlug: string;
  readonly directionLabel: string;
  readonly ascending: string;
  readonly descending: string;
  readonly verified: string;
  readonly projects: string;
  readonly properties: string;
  readonly projectCount: (count: number) => string;
  readonly propertyCount: (count: number) => string;
  readonly locationsLabel: string;
  readonly openProfile: string;
  readonly backToDirectory: string;
  readonly profileOverview: string;
  readonly profileProjects: string;
  readonly projectsSectionTitle: string;
  readonly profileProperties: string;
  readonly profileKind: string;
  readonly profileContact: string;
  readonly profileInquiryTitle: (name: string) => string;
  readonly profileContactUnavailable: string;
  readonly contactDeveloper: string;
  readonly availableUnitsAction: string;
  readonly activitySummary: string;
  readonly availableUnits: string;
  readonly totalUnits: string;
  readonly soldUnits: string;
  readonly reservedUnits: string;
  readonly activeAreas: string;
  readonly lastUpdated: string;
  readonly activeAreasTitle: string;
  readonly projectTypesTitle: string;
  readonly propertyTypesTitle: string;
  readonly paymentPlansTitle: string;
  readonly availableUnitsTitle: string;
  readonly availableUnitsEmpty: string;
  readonly projectStatus: string;
  readonly projectUnits: string;
  readonly projectArea: string;
  readonly projectPrice: string;
  readonly projectDelivery: string;
  readonly viewProject: string;
  readonly advisoryTitle: string;
  readonly advisoryBody: string;
  readonly contactWhatsapp: string;
  readonly contactWhatsappAvailable: string;
  readonly sendInquiry: string;
  readonly fieldName: string;
  readonly fieldPhone: string;
  readonly fieldEmail: string;
  readonly fieldMessage: string;
  readonly fieldRequestType: string;
  readonly fieldPreferredTime: string;
  readonly messagePlaceholder: string;
  readonly formNote: string;
  readonly descriptionTitle: string;
  readonly noDescription: string;
  readonly noProjects: string;
  readonly noProperties: string;
  readonly projectDescription: string;
  readonly website: string;
  readonly openWebsite: string;
  readonly sale: string;
  readonly rent: string;
  readonly property: string;
  readonly unit: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly paginationLabel: string;
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
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly notFoundLink: string;
  readonly imageUnavailable: string;
  readonly footerDescription: string;
  readonly footerLinks: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, PublicDevelopersCopy>> = {
  ar: {
    introEyebrow: '\u0634\u0631\u0643\u0627\u0621 \u0627\u0644\u062b\u0642\u0629',
    title: 'المطورون والشركات العقارية',
    subtitle: '\u0623\u0628\u0631\u0632 \u0627\u0644\u0645\u0637\u0648\u0631\u064a\u0646 \u0627\u0644\u0639\u0627\u0645\u0644\u064a\u0646 \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a',
    resultCount: count => `${count} جهة معتمدة`,
    searchLabel: 'البحث في الجهات',
    searchPlaceholder: 'اسم الجهة أو المعرّف المختصر',
    searchAction: 'بحث',
    resetFilters: 'إعادة ضبط',
    kindLabel: 'نوع الجهة',
    allKinds: 'كل الجهات',
    developerCompany: 'شركة مطوّرة',
    brokerageOffice: 'مكتب وساطة',
    sortLabel: 'ترتيب النتائج',
    sortName: 'الاسم',
    sortSlug: 'المعرّف المختصر',
    directionLabel: 'اتجاه الترتيب',
    ascending: 'تصاعدي',
    descending: 'تنازلي',
    verified: 'موثق',
    projects: 'المشروعات',
    properties: 'العقارات المنشورة',
    projectCount: count => `${count} مشروع`,
    propertyCount: count => `${count} عقار منشور`,
    locationsLabel: '\u0627\u0644\u0645\u0648\u0627\u0642\u0639',
    openProfile: '\u0639\u0631\u0636 \u0627\u0644\u0645\u0637\u0648\u0631',
    backToDirectory: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0645\u0637\u0648\u0631\u064a\u0646',
    profileOverview: '\u0646\u0628\u0630\u0629',
    profileProjects: '\u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639',
    projectsSectionTitle: '\u0645\u0634\u0627\u0631\u064a\u0639 \u0627\u0644\u0645\u0637\u0648\u0631',
    profileProperties: '\u0627\u0644\u0648\u062d\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629',
    profileKind: 'نوع الجهة',
    profileContact: 'التواصل',
    profileInquiryTitle: name => `\u0627\u0633\u062a\u0641\u0633\u0631 \u0639\u0646 \u0645\u0634\u0627\u0631\u064a\u0639 ${name}`,
    profileContactUnavailable: 'بيانات التواصل العامة غير متاحة في هذا الملف حالياً.',
    contactDeveloper: '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0637\u0648\u0631',
    availableUnitsAction: '\u0639\u0631\u0636 \u0627\u0644\u0648\u062d\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629',
    activitySummary: '\u0645\u0644\u062e\u0635 \u0646\u0634\u0627\u0637 \u0627\u0644\u0645\u0637\u0648\u0631',
    availableUnits: '\u0648\u062d\u062f\u0629 \u0645\u062a\u0627\u062d\u0629',
    totalUnits: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0648\u062d\u062f\u0627\u062a',
    soldUnits: '\u0648\u062d\u062f\u0629 \u0645\u0628\u0627\u0639\u0629',
    reservedUnits: '\u0648\u062d\u062f\u0629 \u0645\u062d\u062c\u0648\u0632\u0629',
    activeAreas: '\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0646\u0634\u0627\u0637',
    lastUpdated: '\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b',
    activeAreasTitle: '\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0646\u0634\u0627\u0637',
    projectTypesTitle: '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u0627\u062a',
    propertyTypesTitle: '\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a',
    paymentPlansTitle: '\u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0633\u062f\u0627\u062f',
    availableUnitsTitle: '\u0627\u0644\u0648\u062d\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u0644\u062f\u0649 \u0627\u0644\u0645\u0637\u0648\u0631',
    availableUnitsEmpty: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0648\u062d\u062f\u0627\u062a \u0645\u062a\u0627\u062d\u0629 \u0644\u062f\u0649 \u0647\u0630\u0627 \u0627\u0644\u0645\u0637\u0648\u0631 \u062d\u0627\u0644\u064a\u0627\u064b.',
    projectStatus: '\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    projectUnits: '\u0648\u062d\u062f\u0629',
    projectArea: '\u0627\u0644\u0645\u0633\u0627\u062d\u0629',
    projectPrice: '\u0627\u0644\u0623\u0633\u0639\u0627\u0631',
    projectDelivery: '\u0627\u0644\u062a\u0633\u0644\u064a\u0645',
    viewProject: '\u0639\u0631\u0636 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    advisoryTitle: '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0645\u0648\u062b\u0648\u0642\u0629',
    advisoryBody: '\u064a\u062a\u0645 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u0627\u0644\u062a\u0623\u0643\u062f \u0645\u0646 \u062c\u0645\u064a\u0639 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0642\u0628\u0644 \u0625\u062a\u0645\u0627\u0645 \u0623\u064a \u0639\u0645\u0644\u064a\u0629 \u0634\u0631\u0627\u0621 \u0623\u0648 \u062d\u062c\u0632.',
    contactWhatsapp: '\u062a\u0648\u0627\u0635\u0644 \u0639\u0628\u0631 \u0648\u0627\u062a\u0633\u0627\u0628',
    contactWhatsappAvailable: '\u0648\u0627\u062a\u0633\u0627\u0628 \u0645\u062a\u0627\u062d',
    sendInquiry: '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631',
    fieldName: '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644',
    fieldPhone: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641',
    fieldEmail: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
    fieldMessage: '\u0631\u0633\u0627\u0644\u0629 \u0625\u0636\u0627\u0641\u064a\u0629',
    fieldRequestType: '\u0646\u0648\u0639 \u0627\u0644\u0637\u0644\u0628',
    fieldPreferredTime: '\u0648\u0642\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0645\u0646\u0627\u0633\u0628',
    messagePlaceholder: '\u0627\u0643\u062a\u0628 \u0627\u0633\u062a\u0641\u0633\u0627\u0631\u0627\u062a\u0643 \u0623\u0648 \u062a\u0641\u0627\u0635\u064a\u0644 \u0625\u0636\u0627\u0641\u064a\u0629...',
    formNote: '\u0633\u064a\u062a\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0644\u064a\u062e\u0635 \u0637\u0644\u0628\u0643 \u0641\u0642\u0637.',
    descriptionTitle: '\u0639\u0646 \u0627\u0644\u0645\u0637\u0648\u0631',
    noDescription: 'لا توجد نبذة منشورة عن هذه الجهة حالياً.',
    noProjects: 'لا توجد مشروعات منشورة مرتبطة بهذه الجهة حالياً.',
    noProperties: 'لا توجد عقارات منشورة مرتبطة بهذه الجهة حالياً.',
    projectDescription: 'نبذة عن المشروع',
    website: 'الموقع الإلكتروني',
    openWebsite: 'زيارة الموقع الإلكتروني',
    sale: 'بيع',
    rent: 'إيجار',
    property: 'عقار',
    unit: 'وحدة',
    previousPage: 'الصفحة السابقة',
    nextPage: 'الصفحة التالية',
    paginationLabel: 'صفحات دليل الجهات',
    loadingTitle: 'جارٍ تحميل الجهات',
    loadingBody: 'يتم تجهيز الجهات المعتمدة المنشورة.',
    emptyTitle: 'لا توجد جهات مطابقة',
    emptyBody: 'جرّب تعديل البحث أو نوع الجهة لرؤية نتائج أخرى.',
    errorTitle: 'تعذر تحميل الجهات',
    errorBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    retryTitle: 'دليل الجهات غير متاح مؤقتاً',
    retryBody: 'يمكنك إعادة المحاولة عند توفر الاتصال.',
    retryLabel: 'إعادة المحاولة',
    permissionTitle: 'لا يمكن عرض هذه الجهات',
    permissionBody: 'لم يسمح الخادم بالوصول إلى دليل الجهات العام.',
    permissionLink: 'العودة إلى الصفحة الرئيسية',
    notFoundTitle: 'الجهة غير موجودة',
    notFoundBody: 'ربما لم تعد الجهة منشورة أو أن الرابط غير صحيح.',
    notFoundLink: 'تصفح دليل الجهات',
    imageUnavailable: 'الوسائط غير متاحة',
    footerDescription: 'دليل عام للجهات والعقارات المنشورة من مصادر معتمدة.',
    footerLinks: 'روابط المنصة'
  },
  en: {
    introEyebrow: 'Trusted partners',
    title: 'Developers & companies',
    subtitle: 'Explore approved organizations, their projects, and published properties.',
    resultCount: count => `${count} approved ${count === 1 ? 'organization' : 'organizations'}`,
    searchLabel: 'Search organizations',
    searchPlaceholder: 'Organization name or slug',
    searchAction: 'Search',
    resetFilters: 'Reset',
    kindLabel: 'Organization type',
    allKinds: 'All organizations',
    developerCompany: 'Developer company',
    brokerageOffice: 'Brokerage office',
    sortLabel: 'Sort results',
    sortName: 'Name',
    sortSlug: 'Slug',
    directionLabel: 'Sort direction',
    ascending: 'Ascending',
    descending: 'Descending',
    verified: 'Approved organization',
    projects: 'Projects',
    properties: 'Published properties',
    projectCount: count => `${count} ${count === 1 ? 'project' : 'projects'}`,
    propertyCount: count => `${count} ${count === 1 ? 'published property' : 'published properties'}`,
    locationsLabel: 'Locations',
    openProfile: 'View profile',
    backToDirectory: 'Back to organizations',
    profileOverview: 'Overview',
    profileProjects: 'Projects',
    projectsSectionTitle: 'Developer projects',
    profileProperties: 'Available units',
    profileKind: 'Organization type',
    profileContact: 'Contact',
    profileInquiryTitle: name => `Inquire about ${name}'s projects`,
    profileContactUnavailable: 'Public contact details are not available in this profile yet.',
    contactDeveloper: 'Contact developer',
    availableUnitsAction: 'View available units',
    activitySummary: 'Developer activity summary',
    availableUnits: 'Available units',
    totalUnits: 'Total units',
    soldUnits: 'Sold units',
    reservedUnits: 'Reserved units',
    activeAreas: 'Active areas',
    lastUpdated: 'Last updated',
    activeAreasTitle: 'Active areas',
    projectTypesTitle: 'Project types',
    propertyTypesTitle: 'Property types',
    paymentPlansTitle: 'Payment plans',
    availableUnitsTitle: 'Available units from this developer',
    availableUnitsEmpty: 'There are no available units from this developer right now.',
    projectStatus: 'Project status',
    projectUnits: 'units',
    projectArea: 'Area',
    projectPrice: 'Price',
    projectDelivery: 'Delivery',
    viewProject: 'View project',
    advisoryTitle: 'Verified information',
    advisoryBody: 'Project and property information is reviewed before you make a purchase or reservation decision.',
    contactWhatsapp: 'Contact on WhatsApp',
    contactWhatsappAvailable: 'WhatsApp available',
    sendInquiry: 'Send inquiry',
    fieldName: 'Full name',
    fieldPhone: 'Phone number',
    fieldEmail: 'Email',
    fieldMessage: 'Additional message',
    fieldRequestType: 'Request type',
    fieldPreferredTime: 'Preferred contact time',
    messagePlaceholder: 'Write your questions or additional details...',
    formNote: 'Your contact details will only be used to handle this inquiry.',
    descriptionTitle: 'About the developer',
    noDescription: 'No published description is available for this organization yet.',
    noProjects: 'No published projects are linked to this organization yet.',
    noProperties: 'No published properties are linked to this organization yet.',
    projectDescription: 'Project overview',
    website: 'Website',
    openWebsite: 'Visit website',
    sale: 'For sale',
    rent: 'For rent',
    property: 'Property',
    unit: 'Unit',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    paginationLabel: 'Organization directory pages',
    loadingTitle: 'Loading organizations',
    loadingBody: 'Preparing approved published organizations.',
    emptyTitle: 'No matching organizations',
    emptyBody: 'Try changing the search or organization type.',
    errorTitle: 'Organizations could not be loaded',
    errorBody: 'Check your connection and try again.',
    retryTitle: 'Organization directory is temporarily unavailable',
    retryBody: 'You can retry when the connection is available.',
    retryLabel: 'Try again',
    permissionTitle: 'These organizations cannot be displayed',
    permissionBody: 'The server did not allow access to the public directory.',
    permissionLink: 'Back to homepage',
    notFoundTitle: 'Organization not found',
    notFoundBody: 'The organization may no longer be published or the link may be incorrect.',
    notFoundLink: 'Browse organizations',
    imageUnavailable: 'Media unavailable',
    footerDescription: 'A public directory of published organizations and properties from approved sources.',
    footerLinks: 'Platform links'
  },};

export function getPublicDevelopersCopy(locale: SupportedLocale): PublicDevelopersCopy {
  return copyByLocale[locale];
}
