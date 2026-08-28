import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicAboutTeamCopy {
  readonly aboutEyebrow: string;
  readonly aboutTitle: string;
  readonly aboutSubtitle: string;
  readonly teamEyebrow: string;
  readonly teamTitle: string;
  readonly teamSubtitle: string;
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
  readonly roleUnavailable: string;
  readonly bioUnavailable: string;
  readonly footerDescription: string;
  readonly footerLinks: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, PublicAboutTeamCopy>> = {
  ar: {
    aboutEyebrow: 'عن المنصة',
    aboutTitle: 'منصة السادات للعقارات',
    aboutSubtitle: 'أنشأنا هذه المنصة لأن السوق العقاري في مدينة السادات يحتاج منصة متخصصة وموثوقة.',
    teamEyebrow: 'الفريق',
    teamTitle: 'الأشخاص خلف المنصة',
    teamSubtitle: 'فريق متخصص يعمل يوميًا لتحسين تجربتك.',
    loadingTitle: 'جارٍ تحميل المحتوى',
    loadingBody: 'نجهز المحتوى المنشور من نظام إدارة المحتوى.',
    emptyTitle: 'لا يوجد محتوى منشور بعد',
    emptyBody: 'سيظهر المحتوى هنا بعد نشره من نظام إدارة المحتوى.',
    errorTitle: 'تعذر تحميل المحتوى',
    errorBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    retryTitle: 'المحتوى غير متاح مؤقتًا',
    retryBody: 'أعد المحاولة عند عودة الاتصال.',
    retryLabel: 'إعادة المحاولة',
    permissionTitle: 'لا يمكن عرض المحتوى',
    permissionBody: 'لم يسمح الخادم بالوصول إلى المحتوى العام.',
    permissionLink: 'العودة إلى الصفحة العامة',
    imageUnavailable: 'الصورة غير متاحة',
    roleUnavailable: 'الدور غير متاح',
    bioUnavailable: 'لا توجد نبذة منشورة.',
    footerDescription: 'منصة عامة للعقارات والمحتوى المنشور من مصادر معتمدة.',
    footerLinks: 'روابط المنصة'
  },
  en: {
    aboutEyebrow: 'About the platform',
    aboutTitle: 'Sadat Real Estate platform',
    aboutSubtitle: 'A trusted public gateway for properties and content published by approved sources.',
    teamEyebrow: 'The team',
    teamTitle: 'The people behind the platform',
    teamSubtitle: 'A specialist team working every day to improve your experience.',
    loadingTitle: 'Loading published content',
    loadingBody: 'Preparing content from the CMS.',
    emptyTitle: 'No published content yet',
    emptyBody: 'Content will appear here when it is published by the CMS.',
    errorTitle: 'The content could not load',
    errorBody: 'Check your connection and try again.',
    retryTitle: 'The content is temporarily unavailable',
    retryBody: 'Retry when the connection is available.',
    retryLabel: 'Retry',
    permissionTitle: 'This content cannot be displayed',
    permissionBody: 'The server did not allow access to public content.',
    permissionLink: 'Return to the public homepage',
    imageUnavailable: 'Image unavailable',
    roleUnavailable: 'Role unavailable',
    bioUnavailable: 'No published biography is available.',
    footerDescription: 'A public platform for properties and content from approved sources.',
    footerLinks: 'Platform links'
  },
  'zh-CN': {
    aboutEyebrow: '关于平台',
    aboutTitle: '萨达特房地产平台',
    aboutSubtitle: '展示经批准来源发布的房产和内容的可信公共门户。',
    teamEyebrow: '团队',
    teamTitle: '平台背后的团队',
    teamSubtitle: '专业团队每天持续改善您的体验。',
    loadingTitle: '正在加载已发布内容',
    loadingBody: '正在从 CMS 准备内容。',
    emptyTitle: '暂时没有已发布内容',
    emptyBody: 'CMS 发布内容后将在此显示。',
    errorTitle: '无法加载内容',
    errorBody: '请检查网络连接后重试。',
    retryTitle: '内容暂时不可用',
    retryBody: '连接恢复后可以再次尝试。',
    retryLabel: '重试',
    permissionTitle: '无法显示此内容',
    permissionBody: '服务器未允许访问公共内容。',
    permissionLink: '返回公共首页',
    imageUnavailable: '图片不可用',
    roleUnavailable: '职位不可用',
    bioUnavailable: '暂无已发布简介。',
    footerDescription: '展示经批准来源发布的房产和内容的公共平台。',
    footerLinks: '平台链接'
  }
};

export function getPublicAboutTeamCopy(locale: SupportedLocale): PublicAboutTeamCopy {
  return copyByLocale[locale];
}
