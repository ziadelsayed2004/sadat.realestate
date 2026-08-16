import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicHomepageCopy {
  readonly brand: string;
  readonly nav: Readonly<Record<'home' | 'properties' | 'developers' | 'articles' | 'community' | 'about' | 'team', string>>;
  readonly login: string;
  readonly createAccount: string;
  readonly localeLabel: string;
  readonly heroLabel: string;
  readonly heroFallbackTitle: string;
  readonly heroFallbackBody: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly searchAction: string;
  readonly browseProperties: string;
  readonly featuredProperties: string;
  readonly developers: string;
  readonly articles: string;
  readonly community: string;
  readonly about: string;
  readonly tips: string;
  readonly viewAll: string;
  readonly readMore: string;
  readonly sale: string;
  readonly rent: string;
  readonly area: string;
  readonly bedrooms: string;
  readonly bathrooms: string;
  readonly floor: string;
  readonly sqm: string;
  readonly imageUnavailable: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly loadingTitle: string;
  readonly loadingBody: string;
  readonly errorTitle: string;
  readonly errorBody: string;
  readonly retryTitle: string;
  readonly retryBody: string;
  readonly retryLabel: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly permissionLink: string;
  readonly footerDescription: string;
  readonly footerLinks: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, PublicHomepageCopy>> = {
  ar: {
    brand: 'عقارات السادات',
    nav: {
      home: 'الرئيسية',
      properties: 'العقارات',
      developers: 'المطورون',
      articles: 'المقالات',
      community: 'المجتمع',
      about: 'عن المنصة',
      team: 'فريقنا'
    },
    login: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب',
    localeLabel: 'اللغة',
    heroLabel: 'منصة عقارات السادات',
    heroFallbackTitle: 'اكتشف عقارك القادم',
    heroFallbackBody: 'تصفح العقارات المنشورة من خلال البيانات المعتمدة على المنصة.',
    searchLabel: 'ابحث عن عقار',
    searchPlaceholder: 'اكتب اسم العقار أو الكلمة المفتاحية',
    searchAction: 'بحث',
    browseProperties: 'تصفح العقارات',
    featuredProperties: 'عقارات منشورة',
    developers: 'المطورون والشركات',
    articles: 'المقالات',
    community: 'المجتمع',
    about: 'عن المنصة',
    tips: 'نصائح عقارية',
    viewAll: 'عرض الكل',
    readMore: 'اقرأ المزيد',
    sale: 'للبيع',
    rent: 'للإيجار',
    area: 'المساحة',
    bedrooms: 'غرف النوم',
    bathrooms: 'الحمامات',
    floor: 'الطابق',
    sqm: 'م²',
    imageUnavailable: 'الصورة غير متاحة',
    emptyTitle: 'لا توجد بيانات منشورة بعد',
    emptyBody: 'ستظهر محتويات الصفحة الرئيسية عند توفر بيانات منشورة من نظام إدارة المحتوى.',
    loadingTitle: 'جارٍ تحميل الصفحة الرئيسية',
    loadingBody: 'يتم تجهيز المحتوى المنشور.',
    errorTitle: 'تعذر تحميل الصفحة الرئيسية',
    errorBody: 'تحقق من الاتصال أو حاول مرة أخرى لاحقًا.',
    retryTitle: 'تعذر الاتصال بالمحتوى',
    retryBody: 'يمكنك إعادة المحاولة عند توفر الاتصال.',
    retryLabel: 'إعادة المحاولة',
    permissionTitle: 'لا يمكن عرض هذا المحتوى',
    permissionBody: 'رفض الخادم الوصول إلى محتوى الصفحة الرئيسية.',
    permissionLink: 'العودة إلى الصفحة العامة',
    footerDescription: 'منصة عامة لعرض العقارات والمحتوى المنشور من المصادر المعتمدة.',
    footerLinks: 'روابط المنصة'
  },
  en: {
    brand: 'Sadat Real Estate',
    nav: {
      home: 'Home',
      properties: 'Properties',
      developers: 'Developers',
      articles: 'Articles',
      community: 'Community',
      about: 'About',
      team: 'Our team'
    },
    login: 'Log in',
    createAccount: 'Create account',
    localeLabel: 'Language',
    heroLabel: 'Sadat Real Estate platform',
    heroFallbackTitle: 'Find your next property',
    heroFallbackBody: 'Browse published properties from the approved platform data.',
    searchLabel: 'Search for a property',
    searchPlaceholder: 'Property name or keyword',
    searchAction: 'Search',
    browseProperties: 'Browse properties',
    featuredProperties: 'Published properties',
    developers: 'Developers and companies',
    articles: 'Articles',
    community: 'Community',
    about: 'About the platform',
    tips: 'Real estate tips',
    viewAll: 'View all',
    readMore: 'Read more',
    sale: 'For sale',
    rent: 'For rent',
    area: 'Area',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    floor: 'Floor',
    sqm: 'sqm',
    imageUnavailable: 'Image unavailable',
    emptyTitle: 'No published data yet',
    emptyBody: 'Homepage content will appear when published CMS data is available.',
    loadingTitle: 'Loading the homepage',
    loadingBody: 'Preparing published content.',
    errorTitle: 'The homepage could not load',
    errorBody: 'Check the connection or try again later.',
    retryTitle: 'The content service is unavailable',
    retryBody: 'You can try again when the connection is available.',
    retryLabel: 'Retry',
    permissionTitle: 'This content is unavailable',
    permissionBody: 'The server did not allow access to the homepage content.',
    permissionLink: 'Return to the public homepage',
    footerDescription: 'A public platform for published properties and content from approved sources.',
    footerLinks: 'Platform links'
  },
  'zh-CN': {
    brand: '萨达特房地产',
    nav: {
      home: '首页',
      properties: '房产',
      developers: '开发商',
      articles: '文章',
      community: '社区',
      about: '关于平台',
      team: '我们的团队'
    },
    login: '登录',
    createAccount: '创建账户',
    localeLabel: '语言',
    heroLabel: '萨达特房地产平台',
    heroFallbackTitle: '发现下一处房产',
    heroFallbackBody: '浏览来自平台已批准数据的已发布房产。',
    searchLabel: '搜索房产',
    searchPlaceholder: '房产名称或关键词',
    searchAction: '搜索',
    browseProperties: '浏览房产',
    featuredProperties: '已发布房产',
    developers: '开发商和公司',
    articles: '文章',
    community: '社区',
    about: '关于平台',
    tips: '房地产资讯',
    viewAll: '查看全部',
    readMore: '阅读更多',
    sale: '出售',
    rent: '出租',
    area: '面积',
    bedrooms: '卧室',
    bathrooms: '浴室',
    floor: '楼层',
    sqm: '平方米',
    imageUnavailable: '图片不可用',
    emptyTitle: '暂无已发布数据',
    emptyBody: '发布的 CMS 数据可用后，首页内容会显示在这里。',
    loadingTitle: '正在加载首页',
    loadingBody: '正在准备已发布内容。',
    errorTitle: '首页无法加载',
    errorBody: '请检查连接后重试。',
    retryTitle: '内容服务暂时不可用',
    retryBody: '连接恢复后可以再次尝试。',
    retryLabel: '重试',
    permissionTitle: '内容不可用',
    permissionBody: '服务器未允许访问首页内容。',
    permissionLink: '返回公开首页',
    footerDescription: '展示已批准来源发布的房产和内容的公开平台。',
    footerLinks: '平台链接'
  }
};

export function getPublicHomepageCopy(locale: SupportedLocale): PublicHomepageCopy {
  return copyByLocale[locale];
}

