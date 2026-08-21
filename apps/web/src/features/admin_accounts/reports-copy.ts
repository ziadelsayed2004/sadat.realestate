import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface AdminAccountReportsCopy {
  readonly list: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;
    readonly statusLabel: string;
    readonly all: string;
    readonly totalLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly columns: Readonly<Record<'account' | 'type' | 'reason' | 'related' | 'status' | 'created' | 'updated' | 'actions', string>>;
  };
  readonly detail: {
    readonly eyebrow: string;
    readonly title: string;
    readonly reportId: string;
    readonly accountId: string;
    readonly accountType: string;
    readonly reporter: string;
    readonly reason: string;
    readonly details: string;
    readonly related: string;
    readonly created: string;
    readonly updated: string;
    readonly resolution: string;
    readonly resolutionReason: string;
    readonly mutationReason: string;
    readonly mutationReasonHint: string;
    readonly resolve: string;
    readonly dismiss: string;
    readonly openRestrictions: string;
    readonly accountStatus: string;
    readonly availableActions: string;
    readonly beforeAfter: string;
    readonly transitionReason: string;
    readonly transition: string;
    readonly noActions: string;
    readonly noAccountProjection: string;
  };
  readonly restrictions: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly account: string;
    readonly status: string;
    readonly action: string;
    readonly view: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
  };
  readonly states: Readonly<Record<'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found', { readonly title: string; readonly body: string }>>;
  readonly retry: string;
  readonly back: string;
  readonly apply: string;
  readonly clear: string;
  readonly statusLabels: Readonly<Record<string, string>>;
  readonly roleLabels: Readonly<Record<string, string>>;
  readonly actionLabels: Readonly<Record<string, string>>;
  readonly success: string;
}

const english: AdminAccountReportsCopy = {
  list: {
    eyebrow: 'Account moderation',
    title: 'Account reports',
    description: 'Review reported accounts through the explicit moderation projection and resolve only with a reason.',
    searchLabel: 'Search account reports',
    searchPlaceholder: 'Account ID, reason, or report ID',
    statusLabel: 'Report status',
    all: 'All',
    totalLabel: 'reports',
    emptyTitle: 'No account reports found',
    emptyBody: 'No report records match the selected filters.',
    columns: { account: 'Account', type: 'Type', reason: 'Reason', related: 'Related', status: 'Status', created: 'Created', updated: 'Updated', actions: 'Actions' }
  },
  detail: {
    eyebrow: 'Account report',
    title: 'Report details',
    reportId: 'Report ID',
    accountId: 'Account ID',
    accountType: 'Account type',
    reporter: 'Reporter ID',
    reason: 'Reason',
    details: 'Details',
    related: 'Related reports',
    created: 'Created',
    updated: 'Updated',
    resolution: 'Resolution',
    resolutionReason: 'Resolution reason',
    mutationReason: 'Reason for this action',
    mutationReasonHint: 'Enter at least five characters. The API remains authoritative.',
    resolve: 'Resolve report',
    dismiss: 'Dismiss report',
    openRestrictions: 'Open account restrictions',
    accountStatus: 'Current account status',
    availableActions: 'Available account actions',
    beforeAfter: 'Latest account transition',
    transitionReason: 'Reason for account action',
    transition: 'Apply account action',
    noActions: 'No account action is currently available.',
    noAccountProjection: 'The account projection is not available for this report target.'
  },
  restrictions: {
    eyebrow: 'Account restrictions',
    title: 'Account states and restrictions',
    description: 'Review reported account targets and use only the actions returned by the administrator API.',
    account: 'Account',
    status: 'Status',
    action: 'Action',
    view: 'View report',
    emptyTitle: 'No restriction targets found',
    emptyBody: 'Reported account targets will appear here when the API returns them.'
  },
  states: {
    loading: { title: 'Loading account moderation', body: 'Fetching the administrator projection from the live API.' },
    empty: { title: 'No moderation records', body: 'There are no records to display for the current filters.' },
    error: { title: 'Account moderation could not load', body: 'Check the connection and try again.' },
    retry: { title: 'Account moderation is unavailable', body: 'Retry when the connection is available.' },
    permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator with the matching permission.' },
    not_found: { title: 'Record not found', body: 'The requested report or account is no longer available in the administrator projection.' }
  },
  retry: 'Retry',
  back: 'Back to reports',
  apply: 'Apply',
  clear: 'Clear',
  statusLabels: { open: 'Open', in_review: 'In review', resolved: 'Resolved', dismissed: 'Dismissed' },
  roleLabels: { seeker: 'Seeker', provider: 'Provider', admin: 'Administrator' },
  actionLabels: { verify: 'Verify', reject: 'Reject', needs_information: 'Request information', restrict: 'Restrict', suspend: 'Suspend' },
  success: 'The requested moderation action was applied.'
};

