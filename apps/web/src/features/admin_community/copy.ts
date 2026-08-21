import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminCommunityView = 'posts' | 'comments' | 'reports';
export type AdminCommunityState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'success';

export interface AdminCommunityCopy {
  readonly eyebrow: string;
  readonly title: Record<AdminCommunityView, string>;
  readonly description: Record<AdminCommunityView, string>;
  readonly tab: Record<AdminCommunityView, string>;
  readonly search: string;
  readonly searchPlaceholder: string;
  readonly status: string;
  readonly postId: string;
  readonly all: string;
  readonly apply: string;
  readonly clear: string;
  readonly retry: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, totalPages: number) => string;
  readonly columns: {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly post: string;
    readonly author: string;
    readonly reporter: string;
    readonly reason: string;
    readonly details: string;
    readonly status: string;
    readonly comments: string;
    readonly created: string;
    readonly updated: string;
    readonly actions: string;
  };
  readonly postStatus: Record<'draft' | 'published' | 'hidden' | 'removed', string>;
  readonly commentStatus: Record<'visible' | 'hidden' | 'removed', string>;
  readonly reportStatus: Record<'open' | 'in_review' | 'resolved' | 'dismissed', string>;
  readonly reportReason: Record<'spam' | 'abuse' | 'misinformation' | 'other', string>;
  readonly action: { readonly review: string; readonly resolve: string; readonly dismiss: string; readonly close: string };
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly confirm: string;
  readonly records: string;
  readonly visible: string;
  readonly pageLabel: string;
  readonly pageSize: string;
  readonly noActions: string;
  readonly states: Record<Exclude<AdminCommunityState, 'success' | 'empty'>, { readonly title: string; readonly body: string }>;
  readonly empty: { readonly title: string; readonly body: string };
  readonly directionNote: string;
}

