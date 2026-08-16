import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicPropertyListingCopy {
  readonly title: string;
  readonly resultCount: (count: number) => string;
  readonly filtersTitle: string;
  readonly resetFilters: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly transactionLabel: string;
  readonly allTransactions: string;
  readonly sale: string;
  readonly rent: string;
  readonly kindLabel: string;
  readonly allKinds: string;
  readonly property: string;
  readonly unit: string;
  readonly minPrice: string;
  readonly maxPrice: string;
  readonly bedrooms: string;
  readonly locationId: string;
  readonly projectId: string;
  readonly valuePlaceholder: string;
  readonly applyFilters: string;
  readonly invalidFilters: string;
  readonly sortLabel: string;
  readonly sortPublishedAt: string;
  readonly sortPrice: string;
  readonly sortName: string;
  readonly sortSlug: string;
  readonly directionLabel: string;
  readonly ascending: string;
  readonly descending: string;
  readonly gridView: string;
  readonly listView: string;
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
  readonly imageUnavailable: string;
  readonly area: string;
  readonly bathrooms: string;
  readonly floor: string;
  readonly sqm: string;
  readonly footerDescription: string;
  readonly footerLinks: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, PublicPropertyListingCopy>> = {
  ar: {
    title: 'نتائج البحث عن العقارات',
    resultCount: count => `${count} عقار متاح`,
    filtersTitle: 'تصفية النتائج',
    resetFilters: 'إعادة ضبط',
    searchLabel: 'البحث',
    searchPlaceholder: 'اسم العقار أو كلمة مفتاحية',
    transactionLabel: 'نوع المعاملة',
    allTransactions: 'الكل',
    sale: 'بيع',
    rent: 'إيجار',
    kindLabel: 'نوع السجل',
    allKinds: 'الكل',
    property: 'عقار',
    unit: 'وحدة',
    minPrice: 'الحد الأدنى للسعر',
    maxPrice: 'الحد الأقصى للسعر',
    bedrooms: 'غرف النوم',
    locationId: 'معرّف المنطقة',
    projectId: 'معرّف المشروع',
    valuePlaceholder: 'اختياري',
    applyFilters: 'تطبيق التصفية',
    invalidFilters: 'تحقق من قيم التصفية المدخلة ثم حاول مرة أخرى.',
    sortLabel: 'ترتيب النتائج',
    sortPublishedAt: 'الأحدث نشرًا',
    sortPrice: 'السعر',
    sortName: 'الاسم',
    sortSlug: 'المعرّف المختصر',
    directionLabel: 'اتجاه الترتيب',
    ascending: 'تصاعدي',
    descending: 'تنازلي',
    gridView: 'عرض شبكي',
    listView: 'عرض قائمة',
    previousPage: 'الصفحة السابقة',
    nextPage: 'الصفحة التالية',
    paginationLabel: 'صفحات العقارات',
    loadingTitle: 'جارٍ تحميل العقارات',
    loadingBody: 'يتم تجهيز النتائج المنشورة.',
    emptyTitle: 'لا توجد عقارات مطابقة',
    emptyBody: 'جرّب تعديل البحث أو التصفية لرؤية نتائج أخرى.',
    errorTitle: 'تعذر تحميل العقارات',
    errorBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    retryTitle: 'خدمة العقارات غير متاحة مؤقتًا',
    retryBody: 'يمكنك إعادة المحاولة عند توفر الاتصال.',
    retryLabel: 'إعادة المحاولة',
    permissionTitle: 'لا يمكن عرض هذه النتائج',
    permissionBody: 'لم يسمح الخادم بالوصول إلى قائمة العقارات العامة.',
    permissionLink: 'العودة إلى الصفحة الرئيسية',
    imageUnavailable: 'الصورة غير متاحة',
    area: 'المساحة',
    bathrooms: 'الحمامات',
    floor: 'الطابق',
    sqm: 'م²',
    footerDescription: 'قائمة عامة للعقارات المنشورة من مصادر معتمدة.',
    footerLinks: 'روابط المنصة'
  },
  en: {
    title: 'Property search results',
    resultCount: count => `${count} available ${count === 1 ? 'property' : 'properties'}`,
    filtersTitle: 'Filter results',
    resetFilters: 'Reset',
    searchLabel: 'Search',
    searchPlaceholder: 'Property name or keyword',
    transactionLabel: 'Transaction type',
    allTransactions: 'All',
    sale: 'For sale',
    rent: 'For rent',
    kindLabel: 'Record type',
    allKinds: 'All',
    property: 'Property',
    unit: 'Unit',
    minPrice: 'Minimum price',
    maxPrice: 'Maximum price',
    bedrooms: 'Bedrooms',
    locationId: 'Location ID',
    projectId: 'Project ID',
    valuePlaceholder: 'Optional',
    applyFilters: 'Apply filters',
    invalidFilters: 'Check the filter values and try again.',
    sortLabel: 'Sort results',
    sortPublishedAt: 'Recently published',
    sortPrice: 'Price',
    sortName: 'Name',
    sortSlug: 'Slug',
    directionLabel: 'Sort direction',
    ascending: 'Ascending',
    descending: 'Descending',
    gridView: 'Grid view',
    listView: 'List view',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    paginationLabel: 'Property pages',
    loadingTitle: 'Loading properties',
    loadingBody: 'Preparing published results.',
    emptyTitle: 'No matching properties',
    emptyBody: 'Try changing the search or filters to see other results.',
    errorTitle: 'Properties could not load',
    errorBody: 'Check the connection and try again.',
    retryTitle: 'The property service is unavailable',
    retryBody: 'You can retry when the connection is available.',
    retryLabel: 'Retry',
    permissionTitle: 'These results are unavailable',
    permissionBody: 'The server did not allow access to the public property list.',
    permissionLink: 'Return to the homepage',
    imageUnavailable: 'Image unavailable',
    area: 'Area',
    bathrooms: 'Bathrooms',
    floor: 'Floor',
    sqm: 'sqm',
    footerDescription: 'A public list of published properties from approved sources.',
    footerLinks: 'Platform links'
  },
  'zh-CN': {
    title: '房产搜索结果',
    resultCount: count => `${count} 套可用房产`,
    filtersTitle: '筛选结果',
    resetFilters: '重置',
    searchLabel: '搜索',
    searchPlaceholder: '房产名称或关键词',
    transactionLabel: '交易类型',
    allTransactions: '全部',
    sale: '出售',
    rent: '出租',
    kindLabel: '记录类型',
    allKinds: '全部',
    property: '房产',
    unit: '单元',
    minPrice: '最低价格',
    maxPrice: '最高价格',
    bedrooms: '卧室',
    locationId: '位置 ID',
    projectId: '项目 ID',
    valuePlaceholder: '可选',
    applyFilters: '应用筛选',
    invalidFilters: '请检查筛选值后重试。',
    sortLabel: '排序结果',
    sortPublishedAt: '最新发布',
    sortPrice: '价格',
    sortName: '名称',
    sortSlug: '标识',
    directionLabel: '排序方向',
    ascending: '升序',
    descending: '降序',
    gridView: '网格视图',
    listView: '列表视图',
    previousPage: '上一页',
    nextPage: '下一页',
    paginationLabel: '房产分页',
    loadingTitle: '正在加载房产',
    loadingBody: '正在准备已发布的结果。',
    emptyTitle: '没有匹配的房产',
    emptyBody: '请尝试更改搜索或筛选条件。',
    errorTitle: '房产无法加载',
    errorBody: '请检查连接后重试。',
    retryTitle: '房产服务暂时不可用',
    retryBody: '连接恢复后可以再次尝试。',
    retryLabel: '重试',
    permissionTitle: '结果不可用',
    permissionBody: '服务器不允许访问公开房产列表。',
    permissionLink: '返回首页',
    imageUnavailable: '图片不可用',
    area: '面积',
    bathrooms: '浴室',
    floor: '楼层',
    sqm: '平方米',
    footerDescription: '展示来自已批准来源的已发布房产。',
    footerLinks: '平台链接'
  }
};

export function getPublicPropertyListingCopy(locale: SupportedLocale): PublicPropertyListingCopy {
  return copyByLocale[locale];
}

