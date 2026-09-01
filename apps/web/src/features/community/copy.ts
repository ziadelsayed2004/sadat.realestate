import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface CommunityCopy {
  readonly title: string;
  readonly subtitle: string;
  readonly moderationNotice: string;
  readonly composerModerationNotice: string;
  readonly createPost: string;
  readonly publishPost: string;
  readonly allPosts: string;
  readonly publishedCount: (count: number) => string;
  readonly comments: (count: number) => string;
  readonly openDiscussion: string;
  readonly closeDiscussion: string;
  readonly postTitle: string;
  readonly postBody: string;
  readonly postTitlePlaceholder: string;
  readonly postBodyPlaceholder: string;
  readonly composerPostBodyPlaceholder: string;
  readonly commentLabel: string;
  readonly commentPlaceholder: string;
  readonly submitComment: string;
  readonly reportPost: string;
  readonly reportReason: string;
  readonly reportDetails: string;
  readonly reportDetailsPlaceholder: string;
  readonly submitReport: string;
  readonly cancel: string;
  readonly close: string;
  readonly signInToContinue: string;
  readonly signIn: string;
  readonly authenticationRequired: string;
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
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly successTitle: string;
  readonly postCreated: string;
  readonly commentCreated: string;
  readonly reportCreated: string;
  readonly validationTitle: string;
  readonly validationBody: string;
  readonly mutationErrorTitle: string;
  readonly mutationErrorBody: string;
  readonly reportReasons: Readonly<Record<'spam' | 'abuse' | 'misinformation' | 'other', string>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, CommunityCopy>> = {
  ar: {
    title: 'آراء وتجارب المقيمين',
    subtitle: 'شارك الأسئلة والتجارب العقارية المنشورة بأمان مع مجتمع المنصة.',
    moderationNotice: 'سيتم مراجعة كل بوست من فريق الإشراف قبل ظهوره للعامة',
    composerModerationNotice: 'سيتم مراجعة البوست قبل ظهوره للعامة',
    createPost: 'انشر بوست',
    publishPost: 'نشر البوست',
    allPosts: 'الكل',
    publishedCount: count => `${count} مشاركة منشورة`,
    comments: count => `${count} تعليق`,
    openDiscussion: 'عرض النقاش',
    closeDiscussion: 'إغلاق النقاش',
    postTitle: 'عنوان البوست',
    postBody: 'محتوى البوست',
    postTitlePlaceholder: 'عنوان البوست',
    postBodyPlaceholder: 'محتوى البوست…',
    composerPostBodyPlaceholder: 'محتوى البوست...',
    commentLabel: 'أضف تعليقاً',
    commentPlaceholder: 'اكتب تعليقك',
    submitComment: 'نشر التعليق',
    reportPost: 'الإبلاغ عن المشاركة',
    reportReason: 'سبب البلاغ',
    reportDetails: 'تفاصيل البلاغ',
    reportDetailsPlaceholder: 'اذكر سبب البلاغ باختصار',
    submitReport: 'إرسال البلاغ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    signInToContinue: 'سجّل الدخول للمشاركة والتعليق والإبلاغ.',
    signIn: 'تسجيل الدخول',
    authenticationRequired: 'تسجيل الدخول مطلوب',
    loadingTitle: 'جارٍ تحميل المجتمع',
    loadingBody: 'نجهز أحدث المشاركات المنشورة.',
    emptyTitle: 'لا توجد مشاركات منشورة',
    emptyBody: 'ستظهر المشاركات هنا بعد اعتمادها ونشرها.',
    errorTitle: 'تعذر تحميل المجتمع',
    errorBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    retryTitle: 'المجتمع غير متاح مؤقتاً',
    retryBody: 'يمكنك إعادة المحاولة عند عودة الاتصال.',
    retryLabel: 'حاول مرة أخرى',
    permissionTitle: 'لا يمكن عرض المجتمع',
    permissionBody: 'لم يسمح الخادم بالوصول إلى المحتوى العام.',
    notFoundTitle: 'المشاركة غير موجودة',
    notFoundBody: 'ربما لم تعد المشاركة منشورة أو أن الرابط غير صحيح.',
    successTitle: 'تم بنجاح',
    postCreated: 'تم إرسال مشاركتك للمراجعة.',
    commentCreated: 'تم إرسال تعليقك للمراجعة.',
    reportCreated: 'تم إرسال البلاغ للمراجعة.',
    validationTitle: 'راجع البيانات المدخلة',
    validationBody: 'أكمل الحقول المطلوبة قبل الإرسال.',
    mutationErrorTitle: 'تعذر إكمال العملية',
    mutationErrorBody: 'تحقق من صلاحيتك وحاول مرة أخرى.',
    reportReasons: { spam: 'محتوى مزعج', abuse: 'إساءة', misinformation: 'معلومات مضللة', other: 'سبب آخر' }
  },
  en: {
    title: 'Sadat Real Estate community',
    subtitle: 'Share published property questions and experiences safely with the platform community.',
    moderationNotice: 'Posts and comments are reviewed before they become public.',
    composerModerationNotice: 'Posts are reviewed before they become public.',
    createPost: 'Create a post',
    publishPost: 'Publish post',
    allPosts: 'All posts',
    publishedCount: count => `${count} published ${count === 1 ? 'post' : 'posts'}`,
    comments: count => `${count} ${count === 1 ? 'comment' : 'comments'}`,
    openDiscussion: 'Open discussion',
    closeDiscussion: 'Close discussion',
    postTitle: 'Post title',
    postBody: 'Post body',
    postTitlePlaceholder: 'Write a clear title',
    postBodyPlaceholder: 'Share a property question or experience',
    composerPostBodyPlaceholder: 'Post content...',
    commentLabel: 'Add a comment',
    commentPlaceholder: 'Write your comment',
    submitComment: 'Post comment',
    reportPost: 'Report post',
    reportReason: 'Report reason',
    reportDetails: 'Report details',
    reportDetailsPlaceholder: 'Briefly describe the reason for reporting',
    submitReport: 'Send report',
    cancel: 'Cancel',
    close: 'Close',
    signInToContinue: 'Sign in to post, comment, or report community content.',
    signIn: 'Sign in',
    authenticationRequired: 'Sign-in required',
    loadingTitle: 'Loading the community',
    loadingBody: 'Preparing the latest published posts.',
    emptyTitle: 'No published posts',
    emptyBody: 'Posts will appear here after they are approved and published.',
    errorTitle: 'The community could not load',
    errorBody: 'Check your connection and try again.',
    retryTitle: 'The community is temporarily unavailable',
    retryBody: 'Retry when the connection is available.',
    retryLabel: 'Try again',
    permissionTitle: 'The community cannot be displayed',
    permissionBody: 'The server did not allow access to public community content.',
    notFoundTitle: 'Post not found',
    notFoundBody: 'The post may no longer be published or the link may be incorrect.',
    successTitle: 'Done',
    postCreated: 'Your post was sent for moderation.',
    commentCreated: 'Your comment was sent for moderation.',
    reportCreated: 'Your report was sent for review.',
    validationTitle: 'Check the entered details',
    validationBody: 'Complete the required fields before submitting.',
    mutationErrorTitle: 'The action could not be completed',
    mutationErrorBody: 'Check your permission and try again.',
    reportReasons: { spam: 'Spam', abuse: 'Abuse', misinformation: 'Misinformation', other: 'Other' }
  },};

export function getCommunityCopy(locale: SupportedLocale): CommunityCopy {
  return copyByLocale[locale];
}
