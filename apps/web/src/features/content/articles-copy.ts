import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicArticlesCopy {
  readonly title: string;
  readonly subtitle: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly allCategories: string;
  readonly categoryLabel: string;
  readonly resultCount: (count: number) => string;
  readonly openArticle: string;
  readonly readTime: (minutes: number) => string;
  readonly publishedAt: string;
  readonly authorUnavailable: string;
  readonly imageUnavailable: string;
  readonly noSummary: string;
  readonly backToArticles: string;
  readonly articleBody: string;
  readonly relatedArticles: string;
  readonly noRelatedArticles: string;
  readonly searchNoMatch: string;
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
  readonly footerDescription: string;
  readonly footerLinks: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, PublicArticlesCopy>> = {
  ar: {
    title: 'مقالات ومحتوى متخصص',
    subtitle: 'دليلك الموثوق في سوق عقارات مدينة السادات',
    searchLabel: 'البحث في المقالات',
    searchPlaceholder: 'ابحث في المقالات...',
    allCategories: 'الكل',
    categoryLabel: 'تصنيفات المقالات',
    resultCount: count => `${count} مقالات منشورة`,
    openArticle: 'اقرأ المقال',
    readTime: minutes => `${minutes} دقائق`,
    publishedAt: 'تاريخ النشر',
    authorUnavailable: 'بيانات الكاتب غير متاحة في المحتوى العام',
    imageUnavailable: 'صورة المقال غير متاحة',
    noSummary: 'لا يوجد ملخص منشور لهذا المقال.',
    backToArticles: 'العودة للمقالات',
    articleBody: 'محتوى المقال',
    relatedArticles: 'مقالات ذات صلة',
    noRelatedArticles: 'لا توجد مقالات ذات صلة منشورة حاليًا.',
    searchNoMatch: 'لا توجد مقالات تطابق بحثك.',
    loadingTitle: 'جاري تحميل المقالات',
    loadingBody: 'نجهز لك أحدث المقالات المنشورة.',
    emptyTitle: 'لا توجد مقالات منشورة',
    emptyBody: 'سيظهر المحتوى هنا بعد نشر مقالات معتمدة.',
    errorTitle: 'تعذر تحميل المقالات',
    errorBody: 'تحقق من الاتصال ثم حاول مرة أخرى.',
    retryTitle: 'المقالات غير متاحة مؤقتًا',
    retryBody: 'يمكنك إعادة المحاولة عند عودة الاتصال.',
    retryLabel: 'حاول مرة أخرى',
    permissionTitle: 'لا يمكن عرض هذه المقالات',
    permissionBody: 'لم يسمح الخادم بالوصول إلى المحتوى العام.',
    permissionLink: 'العودة إلى الرئيسية',
    notFoundTitle: 'المقال غير موجود',
    notFoundBody: 'ربما لم يعد المقال منشورًا أو أن الرابط غير صحيح.',
    notFoundLink: 'تصفح المقالات',
    footerDescription: 'محتوى عقاري منشور من مصادر معتمدة.',
    footerLinks: 'روابط المنصة'
  },
  en: {
    title: 'Articles and expert content',
    subtitle: 'Your trusted guide to the Sadat City real-estate market',
    searchLabel: 'Search articles',
    searchPlaceholder: 'Search articles...',
    allCategories: 'All',
    categoryLabel: 'Article categories',
    resultCount: count => `${count} published ${count === 1 ? 'article' : 'articles'}`,
    openArticle: 'Read article',
    readTime: minutes => `${minutes} min read`,
    publishedAt: 'Published',
    authorUnavailable: 'Author details are not available in the public content projection.',
    imageUnavailable: 'Article image unavailable',
    noSummary: 'No published summary is available for this article.',
    backToArticles: 'Back to articles',
    articleBody: 'Article content',
    relatedArticles: 'Related articles',
    noRelatedArticles: 'No related published articles are available yet.',
    searchNoMatch: 'No articles match your search.',
    loadingTitle: 'Loading articles',
    loadingBody: 'Preparing the latest published articles.',
    emptyTitle: 'No published articles',
    emptyBody: 'Approved content will appear here after it is published.',
    errorTitle: 'Articles could not be loaded',
    errorBody: 'Check your connection and try again.',
    retryTitle: 'Articles are temporarily unavailable',
    retryBody: 'You can retry when the connection is available.',
    retryLabel: 'Try again',
    permissionTitle: 'These articles cannot be displayed',
    permissionBody: 'The server did not allow access to public content.',
    permissionLink: 'Back to homepage',
    notFoundTitle: 'Article not found',
    notFoundBody: 'The article may no longer be published or the link may be incorrect.',
    notFoundLink: 'Browse articles',
    footerDescription: 'Published real-estate content from approved sources.',
    footerLinks: 'Platform links'
  },
  'zh-CN': {
    title: '文章与专业内容',
    subtitle: '值得信赖的萨达特城房地产市场指南',
    searchLabel: '搜索文章',
    searchPlaceholder: '搜索文章……',
    allCategories: '全部',
    categoryLabel: '文章分类',
    resultCount: count => `${count} 篇已发布文章`,
    openArticle: '阅读文章',
    readTime: minutes => `${minutes} 分钟阅读`,
    publishedAt: '发布日期',
    authorUnavailable: '公开内容中暂未提供作者信息。',
    imageUnavailable: '文章图片不可用',
    noSummary: '此文章暂未提供已发布摘要。',
    backToArticles: '返回文章',
    articleBody: '文章内容',
    relatedArticles: '相关文章',
    noRelatedArticles: '暂时没有已发布的相关文章。',
    searchNoMatch: '没有符合搜索条件的文章。',
    loadingTitle: '正在加载文章',
    loadingBody: '正在准备最新的已发布文章。',
    emptyTitle: '暂无已发布文章',
    emptyBody: '经批准的内容发布后会显示在这里。',
    errorTitle: '无法加载文章',
    errorBody: '请检查网络连接后重试。',
    retryTitle: '文章暂时不可用',
    retryBody: '网络恢复后可以再次尝试。',
    retryLabel: '重试',
    permissionTitle: '无法显示这些文章',
    permissionBody: '服务器未允许访问公开内容。',
    permissionLink: '返回首页',
    notFoundTitle: '未找到文章',
    notFoundBody: '文章可能已不再发布，或链接不正确。',
    notFoundLink: '浏览文章',
    footerDescription: '来自已批准来源的已发布房地产内容。',
    footerLinks: '平台链接'
  }
};

export function getPublicArticlesCopy(locale: SupportedLocale): PublicArticlesCopy {
  return copyByLocale[locale];
}