const arabic: AdminAccountReportsCopy = {
  ...english,
  list: {
    ...english.list,
    eyebrow: 'مراجعة الحسابات',
    title: 'بلاغات الحسابات',
    description: 'راجع الحسابات المبلغ عنها ونفذ الإجراءات بسبب موثق.',
    searchLabel: 'البحث في البلاغات',
    searchPlaceholder: 'معرف الحساب أو السبب أو معرف البلاغ',
    statusLabel: 'حالة البلاغ',
    all: 'الكل',
    totalLabel: 'بلاغات',
    emptyTitle: 'لا توجد بلاغات حسابات',
    emptyBody: 'لا توجد سجلات تطابق عوامل التصفية الحالية.',
    columns: { account: 'الحساب', type: 'النوع', reason: 'السبب', related: 'مرتبط', status: 'الحالة', created: 'الإنشاء', updated: 'التحديث', actions: 'الإجراءات' }
  },
  detail: {
    ...english.detail,
    eyebrow: 'بلاغ حساب',
    title: 'تفاصيل البلاغ',
    reportId: 'معرف البلاغ',
    accountId: 'معرف الحساب',
    accountType: 'نوع الحساب',
    reporter: 'معرف المبلغ',
    reason: 'السبب',
    details: 'التفاصيل',
    related: 'البلاغات المرتبطة',
    created: 'تاريخ الإنشاء',
    updated: 'آخر تحديث',
    resolution: 'الحالة النهائية',
    resolutionReason: 'سبب الإجراء',
    mutationReason: 'سبب هذا الإجراء',
    mutationReasonHint: 'أدخل خمسة أحرف على الأقل. الواجهة الفعلية هي المصدر.',
    resolve: 'إغلاق البلاغ',
    dismiss: 'رفض البلاغ',
    openRestrictions: 'فتح قيود الحساب',
    accountStatus: 'حالة الحساب الحالية',
    availableActions: 'إجراءات الحساب المتاحة',
    beforeAfter: 'آخر تغيير للحساب',
    transitionReason: 'سبب إجراء الحساب',
    transition: 'تنفيذ إجراء الحساب',
    noActions: 'لا توجد إجراءات متاحة حالياً.',
    noAccountProjection: 'لا تتوفر بيانات الحساب لهذا الهدف.'
  },
  restrictions: {
    ...english.restrictions,
    eyebrow: 'قيود الحسابات',
    title: 'حالات وقيود الحساب',
    description: 'راجع الحسابات واستخدم فقط الإجراءات المعادة من واجهة الإدارة.',
    account: 'الحساب',
    status: 'الحالة',
    action: 'الإجراء',
    view: 'عرض البلاغ',
    emptyTitle: 'لا توجد حسابات مقيدة',
    emptyBody: 'ستظهر الحسابات عند وصول البيانات الفعلية.'
  },
  states: {
    loading: { title: 'جار تحميل الإدارة', body: 'يتم جلب البيانات من المصدر الفعلي.' },
    empty: { title: 'لا توجد سجلات', body: 'لا توجد سجلات لعرضها.' },
    error: { title: 'تعذر تحميل البلاغات', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
    retry: { title: 'خدمة الإدارة غير متاحة', body: 'أعد المحاولة عند توفر الاتصال.' },
    permission: { title: 'الوصول غير مسموح', body: 'تتطلب هذه الصفحة جلسة مدير موثق.' },
    not_found: { title: 'السجل غير موجود', body: 'لم يعد السجل متاحاً.' }
  },
  retry: 'إعادة المحاولة',
  back: 'العودة للبلاغات',
  apply: 'تطبيق',
  clear: 'مسح',
  statusLabels: { open: 'مفتوح', in_review: 'قيد المراجعة', resolved: 'تم الحل', dismissed: 'مرفوض' },
  roleLabels: { seeker: 'باحث عن عقار', provider: 'مقدم عقار', admin: 'مدير' },
  actionLabels: { verify: 'توثيق', reject: 'رفض', needs_information: 'طلب معلومات', restrict: 'تقييد', suspend: 'إيقاف' },
  success: 'تم تنفيذ الإجراء.'
};

const chinese: AdminAccountReportsCopy = {
  ...english,
  list: {
    ...english.list,
    eyebrow: '账户审核',
    title: '账户报告',
    description: '使用已实现的审核数据查看被报告的账户。',
    searchLabel: '搜索账户报告',
    searchPlaceholder: '账户 ID、原因或报告 ID',
    statusLabel: '报告状态',
    all: '全部',
    totalLabel: '份报告',
    emptyTitle: '未找到账户报告',
    emptyBody: '没有匹配当前筛选条件的记录。',
    columns: { account: '账户', type: '类型', reason: '原因', related: '关联', status: '状态', created: '创建时间', updated: '更新时间', actions: '操作' }
  },
  detail: {
    ...english.detail,
    eyebrow: '账户报告',
    title: '报告详情',
    reportId: '报告 ID',
    accountId: '账户 ID',
    accountType: '账户类型',
    reporter: '报告人 ID',
    reason: '原因',
    details: '详情',
    related: '关联报告',
    created: '创建时间',
    updated: '更新时间',
    resolution: '最终状态',
    resolutionReason: '处理原因',
    mutationReason: '本次操作原因',
    mutationReasonHint: '至少输入五个字符。',
    resolve: '解决报告',
    dismiss: '忽略报告',
    openRestrictions: '打开账户限制',
    accountStatus: '当前账户状态',
    availableActions: '可用账户操作',
    beforeAfter: '最近账户变更',
    transitionReason: '账户操作原因',
    transition: '应用账户操作',
    noActions: '当前没有可用操作。',
    noAccountProjection: '此报告目标的账户数据不可用。'
  },
  restrictions: {
    ...english.restrictions,
    eyebrow: '账户限制',
    title: '账户状态与限制',
    description: '仅使用管理员 API 返回的操作。',
    account: '账户',
    status: '状态',
    action: '操作',
    view: '查看报告',
    emptyTitle: '未找到限制目标',
    emptyBody: '当 API 返回数据时，报告目标会显示在此。'
  },
  statusLabels: { ...english.statusLabels, open: '开放', in_review: '审核中', resolved: '已解决', dismissed: '已忽略' },
  roleLabels: { seeker: '求购者', provider: '房产提供方', admin: '管理员' },
  actionLabels: { verify: '验证', reject: '拒绝', needs_information: '请求信息', restrict: '限制', suspend: '暂停' },
  retry: '重试',
  back: '返回报告',
  apply: '应用',
  clear: '清除',
  success: '操作已应用。'
};

const copies: Readonly<Record<SupportedLocale, AdminAccountReportsCopy>> = { ar: arabic, en: english, 'zh-CN': chinese };

export function getAdminAccountReportsCopy(locale: SupportedLocale): AdminAccountReportsCopy {
  return copies[locale];
}
