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
  },};

export function getPublicAboutTeamCopy(locale: SupportedLocale): PublicAboutTeamCopy {
  return copyByLocale[locale];
}
