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
  readonly categoryEyebrow: string;
  readonly categoryTitle: string;
  readonly categoryDescription: string;
  readonly propertiesEyebrow: string;
  readonly propertiesTitle: string;
  readonly articlesEyebrow: string;
  readonly articlesTitle: string;
  readonly communityEyebrow: string;
  readonly communityTitle: string;
  readonly communityAction: string;
  readonly communityQuestion: string;
  readonly communityExperience: string;
  readonly aboutEyebrow: string;
  readonly aboutTitle: string;
  readonly developers: string;
  readonly articles: string;
  readonly community: string;
  readonly about: string;
  readonly tips: string;
  readonly readyCtaTitle: string;
  readonly readyCtaBody: string;
  readonly whatsappAction: string;
  readonly discoverProject: string;
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
    heroLabel: '\ud83c\udfd9\ufe0f بوابتك لعقارات مدينة السادات',
    heroFallbackTitle: 'ابحث عن عقارك\nالان في السادات',
    heroFallbackBody: 'منصة متكاملة لعقارات وخدمات مدينة السادات',
    searchLabel: 'ابحث عن عقار',
    searchPlaceholder: 'اكتب اسم العقار أو الكلمة المفتاحية',
    searchAction: 'بحث',
    browseProperties: 'تصفح العقارات',
    featuredProperties: 'عقارات منشورة',
    categoryEyebrow: 'اكتشف أكثر',
    categoryTitle: 'فئات العقارات',
    categoryDescription: 'تصفح جميع أنواع العقارات المتاحة في مدينة السادات',
    propertiesEyebrow: 'عقارات مختارة',
    propertiesTitle: 'أبرز العقارات المميزة',
    articlesEyebrow: 'معرفة عقارية',
    articlesTitle: 'أحدث المقالات',
    communityEyebrow: 'مجتمع السادات',
    communityTitle: 'آراء وتجارب السكان',
    communityAction: 'انضم للمجتمع',
    communityQuestion: 'سؤال',
    communityExperience: 'تجربة',
    aboutEyebrow: 'من نحن',
    aboutTitle: 'منصة متكاملة لعقارات مدينة السادات',
    developers: 'المطورون والشركات',
    articles: 'المقالات',
    community: 'المجتمع',
    about: 'عن المنصة',
    tips: 'نصائح عقارية',
    readyCtaTitle: 'مستعد تبدأ رحلتك العقارية؟',
    readyCtaBody: 'فريقنا جاهز لمساعدتك في العثور على العقار المثالي',
    whatsappAction: 'تواصل واتساب',
    discoverProject: 'اكتشف المشروع',
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
    footerDescription: 'بوابتك الموثوقة لعقارات مدينة السادات',
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
    heroFallbackTitle: 'Find your property\nnow in Sadat City',
    heroFallbackBody: 'A complete real-estate platform for Sadat City services and properties',
    searchLabel: 'Search for a property',
    searchPlaceholder: 'Property name or keyword',
    searchAction: 'Search',
    browseProperties: 'Browse properties',
    featuredProperties: 'Published properties',
    categoryEyebrow: 'Discover more',
    categoryTitle: 'Property categories',
    categoryDescription: 'Browse all property types available in Sadat City',
    propertiesEyebrow: 'Featured properties',
    propertiesTitle: 'Top featured properties',
    articlesEyebrow: 'Real estate insights',
    articlesTitle: 'Latest articles',
    communityEyebrow: 'Sadat community',
    communityTitle: "Residents' opinions and experiences",
    communityAction: 'Join the community',
    communityQuestion: 'Question',
    communityExperience: 'Experience',
    aboutEyebrow: 'About us',
    aboutTitle: 'A complete real-estate platform for Sadat City',
    developers: 'Developers and companies',
    articles: 'Articles',
    community: 'Community',
    about: 'About the platform',
    tips: 'Real estate tips',
    readyCtaTitle: 'Ready to start your property journey?',
    readyCtaBody: 'Our team is ready to help you find the perfect property.',
    whatsappAction: 'Contact us on WhatsApp',
    discoverProject: 'Discover the project',
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
    heroFallbackTitle: '寻找您的房产\n就在萨达特城',
    heroFallbackBody: '萨达特城房产与服务综合平台',
    searchLabel: '搜索房产',
    searchPlaceholder: '房产名称或关键词',
    searchAction: '搜索',
    browseProperties: '浏览房产',
    featuredProperties: '已发布房产',
    categoryEyebrow: '探索更多',
    categoryTitle: '房产类别',
    categoryDescription: '浏览萨达特城所有可用房产类型',
    propertiesEyebrow: '精选房产',
    propertiesTitle: '精选特色房产',
    articlesEyebrow: '房产知识',
    articlesTitle: '最新文章',
    communityEyebrow: '萨达特社区',
    communityTitle: '居民意见与体验',
    communityAction: '加入社区',
    communityQuestion: '问题',
    communityExperience: '体验',
    aboutEyebrow: '关于我们',
    aboutTitle: '萨达特城综合房地产平台',
    developers: '开发商和公司',
    articles: '文章',
    community: '社区',
    about: '关于平台',
    tips: '房地产资讯',
    readyCtaTitle: '准备开始您的房产之旅吗？',
    readyCtaBody: '我们的团队随时帮助您找到理想房产。',
    whatsappAction: '联系 WhatsApp',
    discoverProject: '探索项目',
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