const copyByLocale: Record<SupportedLocale, AdminCommunityCopy> = {
  ar: {
    eyebrow: 'إدارة المجتمع',
    title: { posts: 'إدارة المجتمع', comments: 'التعليقات', reports: 'البلاغات والإشراف' },
    description: { posts: 'راجع منشورات مجتمع مدينة السادات من الإسقاط المعتمد للخادم.', comments: 'راجع التعليقات وحالتها دون عرض بيانات داخلية غير مصرح بها.', reports: 'راجع البلاغات الواردة واتخذ القرار بسبب واضح وإصدار متوقع.' },
    tab: { posts: 'المنشورات', comments: 'التعليقات', reports: 'البلاغات' },
    search: 'بحث', searchPlaceholder: 'ابحث في العنوان أو المحتوى', status: 'الحالة', postId: 'معرّف المنشور', all: 'الكل', apply: 'تطبيق', clear: 'مسح', retry: 'إعادة المحاولة', previous: 'السابق', next: 'التالي', page: (page, totalPages) => `صفحة ${page} من ${totalPages}`,
    columns: { id: 'المعرّف', title: 'العنوان', body: 'المحتوى', post: 'المنشور', author: 'الكاتب', reporter: 'المبلّغ', reason: 'السبب', details: 'التفاصيل', status: 'الحالة', comments: 'التعليقات', created: 'تاريخ الإنشاء', updated: 'آخر تحديث', actions: 'الإجراءات' },
    postStatus: { draft: 'مسودة', published: 'منشور', hidden: 'مخفي', removed: 'محذوف' }, commentStatus: { visible: 'ظاهر', hidden: 'مخفي', removed: 'محذوف' }, reportStatus: { open: 'مفتوح', in_review: 'قيد المراجعة', resolved: 'تم الحل', dismissed: 'مرفوض' }, reportReason: { spam: 'رسائل مزعجة', abuse: 'إساءة', misinformation: 'معلومات مضللة', other: 'أخرى' },
    action: { review: 'مراجعة', resolve: 'حل البلاغ', dismiss: 'رفض البلاغ', close: 'إغلاق' }, reason: 'سبب القرار', reasonPlaceholder: 'اكتب سبباً واضحاً من خمسة أحرف على الأقل', reasonRequired: 'سبب القرار مطلوب.', confirm: 'تأكيد', records: 'إجمالي السجلات', visible: 'في الصفحة الحالية', pageLabel: 'الصفحة', pageSize: 'حجم الصفحة', noActions: 'لا توجد إجراءات متاحة',
    states: { loading: { title: 'جارٍ تحميل المجتمع', body: 'يتم جلب السجلات من المصدر المعتمد.' }, error: { title: 'تعذر تحميل المجتمع', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الاتصال غير متاح مؤقتاً', body: 'أعد المحاولة دون تغيير الفلاتر الحالية.' }, permission: { title: 'الوصول غير متاح', body: 'تحتاج هذه الصفحة إلى جلسة مدير وصلاحية المجتمع المناسبة.' } },
    empty: { title: 'لا توجد سجلات', body: 'لا توجد بيانات مطابقة للفلاتر الحالية.' }, directionNote: 'العربية RTL — إدارة المجتمع متاحة لسطح المكتب.'
  },
  en: {
    eyebrow: 'Community administration',
    title: { posts: 'Community management', comments: 'Comments', reports: 'Reports and moderation' },
    description: { posts: 'Review community posts from the server-approved projection.', comments: 'Review comment content and state without exposing unrelated internal data.', reports: 'Review incoming reports and resolve them with a clear reason and version.' },
    tab: { posts: 'Posts', comments: 'Comments', reports: 'Reports' },
    search: 'Search', searchPlaceholder: 'Search title or content', status: 'Status', postId: 'Post ID', all: 'All', apply: 'Apply', clear: 'Clear', retry: 'Retry', previous: 'Previous', next: 'Next', page: (page, totalPages) => `Page ${page} of ${totalPages}`,
    columns: { id: 'ID', title: 'Title', body: 'Content', post: 'Post', author: 'Author', reporter: 'Reporter', reason: 'Reason', details: 'Details', status: 'Status', comments: 'Comments', created: 'Created', updated: 'Updated', actions: 'Actions' },
    postStatus: { draft: 'Draft', published: 'Published', hidden: 'Hidden', removed: 'Removed' }, commentStatus: { visible: 'Visible', hidden: 'Hidden', removed: 'Removed' }, reportStatus: { open: 'Open', in_review: 'In review', resolved: 'Resolved', dismissed: 'Dismissed' }, reportReason: { spam: 'Spam', abuse: 'Abuse', misinformation: 'Misinformation', other: 'Other' },
    action: { review: 'Review', resolve: 'Resolve report', dismiss: 'Dismiss report', close: 'Close' }, reason: 'Decision reason', reasonPlaceholder: 'Write a clear reason of at least five characters', reasonRequired: 'A decision reason is required.', confirm: 'Confirm', records: 'Total records', visible: 'Visible on page', pageLabel: 'Page', pageSize: 'Page size', noActions: 'No actions available',
    states: { loading: { title: 'Loading community data', body: 'Fetching records from the approved source.' }, error: { title: 'Community data could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current filters.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching community permission.' } },
    empty: { title: 'No records found', body: 'No records match the current filters.' }, directionNote: 'English LTR — community administration is approved for desktop.'
  },
  'zh-CN': {
    eyebrow: '社区管理',
    title: { posts: '社区管理', comments: '评论', reports: '举报与审核' },
    description: { posts: '根据服务器批准的投影查看社区帖子。', comments: '查看评论内容和状态，不暴露无关的内部数据。', reports: '查看收到的举报，并使用明确原因和版本进行处理。' },
    tab: { posts: '帖子', comments: '评论', reports: '举报' },
    search: '搜索', searchPlaceholder: '搜索标题或内容', status: '状态', postId: '帖子 ID', all: '全部', apply: '应用', clear: '清除', retry: '重试', previous: '上一页', next: '下一页', page: (page, totalPages) => `第 ${page} 页，共 ${totalPages} 页`,
    columns: { id: '编号', title: '标题', body: '内容', post: '帖子', author: '作者', reporter: '举报人', reason: '原因', details: '详情', status: '状态', comments: '评论', created: '创建时间', updated: '更新时间', actions: '操作' },
    postStatus: { draft: '草稿', published: '已发布', hidden: '隐藏', removed: '已删除' }, commentStatus: { visible: '可见', hidden: '隐藏', removed: '已删除' }, reportStatus: { open: '打开', in_review: '审核中', resolved: '已解决', dismissed: '已驳回' }, reportReason: { spam: '垃圾信息', abuse: '滥用', misinformation: '错误信息', other: '其他' },
    action: { review: '审核', resolve: '解决举报', dismiss: '驳回举报', close: '关闭' }, reason: '决定原因', reasonPlaceholder: '请输入至少五个字符的明确原因', reasonRequired: '必须填写决定原因。', confirm: '确认', records: '记录总数', visible: '当前页可见', pageLabel: '页码', pageSize: '每页数量', noActions: '没有可用操作',
    states: { loading: { title: '正在加载社区数据', body: '正在从批准的数据源获取记录。' }, error: { title: '无法加载社区数据', body: '请检查连接后重试。' }, retry: { title: '连接暂时不可用', body: '可以在不更改当前筛选条件的情况下重试。' }, permission: { title: '无法访问', body: '此页面需要已认证的管理员会话和相应的社区权限。' } },
    empty: { title: '未找到记录', body: '没有符合当前筛选条件的记录。' }, directionNote: '简体中文 LTR — 社区管理仅批准桌面端。'
  }
};

export function getAdminCommunityCopy(locale: SupportedLocale): AdminCommunityCopy {
  return copyByLocale[locale];
}
