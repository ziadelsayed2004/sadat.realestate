import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminAdsState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminAdsCopy {
  readonly eyebrow: string;
  readonly tabs: {
    readonly requests: string;
    readonly pendingProofs: string;
    readonly approvedProofs: string;
    readonly calendar: string;
    readonly review: string;
    readonly financial: string;
  };
  readonly titles: {
    readonly requests: string;
    readonly pendingProofs: string;
    readonly approvedProofs: string;
    readonly calendar: string;
    readonly review: string;
    readonly financial: string;
  };
  readonly descriptions: {
    readonly requests: string;
    readonly pendingProofs: string;
    readonly approvedProofs: string;
    readonly calendar: string;
    readonly review: string;
    readonly financial: string;
  };
  readonly searchLabel: string;
  readonly providerPlaceholder: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, total: number) => string;
  readonly count: (count: number) => string;
  readonly rowsOnPage: string;
  readonly columns: {
    readonly id: string;
    readonly request: string;
    readonly provider: string;
    readonly placement: string;
    readonly purpose: string;
    readonly status: string;
    readonly quote: string;
    readonly interval: string;
    readonly filename: string;
    readonly size: string;
    readonly security: string;
    readonly version: string;
    readonly uploaded: string;
    readonly start: string;
    readonly end: string;
    readonly timezone: string;
    readonly state: string;
    readonly occurred: string;
    readonly amount: string;
    readonly source: string;
    readonly actions: string;
  };
  readonly requestStatus: Readonly<Record<string, string>>;
  readonly proofStatus: Readonly<Record<string, string>>;
  readonly calendarStatus: Readonly<Record<string, string>>;
  readonly financialState: Readonly<Record<string, string>>;
  readonly ledgerKind: Readonly<Record<string, string>>;
  readonly view: string;
  readonly reviewAction: string;
  readonly approve: string;
  readonly reject: string;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly reviewSaved: string;
  readonly reviewing: string;
  readonly detail: string;
  readonly back: string;
  readonly notRealized: string;
  readonly noMetrics: string;
  readonly unavailable: string;
  readonly directionNote: string;
  readonly states: Readonly<Record<AdminAdsState, { readonly title: string; readonly body: string }>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminAdsCopy>> = {
  ar: {
    eyebrow: 'إدارة الإعلانات والمدفوعات',
    tabs: { requests: 'طلبات الإعلانات', pendingProofs: 'إثباتات قيد المراجعة', approvedProofs: 'إثباتات معتمدة', calendar: 'تقويم الإعلانات', review: 'مراجعة المدفوعات', financial: 'المراجعة المالية' },
    titles: { requests: 'طلبات الإعلانات', pendingProofs: 'إثباتات الدفع المعلقة', approvedProofs: 'إثباتات الدفع المعتمدة', calendar: 'تقويم الإعلانات', review: 'مراجعة المدفوعات', financial: 'المراجعة المالية التشغيلية' },
    descriptions: { requests: 'راجع الطلبات والاقتباسات اليدوية من الإسقاط الإداري المعتمد.', pendingProofs: 'اعرض إثباتات الدفع التي تنتظر المراجعة اليدوية.', approvedProofs: 'اعرض الإثباتات التي تمت الموافقة عليها يدوياً.', calendar: 'اعرض المواعيد المنشورة في المنطقة الزمنية للقاهرة.', review: 'اتخذ قراراً يسبباً على إثبات قيد المراجعة مع سبب وإصدار متوقع.', financial: 'بيانات تشغيلية للإعلانات وليست نظاماً محاسبياً أو إثباتاً مصرفياً.' },
    searchLabel: 'معرّف مقدم الخدمة',
    providerPlaceholder: 'أدخل معرّف مقدم الخدمة',
    statusLabel: 'الحالة',
    allStatuses: 'كل الحالات',
    apply: 'تطبيق',
    clear: 'مسح',
    previous: 'السابق',
    next: 'التالي',
    page: (page, total) => `الصفحة ${page} من ${total}`,
    count: count => `${count.toLocaleString('ar-EG')} سجل`,
    rowsOnPage: 'سجلات الصفحة',
    columns: { id: 'المعرّف', request: 'طلب الإعلان', provider: 'مقدم الخدمة', placement: 'الموضع', purpose: 'الغرض', status: 'الحالة', quote: 'الاقتباس', interval: 'الفترة', filename: 'اسم الملف', size: 'الحجم', security: 'الفحص', version: 'الإصدار', uploaded: 'تاريخ الرفع', start: 'البداية', end: 'النهاية', timezone: 'المنطقة الزمنية', state: 'الحالة المالية', occurred: 'حدث في', amount: 'المبلغ', source: 'المصدر', actions: 'الإجراءات' },
    requestStatus: { draft: 'مسودة', review: 'قيد المراجعة', waiting_pricing: 'بانتظار التسعير', quote_sent: 'تم إرسال الاقتباس', waiting_payment: 'بانتظار الدفع', scheduled: 'مجدول', active: 'نشط', ended: 'منتهٍ', rejected: 'مرفوض', cancelled: 'ملغى', expired: 'منتهي' },
    proofStatus: { uploaded: 'تم الرفع', pending_review: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض' },
    calendarStatus: { scheduled: 'مجدول', active: 'نشط', ended: 'منتهٍ' },
    financialState: { not_submitted: 'لم يُرسل', quote_only: 'اقتباس فقط', payment_proof_pending_review: 'إثبات قيد المراجعة', payment_proof_approved: 'إثبات معتمد', payment_proof_rejected: 'إثبات مرفوض' },
    ledgerKind: { quote_issued: 'إصدار اقتباس', quote_accepted: 'قبول اقتباس', quote_rejected: 'رفض اقتباس', quote_cancelled: 'إلغاء اقتباس', payment_proof_uploaded: 'رفع إثبات', payment_proof_approved: 'اعتماد إثبات', payment_proof_rejected: 'رفض إثبات', scheduled: 'جدولة', active: 'تفعيل', ended: 'إنهاء' },
    view: 'عرض',
    reviewAction: 'إجراء المراجعة',
    approve: 'اعتماد',
    reject: 'رفض',
    reasonLabel: 'سبب الإجراء',
    reasonPlaceholder: 'اكتب سبباً واضحاً لا يقل عن حرفين',
    reasonRequired: 'سبب الإجراء مطلوب.',
    reviewSaved: 'تم حفظ الإجراء.',
    reviewing: 'جارٍ الحفظ',
    detail: 'تفاصيل الطلب',
    back: 'العودة إلى الطلبات',
    notRealized: 'بيانات تشغيلية فقط؛ لا تمثل إيراداً محققاً أو تحققاً بنكياً.',
    noMetrics: 'لا توجد مؤشرات إضافية في العقد الحالي.',
    unavailable: 'غير متاح',
    directionNote: 'العربية RTL — لوحة الإدارة معتمدة لسطح المكتب.',
    states: { loading: { title: 'جارٍ التحميل', body: 'يتم جلب البيانات من المصدر المعتمد.' }, empty: { title: 'لا توجد سجلات', body: 'لا توجد بيانات مطابقة للمرشحات الحالية.' }, error: { title: 'تعذر تحميل البيانات', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الاتصال غير متاح مؤقتاً', body: 'يمكنك إعادة المحاولة دون تغيير البيانات الحالية.' }, permission: { title: 'الوصول غير مسموح', body: 'تحتاج هذه الصفحة إلى جلسة مدير مصادق عليها والصلاحية المناسبة.' }, not_found: { title: 'السجل غير موجود', body: 'تعذر العثور على السجل المطلوب ضمن الإسقاط المتاح.' }, success: { title: 'البيانات جاهزة', body: 'تُعرض السجلات من إسقاط الخادم المعتمد.' } }
  },
  en: {
    eyebrow: 'Advertising and payments administration',
    tabs: { requests: 'Ad requests', pendingProofs: 'Pending proofs', approvedProofs: 'Approved proofs', calendar: 'Ad calendar', review: 'Payment review', financial: 'Financial review' },
    titles: { requests: 'Advertising requests', pendingProofs: 'Pending payment proofs', approvedProofs: 'Approved payment proofs', calendar: 'Advertising calendar', review: 'Pending payment review', financial: 'Operational financial review' },
    descriptions: { requests: 'Review requests and manual quotes from the approved administrative projection.', pendingProofs: 'Review active payment proofs waiting for manual review.', approvedProofs: 'Review active payment proofs approved by an administrator.', calendar: 'View scheduled advertising events in the Cairo timezone.', review: 'Approve or reject a pending proof with a reason and expected version.', financial: 'Operational advertising data; this is not an accounting system or bank verification.' },
    searchLabel: 'Provider ID',
    providerPlaceholder: 'Enter a provider ID',
    statusLabel: 'Status',
    allStatuses: 'All statuses',
    apply: 'Apply',
    clear: 'Clear',
    previous: 'Previous',
    next: 'Next',
    page: (page, total) => `Page ${page} of ${total}`,
    count: count => `${count.toLocaleString('en-US')} records`,
    rowsOnPage: 'Rows on page',
    columns: { id: 'ID', request: 'Ad request', provider: 'Provider', placement: 'Placement', purpose: 'Purpose', status: 'Status', quote: 'Quote', interval: 'Interval', filename: 'Filename', size: 'Size', security: 'Security', version: 'Version', uploaded: 'Uploaded', start: 'Start', end: 'End', timezone: 'Timezone', state: 'Financial state', occurred: 'Occurred', amount: 'Amount', source: 'Source', actions: 'Actions' },
    requestStatus: { draft: 'Draft', review: 'Under review', waiting_pricing: 'Waiting for pricing', quote_sent: 'Quote sent', waiting_payment: 'Waiting for payment', scheduled: 'Scheduled', active: 'Active', ended: 'Ended', rejected: 'Rejected', cancelled: 'Cancelled', expired: 'Expired' },
    proofStatus: { uploaded: 'Uploaded', pending_review: 'Pending review', approved: 'Approved', rejected: 'Rejected' },
    calendarStatus: { scheduled: 'Scheduled', active: 'Active', ended: 'Ended' },
    financialState: { not_submitted: 'Not submitted', quote_only: 'Quote only', payment_proof_pending_review: 'Payment proof pending', payment_proof_approved: 'Payment proof approved', payment_proof_rejected: 'Payment proof rejected' },
    ledgerKind: { quote_issued: 'Quote issued', quote_accepted: 'Quote accepted', quote_rejected: 'Quote rejected', quote_cancelled: 'Quote cancelled', payment_proof_uploaded: 'Proof uploaded', payment_proof_approved: 'Proof approved', payment_proof_rejected: 'Proof rejected', scheduled: 'Scheduled', active: 'Activated', ended: 'Ended' },
    view: 'View',
    reviewAction: 'Review action',
    approve: 'Approve',
    reject: 'Reject',
    reasonLabel: 'Action reason',
    reasonPlaceholder: 'Write a clear reason of at least two characters',
    reasonRequired: 'An action reason is required.',
    reviewSaved: 'Action saved.',
    reviewing: 'Saving',
    detail: 'Request details',
    back: 'Back to requests',
    notRealized: 'Operational data only; it does not represent realized revenue or bank verification.',
    noMetrics: 'No additional metrics are present in the current contract.',
    unavailable: 'Unavailable',
    directionNote: 'English LTR — the admin dashboard is approved for desktop.',
    states: { loading: { title: 'Loading data', body: 'Fetching records from the approved source.' }, empty: { title: 'No records found', body: 'No data matches the current filters.' }, error: { title: 'Data could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching permission.' }, not_found: { title: 'Record not found', body: 'The requested record is not present in the available projection.' }, success: { title: 'Data ready', body: 'Records are rendered from the server-approved projection.' } }
  },
  'zh-CN': {
    eyebrow: '广告与付款管理',
    tabs: { requests: '广告请求', pendingProofs: '待审核证明', approvedProofs: '已批准证明', calendar: '广告日历', review: '付款审核', financial: '财务审核' },
    titles: { requests: '广告请求', pendingProofs: '待审核付款证明', approvedProofs: '已批准付款证明', calendar: '广告日历', review: '待处理付款审核', financial: '运营财务审核' },
    descriptions: { requests: '从已批准的管理投影中查看请求和人工报价。', pendingProofs: '查看等待人工审核的有效付款证明。', approvedProofs: '查看已由管理员人工批准的有效付款证明。', calendar: '查看开罗时区的广告排期。', review: '使用原因和预期版本批准或拒绝待审核证明。', financial: '广告运营数据；不是会计系统，也不代表银行验证。' },
    searchLabel: '提供商 ID',
    providerPlaceholder: '输入提供商 ID',
    statusLabel: '状态',
    allStatuses: '全部状态',
    apply: '应用',
    clear: '清除',
    previous: '上一页',
    next: '下一页',
    page: (page, total) => `第 ${page} 页，共 ${total} 页`,
    count: count => `${count.toLocaleString('zh-CN')} 条记录`,
    rowsOnPage: '本页记录',
    columns: { id: '编号', request: '广告请求', provider: '提供商', placement: '位置', purpose: '用途', status: '状态', quote: '报价', interval: '时间段', filename: '文件名', size: '大小', security: '安全状态', version: '版本', uploaded: '上传时间', start: '开始', end: '结束', timezone: '时区', state: '财务状态', occurred: '发生时间', amount: '金额', source: '来源', actions: '操作' },
    requestStatus: { draft: '草稿', review: '审核中', waiting_pricing: '等待定价', quote_sent: '报价已发送', waiting_payment: '等待付款', scheduled: '已排期', active: '进行中', ended: '已结束', rejected: '已拒绝', cancelled: '已取消', expired: '已过期' },
    proofStatus: { uploaded: '已上传', pending_review: '待审核', approved: '已批准', rejected: '已拒绝' },
    calendarStatus: { scheduled: '已排期', active: '进行中', ended: '已结束' },
    financialState: { not_submitted: '未提交', quote_only: '仅报价', payment_proof_pending_review: '付款证明待审核', payment_proof_approved: '付款证明已批准', payment_proof_rejected: '付款证明已拒绝' },
    ledgerKind: { quote_issued: '报价已发出', quote_accepted: '报价已接受', quote_rejected: '报价已拒绝', quote_cancelled: '报价已取消', payment_proof_uploaded: '证明已上传', payment_proof_approved: '证明已批准', payment_proof_rejected: '证明已拒绝', scheduled: '已排期', active: '已激活', ended: '已结束' },
    view: '查看',
    reviewAction: '审核操作',
    approve: '批准',
    reject: '拒绝',
    reasonLabel: '操作原因',
    reasonPlaceholder: '请输入至少两个字符的明确原因',
    reasonRequired: '必须填写操作原因。',
    reviewSaved: '操作已保存。',
    reviewing: '正在保存',
    detail: '请求详情',
    back: '返回请求',
    notRealized: '仅为运营数据；不代表已实现收入或银行验证。',
    noMetrics: '当前合同没有更多指标。',
    unavailable: '不可用',
    directionNote: '简体中文 LTR — 管理面板仅批准用于桌面端。',
    states: { loading: { title: '正在加载数据', body: '正在从已批准的数据源获取记录。' }, empty: { title: '未找到记录', body: '没有记录符合当前筛选条件。' }, error: { title: '无法加载数据', body: '请检查连接后重试。' }, retry: { title: '连接暂时不可用', body: '可以在不改变当前数据的情况下重试。' }, permission: { title: '无法访问', body: '此页面需要经过认证的管理员会话及相应权限。' }, not_found: { title: '未找到记录', body: '可用投影中不存在请求的记录。' }, success: { title: '数据已就绪', body: '记录来自服务器批准的安全投影。' } }
  }
};

export function getAdminAdsCopy(locale: SupportedLocale): AdminAdsCopy {
  return copyByLocale[locale];
}
