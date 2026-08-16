import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicDevelopersCopy {
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
  readonly openProfile: string;
  readonly backToDirectory: string;
  readonly profileOverview: string;
  readonly profileProjects: string;
  readonly profileProperties: string;
  readonly profileKind: string;
  readonly profileContact: string;
  readonly profileContactUnavailable: string;
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
    title: 'المطورون والشركات',
    subtitle: 'تعرّف على الجهات المعتمدة ومشروعاتها وعقاراتها المنشورة.',
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
    verified: 'جهة معتمدة',
    projects: 'المشروعات',
    properties: 'العقارات المنشورة',
    projectCount: count => `${count} مشروع`,
    propertyCount: count => `${count} عقار منشور`,
    openProfile: 'عرض الملف التعريفي',
    backToDirectory: 'العودة إلى دليل الجهات',
    profileOverview: 'نبذة عامة',
    profileProjects: 'المشروعات',
    profileProperties: 'العقارات المنشورة',
    profileKind: 'نوع الجهة',
    profileContact: 'التواصل',
    profileContactUnavailable: 'بيانات التواصل العامة غير متاحة في هذا الملف حالياً.',
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
    openProfile: 'View profile',
    backToDirectory: 'Back to organizations',
    profileOverview: 'Overview',
    profileProjects: 'Projects',
    profileProperties: 'Published properties',
    profileKind: 'Organization type',
    profileContact: 'Contact',
    profileContactUnavailable: 'Public contact details are not available in this profile yet.',
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
    openProfile: '查看资料',
    backToDirectory: '返回机构目录',
    profileOverview: '概览',
    profileProjects: '项目',
    profileProperties: '已发布房产',
    profileKind: '机构类型',
    profileContact: '联系',
    profileContactUnavailable: '此资料暂未提供公开联系方式。',
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
