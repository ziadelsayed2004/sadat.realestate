import type { ProjectReviewAction, ProjectStatus, SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminProjectsState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminProjectsCopy {
  readonly eyebrow: string;
  readonly listTitle: string;
  readonly listDescription: string;
  readonly reviewTitle: string;
  readonly reviewDescription: string;
  readonly navigationLabel: string;
  readonly allProjects: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly review: string;
  readonly back: string;
  readonly retry: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, total: number) => string;
  readonly count: (count: number) => string;
  readonly columns: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly status: string;
    readonly version: string;
    readonly updated: string;
    readonly actions: string;
  };
  readonly status: Readonly<Record<ProjectStatus, string>>;
  readonly action: Readonly<Record<ProjectReviewAction, string>>;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly submitReview: string;
  readonly reviewing: string;
  readonly reviewSaved: string;
  readonly states: Readonly<Record<AdminProjectsState, { readonly title: string; readonly body: string }>>;
  readonly unavailable: string;
  readonly noActions: string;
  readonly directionNote: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminProjectsCopy>> = {
  ar: {
    eyebrow: 'إدارة المشاريع',
    listTitle: 'إدارة المشاريع',
    listDescription: 'راجع المشاريع وتحقق من حالتها قبل اعتمادها ونشرها.',
    reviewTitle: 'مراجعة المشروع',
    reviewDescription: 'راجع البيانات المتاحة واتخذ إجراءً من الإجراءات المسموح بها.',
    navigationLabel: 'إدارة المشاريع',
    allProjects: 'جميع المشاريع',
    searchLabel: 'البحث في المشاريع',
    searchPlaceholder: 'ابحث بالاسم أو المعرّف المختصر',
    statusLabel: 'الحالة',
    allStatuses: 'كل الحالات',
    apply: 'تطبيق',
    clear: 'مسح',
    review: 'مراجعة',
    back: 'العودة إلى المشاريع',
    retry: 'إعادة المحاولة',
    previous: 'السابق',
    next: 'التالي',
    page: (page, total) => `الصفحة ${page} من ${total}`,
    count: count => `${count.toLocaleString('ar-EG')} مشروع`,
    columns: { id: 'رقم المشروع', name: 'اسم المشروع', slug: 'المعرّف المختصر', status: 'الحالة', version: 'الإصدار', updated: 'آخر تحديث', actions: 'الإجراءات' },
    status: { draft: 'مسودة', pending_review: 'قيد المراجعة', needs_changes: 'يحتاج تعديلات', approved: 'معتمد', published: 'منشور', rejected: 'مرفوض', hidden: 'مخفي', archived: 'مؤرشف' },
    action: { needs_changes: 'طلب تعديلات', approve: 'اعتماد', reject: 'رفض', publish: 'نشر' },
    reasonLabel: 'سبب الإجراء',
    reasonPlaceholder: 'اكتب سبباً واضحاً لا يقل عن خمسة أحرف',
    reasonRequired: 'سبب الإجراء مطلوب.',
    submitReview: 'حفظ الإجراء',
    reviewing: 'جارٍ الحفظ',
    reviewSaved: 'تم حفظ الإجراء.',
    states: {
      loading: { title: 'جارٍ تحميل المشاريع', body: 'يتم جلب المشاريع من المصدر المعتمد.' },
      empty: { title: 'لا توجد مشاريع', body: 'لا توجد مشاريع مطابقة للبحث أو الحالة المحددة.' },
      error: { title: 'تعذر تحميل المشاريع', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      retry: { title: 'الاتصال غير متاح مؤقتاً', body: 'يمكنك إعادة المحاولة دون تغيير البيانات.' },
      permission: { title: 'الوصول غير متاح', body: 'تحتاج هذه الصفحة إلى جلسة مدير مصادق عليها والصلاحية المناسبة.' },
      not_found: { title: 'المشروع غير موجود', body: 'تعذر العثور على المشروع المطلوب ضمن الإسقاط المتاح.' },
      success: { title: 'المشاريع جاهزة', body: 'تُعرض البيانات من الإسقاط المعتمد للخادم.' }
    },
    unavailable: 'غير متاح',
    noActions: 'لا توجد إجراءات متاحة',
    directionNote: 'العربية RTL — سطح إدارة المشاريع معتمد لسطح المكتب.'
  },
  en: {
    eyebrow: 'Project administration',
    listTitle: 'Projects management',
    listDescription: 'Review projects and their state before approval and publication.',
    reviewTitle: 'Project review',
    reviewDescription: 'Review the available projection and take an action permitted by the server.',
    navigationLabel: 'Project administration',
    allProjects: 'All projects',
    searchLabel: 'Search projects',
    searchPlaceholder: 'Search by name or slug',
    statusLabel: 'Status',
    allStatuses: 'All statuses',
    apply: 'Apply',
    clear: 'Clear',
    review: 'Review',
    back: 'Back to projects',
    retry: 'Retry',
    previous: 'Previous',
    next: 'Next',
    page: (page, total) => `Page ${page} of ${total}`,
    count: count => `${count.toLocaleString('en-US')} projects`,
    columns: { id: 'Project ID', name: 'Project name', slug: 'Slug', status: 'Status', version: 'Version', updated: 'Updated', actions: 'Actions' },
    status: { draft: 'Draft', pending_review: 'Under review', needs_changes: 'Needs changes', approved: 'Approved', published: 'Published', rejected: 'Rejected', hidden: 'Hidden', archived: 'Archived' },
    action: { needs_changes: 'Request changes', approve: 'Approve', reject: 'Reject', publish: 'Publish' },
    reasonLabel: 'Action reason',
    reasonPlaceholder: 'Write a clear reason of at least five characters',
    reasonRequired: 'An action reason is required.',
    submitReview: 'Save action',
    reviewing: 'Saving',
    reviewSaved: 'Action saved.',
    states: {
      loading: { title: 'Loading projects', body: 'Fetching projects from the approved source.' },
      empty: { title: 'No projects found', body: 'No projects match the selected search or status.' },
      error: { title: 'Projects could not load', body: 'Check the connection and try again.' },
      retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' },
      permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching permission.' },
      not_found: { title: 'Project not found', body: 'The requested project is not present in the available projection.' },
      success: { title: 'Projects ready', body: 'Records are rendered from the server-approved projection.' }
    },
    unavailable: 'Unavailable',
    noActions: 'No actions available',
    directionNote: 'English LTR — project administration is approved for desktop.'
  },
  'zh-CN': {
    eyebrow: '项目管理',
    listTitle: '项目管理',
    listDescription: '在批准和发布前查看项目及其状态。',
    reviewTitle: '项目审核',
    reviewDescription: '查看可用数据，并执行服务器允许的操作。',
    navigationLabel: '项目管理',
    allProjects: '全部项目',
    searchLabel: '搜索项目',
    searchPlaceholder: '按名称或 Slug 搜索',
    statusLabel: '状态',
    allStatuses: '所有状态',
    apply: '应用',
    clear: '清除',
    review: '审核',
    back: '返回项目',
    retry: '重试',
    previous: '上一页',
    next: '下一页',
    page: (page, total) => `第 ${page} 页，共 ${total} 页`,
    count: count => `${count.toLocaleString('zh-CN')} 个项目`,
    columns: { id: '项目编号', name: '项目名称', slug: 'Slug', status: '状态', version: '版本', updated: '更新时间', actions: '操作' },
    status: { draft: '草稿', pending_review: '审核中', needs_changes: '需要修改', approved: '已批准', published: '已发布', rejected: '已拒绝', hidden: '已隐藏', archived: '已归档' },
    action: { needs_changes: '请求修改', approve: '批准', reject: '拒绝', publish: '发布' },
    reasonLabel: '操作原因',
    reasonPlaceholder: '请输入至少五个字符的明确原因',
    reasonRequired: '必须填写操作原因。',
    submitReview: '保存操作',
    reviewing: '正在保存',
    reviewSaved: '操作已保存。',
    states: {
      loading: { title: '正在加载项目', body: '正在从已批准的数据源获取项目。' },
      empty: { title: '未找到项目', body: '没有符合当前搜索或状态的项目。' },
      error: { title: '无法加载项目', body: '请检查连接后重试。' },
      retry: { title: '连接暂时不可用', body: '可以在不改变当前数据的情况下重试。' },
      permission: { title: '无法访问', body: '此页面需要经过认证的管理员会话及相应权限。' },
      not_found: { title: '未找到项目', body: '可用数据中没有请求的项目。' },
      success: { title: '项目已就绪', body: '记录来自服务器批准的安全投影。' }
    },
    unavailable: '不可用',
    noActions: '没有可用操作',
    directionNote: '简体中文 LTR — 项目管理界面仅批准桌面端。'
  }
};

export function getAdminProjectsCopy(locale: SupportedLocale): AdminProjectsCopy {
  return copyByLocale[locale];
}
