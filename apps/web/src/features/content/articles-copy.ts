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
  readonly introduction: string;
  readonly relatedArticles: string;
  readonly relatedProperties: string;
  readonly ctaTitle: string;
  readonly ctaAction: string;
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
    introduction: '\u0645\u0642\u062f\u0645\u0629',
    relatedArticles: 'مقالات ذات صلة',
    relatedProperties: '\u0639\u0642\u0627\u0631\u0627\u062a \u0630\u0627\u062a \u0635\u0644\u0629',
    ctaTitle: 'هل تبحث عن عقار مناسب؟',
    ctaAction: 'ابحث الآن',
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
    introduction: 'Introduction',
    relatedArticles: 'Related articles',
    relatedProperties: 'Related properties',
    ctaTitle: 'Looking for the right property?',
    ctaAction: 'Search now',
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
  },};

export function getPublicArticlesCopy(locale: SupportedLocale): PublicArticlesCopy {
  return copyByLocale[locale];
}
