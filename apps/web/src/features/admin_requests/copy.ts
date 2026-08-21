import type { RequestStatus, RequestTransition, RequestType, SupportedLocale, ViewingStatus } from '@sadat-real-estate/contracts';

export type AdminRequestsScreen = 'all' | 'customer' | 'overdue' | 'contact' | 'viewing' | 'search' | 'issues';
export type AdminRequestsState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminRequestsCopy {
  readonly eyebrow: string;
  readonly titles: Readonly<Record<AdminRequestsScreen, string>>;
  readonly descriptions: Readonly<Record<AdminRequestsScreen, string>>;
  readonly navigationLabel: string;
  readonly allRequests: string;
  readonly filters: string;
  readonly status: string;
  readonly type: string;
  readonly allStatuses: string;
  readonly allTypes: string;
  readonly search: string;
  readonly searchPlaceholder: string;
  readonly apply: string;
  readonly clear: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, total: number) => string;
  readonly count: (count: number) => string;
  readonly view: string;
  readonly details: string;
  readonly closeDetails: string;
  readonly issueDetails: string;
  readonly requestId: string;
  readonly issueId: string;
  readonly requestType: string;
  readonly source: string;
  readonly state: string;
  readonly version: string;
  readonly created: string;
  readonly updated: string;
  readonly due: string;
  readonly overdueBy: (seconds: number) => string;
  readonly appointment: string;
  readonly timezone: string;
  readonly property: string;
  readonly seeker: string;
  readonly provider: string;
  readonly payload: string;
  readonly noPayload: string;
  readonly actions: string;
  readonly transition: string;
  readonly transitionReason: string;
  readonly transitionReasonPlaceholder: string;
  readonly transitionRequired: string;
  readonly saveTransition: string;
  readonly saving: string;
  readonly transitionSaved: string;
  readonly assignment: string;
  readonly assigneeId: string;
  readonly assigneePlaceholder: string;
  readonly assignmentReason: string;
  readonly saveAssignment: string;
  readonly note: string;
  readonly notePlaceholder: string;
  readonly addNote: string;
  readonly noteSaved: string;
  readonly issueAction: string;
  readonly resolve: string;
  readonly dismiss: string;
  readonly resolutionReason: string;
  readonly resolveIssue: string;
  readonly issueSaved: string;
  readonly retry: string;
  readonly backToList: string;
  readonly noActions: string;
  readonly directionNote: string;
  readonly statusLabel: Readonly<Record<RequestStatus, string>>;
  readonly typeLabel: Readonly<Record<RequestType, string>>;
  readonly transitionLabel: Readonly<Record<RequestTransition, string>>;
  readonly viewingStatusLabel: Readonly<Record<ViewingStatus, string>>;
  readonly issueStatusLabel: Readonly<Record<'open' | 'resolved' | 'dismissed', string>>;
  readonly issueCategoryLabel: Readonly<Record<'duplicate' | 'abuse' | 'incorrect_data' | 'service' | 'other', string>>;
  readonly states: Readonly<Record<AdminRequestsState, { readonly title: string; readonly body: string }>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminRequestsCopy>> = {
  ar: {
    eyebrow: 'إدارة الطلبات',
    titles: { all: 'إدارة كل الطلبات', customer: 'طلبات العملاء', overdue: 'الطلبات المتأخرة', contact: 'طلبات التواصل', viewing: 'طلبات المعاينة', search: 'طلبات البحث عن عقار', issues: 'بلاغات الطلبات' },
    descriptions: { all: 'راجع الطلبات وتابع حالتها والإجراءات التي يسمح بها الخادم.', customer: 'راجع طلبات العملاء التي أنشأها مزودو الخدمة.', overdue: 'تابع الطلبات التي تجاوزت موعد المتابعة.', contact: 'راجع طلبات التواصل الواردة من الباحثين.', viewing: 'راجع مواعيد المعاينة المسجلة في النظام.', search: 'راجع تفضيلات البحث عن العقارات.', issues: 'عالج بلاغات الطلبات مع سبب واضح وإصدار متزامن.' },
    navigationLabel: 'تنقل الإدارة', allRequests: 'كل الطلبات', filters: 'تصفية الطلبات', status: 'الحالة', type: 'النوع', allStatuses: 'كل الحالات', allTypes: 'كل الأنواع', search: 'بحث', searchPlaceholder: 'ابحث بالمعرّف أو النص المتاح', apply: 'تطبيق', clear: 'مسح', previous: 'السابق', next: 'التالي', page: (page, total) => `الصفحة ${page} من ${total}`, count: count => `${count.toLocaleString('ar-EG')} طلب`, view: 'عرض', details: 'تفاصيل الطلب', closeDetails: 'إغلاق التفاصيل', issueDetails: 'تفاصيل البلاغ', requestId: 'معرّف الطلب', issueId: 'معرّف البلاغ', requestType: 'نوع الطلب', source: 'المصدر', state: 'الحالة', version: 'الإصدار', created: 'تاريخ الإنشاء', updated: 'آخر تحديث', due: 'موعد المتابعة', overdueBy: seconds => `متأخر منذ ${seconds.toLocaleString('ar-EG')} ثانية`, appointment: 'موعد المعاينة', timezone: 'المنطقة الزمنية', property: 'العقار', seeker: 'الباحث', provider: 'مزود الخدمة', payload: 'بيانات الطلب المتاحة', noPayload: 'لا توجد بيانات إضافية متاحة.', actions: 'الإجراءات المتاحة', transition: 'انتقال الحالة', transitionReason: 'سبب الانتقال', transitionReasonPlaceholder: 'اكتب سبباً واضحاً عند طلبه', transitionRequired: 'اختر إجراءً وأدخل سبباً صالحاً عند الحاجة.', saveTransition: 'حفظ الانتقال', saving: 'جارٍ الحفظ', transitionSaved: 'تم حفظ الانتقال.', assignment: 'تعيين الطلب', assigneeId: 'معرّف المسؤول', assigneePlaceholder: 'معرّف مسؤول مكوّن من 24 حرفاً', assignmentReason: 'سبب التعيين', saveAssignment: 'حفظ التعيين', note: 'ملاحظة إدارية', notePlaceholder: 'اكتب ملاحظة داخلية واضحة', addNote: 'إضافة الملاحظة', noteSaved: 'تمت إضافة الملاحظة.', issueAction: 'إجراء البلاغ', resolve: 'حل البلاغ', dismiss: 'إغلاق البلاغ', resolutionReason: 'سبب الإجراء', resolveIssue: 'حفظ إجراء البلاغ', issueSaved: 'تم حفظ إجراء البلاغ.', retry: 'إعادة المحاولة', backToList: 'العودة إلى القائمة', noActions: 'لا توجد إجراءات متاحة', directionNote: 'العربية RTL — مساحة الإدارة معتمدة لسطح المكتب فقط.', statusLabel: { new: 'جديد', under_review: 'قيد المراجعة', contacted: 'تم التواصل', scheduled: 'مجدول', needs_information: 'يحتاج معلومات', in_progress: 'قيد التنفيذ', resolved: 'تم الحل', cancelled: 'ملغى', closed: 'مغلق' }, typeLabel: { contact: 'تواصل', viewing: 'معاينة', property_search: 'بحث عن عقار', provider_customer: 'عميل مزود الخدمة' }, transitionLabel: { start_review: 'بدء المراجعة', contact: 'تسجيل التواصل', schedule: 'جدولة', needs_information: 'طلب معلومات', start_progress: 'بدء التنفيذ', resolve: 'حل الطلب', cancel: 'إلغاء', close: 'إغلاق', reopen: 'إعادة الفتح' }, viewingStatusLabel: { requested: 'مطلوب', confirmed: 'مؤكد', rescheduled: 'أعيدت جدولته', cancelled: 'ملغى', completed: 'مكتمل' }, issueStatusLabel: { open: 'مفتوح', resolved: 'تم الحل', dismissed: 'مغلق' }, issueCategoryLabel: { duplicate: 'مكرر', abuse: 'إساءة', incorrect_data: 'بيانات غير صحيحة', service: 'خدمة', other: 'أخرى' }, states: { loading: { title: 'جارٍ تحميل الطلبات', body: 'يتم جلب الإسقاط المعتمد من الخادم.' }, empty: { title: 'لا توجد سجلات', body: 'لا توجد سجلات مطابقة للتصفية الحالية.' }, error: { title: 'تعذر تحميل البيانات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الاتصال غير متاح مؤقتاً', body: 'أعد المحاولة مع الحفاظ على التصفية الحالية.' }, permission: { title: 'الوصول غير مسموح', body: 'تتطلب هذه الصفحة جلسة مدير موثقة والصلاحية المناسبة.' }, not_found: { title: 'السجل غير موجود', body: 'تعذر العثور على السجل ضمن الإسقاط المتاح.' }, success: { title: 'البيانات جاهزة', body: 'تُعرض البيانات من الإسقاط المعتمد للخادم.' } }
  },
  en: {
    eyebrow: 'Request administration',
    titles: { all: 'All requests', customer: 'Customer requests', overdue: 'Overdue requests', contact: 'Contact requests', viewing: 'Viewing requests', search: 'Property search requests', issues: 'Request issues' },
    descriptions: { all: 'Review requests and follow the actions permitted by the server.', customer: 'Review customer requests created by providers.', overdue: 'Follow requests that passed their follow-up deadline.', contact: 'Review contact requests submitted by seekers.', viewing: 'Review viewing appointments recorded in the system.', search: 'Review seeker property-search preferences.', issues: 'Resolve request issues with a reason and optimistic version.' },
    navigationLabel: 'Administration navigation', allRequests: 'All requests', filters: 'Request filters', status: 'Status', type: 'Type', allStatuses: 'All statuses', allTypes: 'All types', search: 'Search', searchPlaceholder: 'Search by ID or available text', apply: 'Apply', clear: 'Clear', previous: 'Previous', next: 'Next', page: (page, total) => `Page ${page} of ${total}`, count: count => `${count.toLocaleString('en-US')} requests`, view: 'View', details: 'Request details', closeDetails: 'Close details', issueDetails: 'Issue details', requestId: 'Request ID', issueId: 'Issue ID', requestType: 'Request type', source: 'Source', state: 'Status', version: 'Version', created: 'Created', updated: 'Updated', due: 'Follow-up due', overdueBy: seconds => `Overdue by ${seconds.toLocaleString('en-US')} seconds`, appointment: 'Appointment', timezone: 'Timezone', property: 'Property', seeker: 'Seeker', provider: 'Provider', payload: 'Available request data', noPayload: 'No additional data is available.', actions: 'Available actions', transition: 'Status transition', transitionReason: 'Transition reason', transitionReasonPlaceholder: 'Write a clear reason when required', transitionRequired: 'Choose an action and provide a valid reason when required.', saveTransition: 'Save transition', saving: 'Saving', transitionSaved: 'Transition saved.', assignment: 'Assign request', assigneeId: 'Assignee ID', assigneePlaceholder: 'A 24-character administrator ID', assignmentReason: 'Assignment reason', saveAssignment: 'Save assignment', note: 'Administrative note', notePlaceholder: 'Write a clear internal note', addNote: 'Add note', noteSaved: 'Note added.', issueAction: 'Issue action', resolve: 'Resolve', dismiss: 'Dismiss', resolutionReason: 'Resolution reason', resolveIssue: 'Save issue action', issueSaved: 'Issue action saved.', retry: 'Retry', backToList: 'Back to list', noActions: 'No actions available', directionNote: 'English LTR — administration is approved for desktop only.', statusLabel: { new: 'New', under_review: 'Under review', contacted: 'Contacted', scheduled: 'Scheduled', needs_information: 'Needs information', in_progress: 'In progress', resolved: 'Resolved', cancelled: 'Cancelled', closed: 'Closed' }, typeLabel: { contact: 'Contact', viewing: 'Viewing', property_search: 'Property search', provider_customer: 'Provider customer' }, transitionLabel: { start_review: 'Start review', contact: 'Record contact', schedule: 'Schedule', needs_information: 'Request information', start_progress: 'Start progress', resolve: 'Resolve request', cancel: 'Cancel', close: 'Close', reopen: 'Reopen' }, viewingStatusLabel: { requested: 'Requested', confirmed: 'Confirmed', rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed' }, issueStatusLabel: { open: 'Open', resolved: 'Resolved', dismissed: 'Dismissed' }, issueCategoryLabel: { duplicate: 'Duplicate', abuse: 'Abuse', incorrect_data: 'Incorrect data', service: 'Service', other: 'Other' }, states: { loading: { title: 'Loading requests', body: 'Fetching the approved projection from the server.' }, empty: { title: 'No records found', body: 'No records match the current filters.' }, error: { title: 'Data could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current filters.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching permission.' }, not_found: { title: 'Record not found', body: 'The record is not present in the available projection.' }, success: { title: 'Data ready', body: 'Records are rendered from the server-approved projection.' } }
  },
  'zh-CN': {
    eyebrow: '请求管理',
    titles: { all: '所有请求', customer: '客户请求', overdue: '逾期请求', contact: '联系请求', viewing: '看房请求', search: '房产搜索请求', issues: '请求问题' },
    descriptions: { all: '查看请求并执行服务器允许的操作。', customer: '查看由提供方创建的客户请求。', overdue: '跟进超过截止时间的请求。', contact: '查看求租者提交的联系请求。', viewing: '查看系统记录的看房预约。', search: '查看求租者的房产搜索偏好。', issues: '使用原因和版本控制处理请求问题。' },
    navigationLabel: '管理导航', allRequests: '所有请求', filters: '请求筛选', status: '状态', type: '类型', allStatuses: '所有状态', allTypes: '所有类型', search: '搜索', searchPlaceholder: '按编号或可用文本搜索', apply: '应用', clear: '清除', previous: '上一页', next: '下一页', page: (page, total) => `第 ${page} 页，共 ${total} 页`, count: count => `${count.toLocaleString('zh-CN')} 个请求`, view: '查看', details: '请求详情', closeDetails: '关闭详情', issueDetails: '问题详情', requestId: '请求编号', issueId: '问题编号', requestType: '请求类型', source: '来源', state: '状态', version: '版本', created: '创建时间', updated: '更新时间', due: '跟进截止', overdueBy: seconds => `逾期 ${seconds.toLocaleString('zh-CN')} 秒`, appointment: '预约时间', timezone: '时区', property: '房产', seeker: '求租者', provider: '提供方', payload: '可用请求数据', noPayload: '没有其他可用数据。', actions: '可用操作', transition: '状态转换', transitionReason: '转换原因', transitionReasonPlaceholder: '需要时填写清晰原因', transitionRequired: '请选择操作，并在需要时填写有效原因。', saveTransition: '保存转换', saving: '保存中', transitionSaved: '转换已保存。', assignment: '分配请求', assigneeId: '负责人编号', assigneePlaceholder: '24 位管理员编号', assignmentReason: '分配原因', saveAssignment: '保存分配', note: '管理备注', notePlaceholder: '填写清晰的内部备注', addNote: '添加备注', noteSaved: '备注已添加。', issueAction: '问题操作', resolve: '解决', dismiss: '驳回', resolutionReason: '处理原因', resolveIssue: '保存问题操作', issueSaved: '问题操作已保存。', retry: '重试', backToList: '返回列表', noActions: '没有可用操作', directionNote: '简体中文 LTR — 管理页面仅适用于桌面端。', statusLabel: { new: '新建', under_review: '审核中', contacted: '已联系', scheduled: '已安排', needs_information: '需要信息', in_progress: '处理中', resolved: '已解决', cancelled: '已取消', closed: '已关闭' }, typeLabel: { contact: '联系', viewing: '看房', property_search: '房产搜索', provider_customer: '提供方客户' }, transitionLabel: { start_review: '开始审核', contact: '记录联系', schedule: '安排', needs_information: '请求信息', start_progress: '开始处理', resolve: '解决请求', cancel: '取消', close: '关闭', reopen: '重新打开' }, viewingStatusLabel: { requested: '已请求', confirmed: '已确认', rescheduled: '已改期', cancelled: '已取消', completed: '已完成' }, issueStatusLabel: { open: '开放', resolved: '已解决', dismissed: '已关闭' }, issueCategoryLabel: { duplicate: '重复', abuse: '滥用', incorrect_data: '错误数据', service: '服务', other: '其他' }, states: { loading: { title: '正在加载请求', body: '正在从服务器获取已批准的数据。' }, empty: { title: '未找到记录', body: '没有记录符合当前筛选条件。' }, error: { title: '无法加载数据', body: '请检查连接后重试。' }, retry: { title: '连接暂时不可用', body: '重试时不会改变当前筛选条件。' }, permission: { title: '不允许访问', body: '此页面需要已认证的管理员会话和相应权限。' }, not_found: { title: '未找到记录', body: '当前数据中不存在该记录。' }, success: { title: '数据已就绪', body: '记录来自服务器批准的数据投影。' } }
  }
};

export function getAdminRequestsCopy(locale: SupportedLocale): AdminRequestsCopy {
  return copyByLocale[locale];
}
