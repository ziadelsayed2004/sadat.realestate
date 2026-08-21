import type { PropertyAvailableAction, PropertyReportAction, PropertyReportReason, PropertyReportStatus, PropertyStatus, PropertyVisibilityAction, SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminPropertiesView = 'list' | 'review' | 'duplicates' | 'reports';
export type AdminPropertiesState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminPropertiesCopy {
  readonly eyebrow: string;
  readonly titles: Readonly<Record<AdminPropertiesView, string>>;
  readonly descriptions: Readonly<Record<AdminPropertiesView, string>>;
  readonly allProperties: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly statusLabel: string;
  readonly activeLabel: string;
  readonly providerLabel: string;
  readonly projectLabel: string;
  readonly allStatuses: string;
  readonly allActivity: string;
  readonly active: string;
  readonly inactive: string;
  readonly apply: string;
  readonly clear: string;
  readonly retry: string;
  readonly review: string;
  readonly details: string;
  readonly duplicates: string;
  readonly reports: string;
  readonly back: string;
  readonly openDuplicates: string;
  readonly openReports: string;
  readonly openProperty: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, total: number) => string;
  readonly count: (count: number) => string;
  readonly candidateCount: (count: number) => string;
  readonly columns: {
    readonly id: string;
    readonly name: string;
    readonly source: string;
    readonly kind: string;
    readonly transaction: string;
    readonly status: string;
    readonly active: string;
    readonly version: string;
    readonly updated: string;
    readonly reason: string;
    readonly actions: string;
    readonly reportId: string;
    readonly propertyId: string;
    readonly reportReason: string;
    readonly priority: string;
    readonly date: string;
  };
  readonly status: Readonly<Record<PropertyStatus, string>>;
  readonly availableAction: Readonly<Record<PropertyAvailableAction, string>>;
  readonly visibilityAction: Readonly<Record<PropertyVisibilityAction, string>>;
  readonly reportStatus: Readonly<Record<PropertyReportStatus, string>>;
  readonly reportAction: Readonly<Record<PropertyReportAction, string>>;
  readonly reportReason: Readonly<Record<PropertyReportReason, string>>;
  readonly signal: Readonly<Record<'same_slug' | 'same_location_transaction' | 'same_localized_name', string>>;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly saveAction: string;
  readonly saving: string;
  readonly actionSaved: string;
  readonly noActions: string;
  readonly noCandidates: string;
  readonly noReports: string;
  readonly detailsLabel: string;
  readonly states: Readonly<Record<AdminPropertiesState, { readonly title: string; readonly body: string }>>;
  readonly directionNote: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminPropertiesCopy>> = {
  ar: {
    eyebrow: 'إدارة العقارات',
    titles: { list: 'إدارة العقارات', review: 'مراجعة العقار', duplicates: 'عقارات محتملة التكرار', reports: 'بلاغات العقارات' },
    descriptions: {
      list: 'راجع العقارات الجديدة والتعديلات قبل اعتماد النشر.',
      review: 'اعرض الإسقاط الآمن للعقار واتخذ إجراءً مسموحًا من الخادم.',
      duplicates: 'افحص إشارات التكرار المفسرة قبل اتخاذ قرار المراجعة.',
      reports: 'راجع بلاغات العقارات وحدث حالتها بسبب واضح.'
    },
    allProperties: 'جميع العقارات', searchLabel: 'البحث في العقارات', searchPlaceholder: 'ابحث بالاسم أو المعرّف المختصر', statusLabel: 'الحالة', activeLabel: 'النشاط', providerLabel: 'معرّف مقدم العقار', projectLabel: 'معرّف المشروع', allStatuses: 'كل الحالات', allActivity: 'كل حالات النشاط', active: 'نشط', inactive: 'غير نشط', apply: 'تطبيق', clear: 'مسح', retry: 'إعادة المحاولة', review: 'بدء المراجعة', details: 'عرض التفاصيل', duplicates: 'التكرار المحتمل', reports: 'البلاغات', back: 'العودة إلى العقارات', openDuplicates: 'فحص التكرار', openReports: 'فتح البلاغات', openProperty: 'فتح العقار', previous: 'السابق', next: 'التالي', page: (page, total) => `الصفحة ${page} من ${total}`, count: count => `${count.toLocaleString('ar-EG')} عقار`, candidateCount: count => `${count.toLocaleString('ar-EG')} نتائج محتملة`,
    columns: { id: 'رقم العقار', name: 'العقار', source: 'مصدر العقار', kind: 'النوع', transaction: 'نوع المعاملة', status: 'الحالة', active: 'النشاط', version: 'الإصدار', updated: 'آخر تحديث', reason: 'سبب الإجراء', actions: 'الإجراءات', reportId: 'رقم البلاغ', propertyId: 'رقم العقار', reportReason: 'سبب البلاغ', priority: 'الأولوية', date: 'التاريخ' },
    status: { draft: 'مسودة', pending_review: 'قيد المراجعة', needs_changes: 'يحتاج تعديلًا', approved: 'معتمد', published: 'منشور', rejected: 'مرفوض', hidden: 'مخفي', archived: 'مؤرشف' },
    availableAction: { update: 'تعديل', submit: 'إرسال للمراجعة', needs_changes: 'طلب تعديل', approve: 'اعتماد', reject: 'رفض', publish: 'نشر', hide: 'إخفاء', restore: 'استعادة', archive: 'أرشفة' },
    visibilityAction: { hide: 'إخفاء العقار', restore: 'استعادة الظهور', archive: 'أرشفة العقار' },
    reportStatus: { open: 'جديد', in_review: 'قيد المراجعة', resolved: 'تم الحل', dismissed: 'مرفوض' }, reportAction: { resolve: 'حل البلاغ', dismiss: 'رفض البلاغ' }, reportReason: { duplicate: 'تكرار', fraud: 'احتيال', inaccurate: 'بيانات غير دقيقة', inappropriate: 'محتوى غير مناسب', other: 'أخرى' }, signal: { same_slug: 'معرّف مختصر متطابق', same_location_transaction: 'موقع ومعاملة متطابقان', same_localized_name: 'اسم مترجم متطابق' },
    reasonLabel: 'سبب الإجراء', reasonPlaceholder: 'اكتب سببًا واضحًا لا يقل عن خمسة أحرف', reasonRequired: 'سبب الإجراء مطلوب.', saveAction: 'حفظ الإجراء', saving: 'جارٍ الحفظ', actionSaved: 'تم حفظ الإجراء.', noActions: 'لا توجد إجراءات متاحة', noCandidates: 'لا توجد نتائج تكرار محتملة', noReports: 'لا توجد بلاغات مطابقة', detailsLabel: 'تفاصيل البلاغ', states: { loading: { title: 'جارٍ التحميل', body: 'يتم جلب البيانات من المصدر المعتمد.' }, empty: { title: 'لا توجد بيانات', body: 'لا توجد سجلات مطابقة للمرشحات الحالية.' }, error: { title: 'تعذر تحميل البيانات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الاتصال غير متاح مؤقتًا', body: 'يمكن إعادة المحاولة دون تغيير البيانات الحالية.' }, permission: { title: 'الوصول غير متاح', body: 'تحتاج هذه الصفحة إلى جلسة مدير موثقة والصلاحية المناسبة.' }, not_found: { title: 'السجل غير موجود', body: 'تعذر العثور على السجل المطلوب ضمن الإسقاط المتاح.' }, success: { title: 'البيانات جاهزة', body: 'تُعرض السجلات من الإسقاط المعتمد من الخادم.' } }, directionNote: 'العربية RTL — إدارة العقارات معتمدة لسطح المكتب.'
  },
  en: {
    eyebrow: 'Property administration',
    titles: { list: 'Properties management', review: 'Property review', duplicates: 'Possible duplicate properties', reports: 'Property reports' },
    descriptions: { list: 'Review new properties and changes before approval and publication.', review: 'Inspect the safe property projection and take a server-permitted action.', duplicates: 'Inspect explainable duplicate signals before making a review decision.', reports: 'Review property reports and update their state with a clear reason.' },
    allProperties: 'All properties', searchLabel: 'Search properties', searchPlaceholder: 'Search by name or slug', statusLabel: 'Status', activeLabel: 'Activity', providerLabel: 'Provider ID', projectLabel: 'Project ID', allStatuses: 'All statuses', allActivity: 'All activity', active: 'Active', inactive: 'Inactive', apply: 'Apply', clear: 'Clear', retry: 'Retry', review: 'Start review', details: 'View details', duplicates: 'Possible duplicates', reports: 'Reports', back: 'Back to properties', openDuplicates: 'Check duplicates', openReports: 'Open reports', openProperty: 'Open property', previous: 'Previous', next: 'Next', page: (page, total) => `Page ${page} of ${total}`, count: count => `${count.toLocaleString('en-US')} properties`, candidateCount: count => `${count.toLocaleString('en-US')} possible matches`,
    columns: { id: 'Property ID', name: 'Property', source: 'Property source', kind: 'Kind', transaction: 'Transaction', status: 'Status', active: 'Activity', version: 'Version', updated: 'Updated', reason: 'Action reason', actions: 'Actions', reportId: 'Report ID', propertyId: 'Property ID', reportReason: 'Report reason', priority: 'Priority', date: 'Date' },
    status: { draft: 'Draft', pending_review: 'Under review', needs_changes: 'Needs changes', approved: 'Approved', published: 'Published', rejected: 'Rejected', hidden: 'Hidden', archived: 'Archived' },
    availableAction: { update: 'Update', submit: 'Submit for review', needs_changes: 'Request changes', approve: 'Approve', reject: 'Reject', publish: 'Publish', hide: 'Hide', restore: 'Restore', archive: 'Archive' },
    visibilityAction: { hide: 'Hide property', restore: 'Restore visibility', archive: 'Archive property' },
    reportStatus: { open: 'New', in_review: 'In review', resolved: 'Resolved', dismissed: 'Dismissed' }, reportAction: { resolve: 'Resolve report', dismiss: 'Dismiss report' }, reportReason: { duplicate: 'Duplicate', fraud: 'Fraud', inaccurate: 'Inaccurate data', inappropriate: 'Inappropriate', other: 'Other' }, signal: { same_slug: 'Matching slug', same_location_transaction: 'Matching location and transaction', same_localized_name: 'Matching localized name' },
    reasonLabel: 'Action reason', reasonPlaceholder: 'Write a clear reason of at least five characters', reasonRequired: 'An action reason is required.', saveAction: 'Save action', saving: 'Saving', actionSaved: 'Action saved.', noActions: 'No actions available', noCandidates: 'No possible duplicate matches', noReports: 'No matching reports', detailsLabel: 'Report details', states: { loading: { title: 'Loading', body: 'Fetching records from the approved source.' }, empty: { title: 'No records found', body: 'No records match the current filters.' }, error: { title: 'Records could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching permission.' }, not_found: { title: 'Record not found', body: 'The requested record is not present in the available projection.' }, success: { title: 'Records ready', body: 'Records are rendered from the server-approved projection.' } }, directionNote: 'English LTR — property administration is approved for desktop.'
  },
  'zh-CN': {
    eyebrow: '房产管理',
    titles: { list: '房产管理', review: '房产审核', duplicates: '疑似重复房产', reports: '房产举报' },
    descriptions: { list: '在批准和发布前查看新房产及其变更。', review: '查看安全的房产数据投影，并执行服务器允许的操作。', duplicates: '查看可解释的重复信号，然后作出审核决定。', reports: '查看房产举报，并使用明确原因更新其状态。' },
    allProperties: '全部房产', searchLabel: '搜索房产', searchPlaceholder: '按名称或 Slug 搜索', statusLabel: '状态', activeLabel: '活动状态', providerLabel: '提供方 ID', projectLabel: '项目 ID', allStatuses: '所有状态', allActivity: '所有活动状态', active: '启用', inactive: '未启用', apply: '应用', clear: '清除', retry: '重试', review: '开始审核', details: '查看详情', duplicates: '疑似重复', reports: '举报', back: '返回房产', openDuplicates: '检查重复项', openReports: '打开举报', openProperty: '打开房产', previous: '上一页', next: '下一页', page: (page, total) => `第 ${page} 页，共 ${total} 页`, count: count => `${count.toLocaleString('zh-CN')} 个房产`, candidateCount: count => `${count.toLocaleString('zh-CN')} 个疑似匹配`,
    columns: { id: '房产编号', name: '房产', source: '房产来源', kind: '类型', transaction: '交易类型', status: '状态', active: '活动状态', version: '版本', updated: '更新时间', reason: '操作原因', actions: '操作', reportId: '举报编号', propertyId: '房产编号', reportReason: '举报原因', priority: '优先级', date: '日期' },
    status: { draft: '草稿', pending_review: '审核中', needs_changes: '需要修改', approved: '已批准', published: '已发布', rejected: '已拒绝', hidden: '已隐藏', archived: '已归档' },
    availableAction: { update: '更新', submit: '提交审核', needs_changes: '请求修改', approve: '批准', reject: '拒绝', publish: '发布', hide: '隐藏', restore: '恢复', archive: '归档' },
    visibilityAction: { hide: '隐藏房产', restore: '恢复显示', archive: '归档房产' },
    reportStatus: { open: '新举报', in_review: '审核中', resolved: '已解决', dismissed: '已驳回' }, reportAction: { resolve: '解决举报', dismiss: '驳回举报' }, reportReason: { duplicate: '重复', fraud: '欺诈', inaccurate: '信息不准确', inappropriate: '不当内容', other: '其他' }, signal: { same_slug: 'Slug 相同', same_location_transaction: '位置和交易类型相同', same_localized_name: '本地化名称相同' },
    reasonLabel: '操作原因', reasonPlaceholder: '请输入至少五个字符的明确原因', reasonRequired: '必须填写操作原因。', saveAction: '保存操作', saving: '正在保存', actionSaved: '操作已保存。', noActions: '没有可用操作', noCandidates: '没有疑似重复结果', noReports: '没有匹配的举报', detailsLabel: '举报详情', states: { loading: { title: '正在加载', body: '正在从已批准的数据源获取记录。' }, empty: { title: '没有记录', body: '没有记录符合当前筛选条件。' }, error: { title: '无法加载记录', body: '请检查连接后重试。' }, retry: { title: '连接暂时不可用', body: '可以在不改变当前数据的情况下重试。' }, permission: { title: '无法访问', body: '此页面需要经过认证的管理员会话及相应权限。' }, not_found: { title: '未找到记录', body: '可用数据中不存在请求的记录。' }, success: { title: '记录已就绪', body: '记录来自服务器批准的安全投影。' } }, directionNote: '简体中文 LTR — 房产管理界面仅批准桌面端。'
  }
};

export function getAdminPropertiesCopy(locale: SupportedLocale): AdminPropertiesCopy {
  return copyByLocale[locale];
}
