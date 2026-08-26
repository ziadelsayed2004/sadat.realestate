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
  readonly profileProperties: string;
  readonly profileKind: string;
  readonly profileContact: string;
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
  readonly sendInquiry: string;
  readonly fieldName: string;
  readonly fieldPhone: string;
  readonly fieldEmail: string;
  readonly fieldMessage: string;
  readonly fieldRequestType: string;
  readonly fieldPreferredTime: string;
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
    backToDirectory: 'العودة إلى دليل الجهات',
    profileOverview: 'نبذة عامة',
    profileProjects: 'المشروعات',
    profileProperties: 'العقارات المنشورة',
    profileKind: 'نوع الجهة',
    profileContact: 'التواصل',
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
    projectUnits: '\u0627\u0644\u0648\u062d\u062f\u0627\u062a',
    projectArea: '\u0627\u0644\u0645\u0633\u0627\u062d\u0629',
    projectPrice: '\u0627\u0644\u0623\u0633\u0639\u0627\u0631',
    projectDelivery: '\u0627\u0644\u062a\u0633\u0644\u064a\u0645',
    viewProject: '\u0639\u0631\u0636 \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
    advisoryTitle: '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0645\u0648\u062b\u0648\u0642\u0629',
    advisoryBody: '\u064a\u062a\u0645 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u0627\u0644\u062a\u0623\u0643\u062f \u0645\u0646 \u062c\u0645\u064a\u0639 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0642\u0628\u0644 \u0625\u062a\u0645\u0627\u0645 \u0623\u064a \u0639\u0645\u0644\u064a\u0629 \u0634\u0631\u0627\u0621 \u0623\u0648 \u062d\u062c\u0632.',
    contactWhatsapp: '\u062a\u0648\u0627\u0635\u0644 \u0639\u0628\u0631 \u0648\u0627\u062a\u0633\u0627\u0628',
    sendInquiry: '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631',
    fieldName: '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644',
    fieldPhone: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641',
    fieldEmail: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
    fieldMessage: '\u0631\u0633\u0627\u0644\u062a\u0643',
    fieldRequestType: '\u0646\u0648\u0639 \u0627\u0644\u0637\u0644\u0628',
    fieldPreferredTime: '\u0648\u0642\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0627\u0644\u0645\u0646\u0627\u0633\u0628',
    formNote: '\u0633\u064a\u062a\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0644\u064a\u062e\u0635 \u0637\u0644\u0628\u0643 \u0641\u0642\u0637.',
    descriptionTitle: 'نبذة عن الجهة',
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
    profileProperties: 'Published properties',
    profileKind: 'Organization type',
    profileContact: 'Contact',
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
    projectUnits: 'Units',
    projectArea: 'Area',
    projectPrice: 'Price',
    projectDelivery: 'Delivery',
    viewProject: 'View project',
    advisoryTitle: 'Verified information',
    advisoryBody: 'Project and property information is reviewed before you make a purchase or reservation decision.',
    contactWhatsapp: 'Contact on WhatsApp',
    sendInquiry: 'Send inquiry',
    fieldName: 'Full name',
    fieldPhone: 'Phone number',
    fieldEmail: 'Email',
    fieldMessage: 'Message',
    fieldRequestType: 'Request type',
    fieldPreferredTime: 'Preferred contact time',
    formNote: 'Your contact details will only be used to handle this inquiry.',
    descriptionTitle: 'About this organization',
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
  },
  'zh-CN': {
    introEyebrow: '\u53ef\u4fe1\u5408\u4f5c\u4f19\u4f34',
    title: '开发商与公司',
    subtitle: '查看已批准的机构、其项目以及已发布的房产。',
    resultCount: count => `${count} 个已批准机构`,
    searchLabel: '搜索机构',
    searchPlaceholder: '机构名称或简码',
    searchAction: '搜索',
    resetFilters: '重置',
    kindLabel: '机构类型',
    allKinds: '全部机构',
    developerCompany: '开发商公司',
    brokerageOffice: '经纪办公室',
    sortLabel: '排序结果',
    sortName: '名称',
    sortSlug: '简码',
    directionLabel: '排序方向',
    ascending: '升序',
    descending: '降序',
    verified: '已批准机构',
    projects: '项目',
    properties: '已发布房产',
    projectCount: count => `${count} 个项目`,
    propertyCount: count => `${count} 个已发布房产`,
    locationsLabel: '位置',
    openProfile: '查看资料',
    backToDirectory: '返回机构目录',
    profileOverview: '概览',
    profileProjects: '项目',
    profileProperties: '已发布房产',
    profileKind: '机构类型',
    profileContact: '联系',
    profileContactUnavailable: '此资料暂未提供公开联系方式。',
    contactDeveloper: '联系开发商',
    availableUnitsAction: '查看可用单元',
    activitySummary: '开发商活动摘要',
    availableUnits: '可用单元',
    totalUnits: '单元总数',
    soldUnits: '已售单元',
    reservedUnits: '已预订单元',
    activeAreas: '活跃区域',
    lastUpdated: '最后更新',
    activeAreasTitle: '活跃区域',
    projectTypesTitle: '项目类型',
    propertyTypesTitle: '房产类型',
    paymentPlansTitle: '付款计划',
    availableUnitsTitle: '该开发商的可用单元',
    availableUnitsEmpty: '该开发商目前没有可用单元。',
    projectStatus: '项目状态',
    projectUnits: '单元',
    projectArea: '面积',
    projectPrice: '价格',
    projectDelivery: '交付',
    viewProject: '查看项目',
    advisoryTitle: '已验证信息',
    advisoryBody: '项目和房产信息会在您做出购买或预订决定前经过审核。',
    contactWhatsapp: '通过 WhatsApp 联系',
    sendInquiry: '发送咨询',
    fieldName: '姓名',
    fieldPhone: '电话号码',
    fieldEmail: '电子邮箱',
    fieldMessage: '留言',
    fieldRequestType: '请求类型',
    fieldPreferredTime: '首选联系时间',
    formNote: '您的联系方式仅用于处理本次咨询。',
    descriptionTitle: '机构简介',
    noDescription: '此机构暂未发布简介。',
    noProjects: '此机构暂未关联已发布项目。',
    noProperties: '此机构暂未关联已发布房产。',
    projectDescription: '项目简介',
    website: '网站',
    openWebsite: '访问网站',
    sale: '出售',
    rent: '出租',
    property: '房产',
    unit: '单元',
    previousPage: '上一页',
    nextPage: '下一页',
    paginationLabel: '机构目录分页',
    loadingTitle: '正在加载机构',
    loadingBody: '正在准备已批准的已发布机构。',
    emptyTitle: '没有匹配的机构',
    emptyBody: '请尝试修改搜索或机构类型。',
    errorTitle: '无法加载机构',
    errorBody: '请检查网络连接后重试。',
    retryTitle: '机构目录暂时不可用',
    retryBody: '网络恢复后可以再次尝试。',
    retryLabel: '重试',
    permissionTitle: '无法显示这些机构',
    permissionBody: '服务器未允许访问公开机构目录。',
    permissionLink: '返回首页',
    notFoundTitle: '未找到机构',
    notFoundBody: '该机构可能已不再发布，或链接不正确。',
    notFoundLink: '浏览机构目录',
    imageUnavailable: '媒体不可用',
    footerDescription: '来自已批准来源的已发布机构和房产公开目录。',
    footerLinks: '平台链接'
  }
};

export function getPublicDevelopersCopy(locale: SupportedLocale): PublicDevelopersCopy {
  return copyByLocale[locale];
}
