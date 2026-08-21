import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface CommunityCopy {
  readonly title: string;
  readonly subtitle: string;
  readonly moderationNotice: string;
  readonly createPost: string;
  readonly allPosts: string;
  readonly publishedCount: (count: number) => string;
  readonly comments: (count: number) => string;
  readonly openDiscussion: string;
  readonly closeDiscussion: string;
  readonly postTitle: string;
  readonly postBody: string;
  readonly postTitlePlaceholder: string;
  readonly postBodyPlaceholder: string;
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
    title: 'مجتمع عقارات السادات',
    subtitle: 'شارك الأسئلة والتجارب العقارية المنشورة بأمان مع مجتمع المنصة.',
    moderationNotice: 'تخضع المشاركات والتعليقات للمراجعة قبل ظهورها للعامة.',
    createPost: 'إنشاء مشاركة',
    allPosts: 'كل المشاركات',
    publishedCount: count => `${count} مشاركة منشورة`,
    comments: count => `${count} تعليق`,
    openDiscussion: 'عرض النقاش',
    closeDiscussion: 'إغلاق النقاش',
    postTitle: 'عنوان المشاركة',
    postBody: 'نص المشاركة',
    postTitlePlaceholder: 'اكتب عنواناً واضحاً',
    postBodyPlaceholder: 'شارك سؤالك أو تجربتك العقارية',
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
    createPost: 'Create a post',
    allPosts: 'All posts',
    publishedCount: count => `${count} published ${count === 1 ? 'post' : 'posts'}`,
    comments: count => `${count} ${count === 1 ? 'comment' : 'comments'}`,
    openDiscussion: 'Open discussion',
    closeDiscussion: 'Close discussion',
    postTitle: 'Post title',
    postBody: 'Post body',
    postTitlePlaceholder: 'Write a clear title',
    postBodyPlaceholder: 'Share a property question or experience',
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
  },
  'zh-CN': {
    title: '萨达特房地产社区',
    subtitle: '与平台社区安全分享已发布的房地产问题和经验。',
    moderationNotice: '帖子和评论经过审核后才会公开。',
    createPost: '创建帖子',
    allPosts: '全部帖子',
    publishedCount: count => `${count} 个已发布帖子`,
    comments: count => `${count} 条评论`,
    openDiscussion: '查看讨论',
    closeDiscussion: '关闭讨论',
    postTitle: '帖子标题',
    postBody: '帖子内容',
    postTitlePlaceholder: '写一个清晰的标题',
    postBodyPlaceholder: '分享房地产问题或经验',
    commentLabel: '添加评论',
    commentPlaceholder: '写下你的评论',
    submitComment: '发布评论',
    reportPost: '举报帖子',
    reportReason: '举报原因',
    reportDetails: '举报详情',
    reportDetailsPlaceholder: '简要说明举报原因',
    submitReport: '提交举报',
    cancel: '取消',
    close: '关闭',
    signInToContinue: '登录后即可发帖、评论或举报社区内容。',
    signIn: '登录',
    authenticationRequired: '需要登录',
    loadingTitle: '正在加载社区',
    loadingBody: '正在准备最新的已发布帖子。',
    emptyTitle: '暂无已发布帖子',
    emptyBody: '帖子通过审核并发布后会显示在这里。',
    errorTitle: '无法加载社区',
    errorBody: '请检查网络连接后重试。',
    retryTitle: '社区暂时不可用',
    retryBody: '网络恢复后可以再次尝试。',
    retryLabel: '重试',
    permissionTitle: '无法显示社区',
    permissionBody: '服务器未允许访问公开社区内容。',
    notFoundTitle: '未找到帖子',
    notFoundBody: '帖子可能已不再发布，或链接不正确。',
    successTitle: '完成',
    postCreated: '你的帖子已提交审核。',
    commentCreated: '你的评论已提交审核。',
    reportCreated: '你的举报已提交审核。',
    validationTitle: '请检查输入内容',
    validationBody: '提交前请填写必填字段。',
    mutationErrorTitle: '无法完成操作',
    mutationErrorBody: '请检查权限后重试。',
    reportReasons: { spam: '垃圾内容', abuse: '滥用', misinformation: '错误信息', other: '其他' }
  }
};

export function getCommunityCopy(locale: SupportedLocale): CommunityCopy {
  return copyByLocale[locale];
}
