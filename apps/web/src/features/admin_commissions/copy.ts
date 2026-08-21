import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminCommissionsState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission' | 'not_found';
export type AdminCommissionsView = 'policies' | 'newPolicy' | 'history' | 'account' | 'exceptions' | 'newException' | 'confirmations';

export interface AdminCommissionsCopy {
  readonly eyebrow: string;
  readonly navLabel: string;
  readonly titles: Readonly<Record<AdminCommissionsView, string>>;
  readonly descriptions: Readonly<Record<AdminCommissionsView, string>>;
  readonly tabs: ReadonlyArray<readonly [string, string]>;
  readonly actions: Readonly<{
    retry: string;
    create: string;
    save: string;
    apply: string;
    previous: string;
    next: string;
    back: string;
  }>;
  readonly labels: Readonly<Record<string, string>>;
  readonly states: Readonly<Record<Exclude<AdminCommissionsState, 'success'>, { title: string; body: string }>>;
  readonly kinds: Readonly<Record<'percentage' | 'fixed' | 'exempt', string>>;
  readonly statuses: Readonly<Record<'draft' | 'active' | 'inactive' | 'archived', string>>;
  readonly scopes: Readonly<Record<'default' | 'provider_type' | 'transaction_type' | 'property_kind' | 'organization' | 'account', string>>;
  readonly sources: Readonly<Record<'exception' | 'account_override' | 'policy' | 'none', string>>;
  readonly targetTypes: Readonly<Record<'commission_policy' | 'commission_exception' | 'commission_account_override' | 'commission_confirmation', string>>;
  readonly noAccount: string;
  readonly validation: string;
  readonly saved: string;
  readonly count: (total: number) => string;
  readonly page: (page: number, pages: number) => string;
  readonly value: (kind: 'percentage' | 'fixed' | 'exempt', percentageBps?: number, fixedAmountMinor?: number, currency?: string) => string;
}

const baseStates = {
  loading: { title: 'Loading', body: 'Loading commission data.' },
  empty: { title: 'No records', body: 'There are no commission records for this view yet.' },
  error: { title: 'Unable to load', body: 'The commission data could not be loaded safely.' },
  retry: { title: 'Connection interrupted', body: 'Retry the commission request when the connection is available.' },
  permission: { title: 'Permission required', body: 'This administrator session cannot view or change commission records.' },
  not_found: { title: 'Account identifier required', body: 'Open this view with a valid accountId. The API does not provide an account directory here.' }
} as const;

function valueLabel(kind: 'percentage' | 'fixed' | 'exempt', percentageBps?: number, fixedAmountMinor?: number, currency?: string): string {
  if (kind === 'exempt') return 'No commission';
  if (kind === 'percentage' && percentageBps !== undefined) return `${(percentageBps / 100).toFixed(2)}%`;
  if (kind === 'fixed' && fixedAmountMinor !== undefined && currency !== undefined) return `${(fixedAmountMinor / 100).toFixed(2)} ${currency}`;
  return 'Not specified';
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminCommissionsCopy>> = {
  ar: {
    eyebrow: 'إدارة العمولات',
    navLabel: 'العمولات',
    titles: { policies: 'سياسات العمولات', newPolicy: 'إنشاء سياسة عمولة', history: 'سجل تغييرات العمولات', account: 'عمولة الحساب', exceptions: 'استثناءات العمولات', newException: 'إنشاء استثناء', confirmations: 'تأكيدات العمولات' },
    descriptions: { policies: 'راجع السياسات الصريحة وتواريخ سريانها.', newPolicy: 'أنشئ سياسة صريحة وفق العقد المعتمد.', history: 'راجع السجل الزمني للتغييرات الحساسة.', account: 'راجع السياسة الفعالة لحساب محدد وأنشئ تجاوزاً عند الحاجة.', exceptions: 'راجع الاستثناءات المرتبطة بالحسابات.', newException: 'سجّل استثناءً مع سبب وتاريخ سريان.', confirmations: 'راجع تأكيدات السياسة والحساب والاستثناء.' },
    tabs: [['/admin/commissions', 'السياسات'], ['/admin/commissions/new', 'إنشاء سياسة'], ['/admin/commissions/history', 'السجل'], ['/admin/commissions/account', 'الحساب'], ['/admin/commissions/exceptions', 'الاستثناءات'], ['/admin/commissions/exceptions/new', 'إنشاء استثناء'], ['/admin/commissions/confirmations', 'التأكيدات']],
    actions: { retry: 'إعادة المحاولة', create: 'إنشاء', save: 'حفظ', apply: 'تطبيق', previous: 'السابق', next: 'التالي', back: 'رجوع' },
    labels: { key: 'المفتاح', label: 'الاسم', kind: 'النوع', scope: 'النطاق', scopeKey: 'مفتاح النطاق', status: 'الحالة', value: 'القيمة', effectiveFrom: 'يبدأ في', effectiveTo: 'ينتهي في', currency: 'العملة', amountMinor: 'المبلغ بالقروش', percentageBps: 'النسبة بالنقاط الأساسية', accountId: 'معرّف الحساب', reason: 'السبب', source: 'المصدر', policyVersion: 'إصدار السياسة', action: 'الإجراء', targetType: 'نوع السجل', targetId: 'معرّف السجل', createdAt: 'أنشئ في', acknowledgedAt: 'أكّد في', effectiveAt: 'فعّال في', version: 'الإصدار' },
    states: { loading: { title: 'جارٍ التحميل', body: 'جارٍ تحميل بيانات العمولات.' }, empty: { title: 'لا توجد سجلات', body: 'لا توجد سجلات عمولات لهذا العرض حتى الآن.' }, error: { title: 'تعذر التحميل', body: 'تعذر تحميل بيانات العمولات بأمان.' }, retry: { title: 'انقطع الاتصال', body: 'أعد محاولة طلب العمولات عند توفر الاتصال.' }, permission: { title: 'الإذن مطلوب', body: 'لا تملك جلسة المسؤول هذه إذناً لعرض أو تغيير سجلات العمولات.' }, not_found: { title: 'معرّف الحساب مطلوب', body: 'افتح هذا العرض مع accountId صالح. لا يوفر هذا المسار دليلاً للحسابات.' } },
    kinds: { percentage: 'نسبة', fixed: 'مبلغ ثابت', exempt: 'إعفاء' }, statuses: { draft: 'مسودة', active: 'فعالة', inactive: 'غير فعالة', archived: 'مؤرشفة' }, scopes: { default: 'افتراضي', provider_type: 'نوع مقدم الخدمة', transaction_type: 'نوع المعاملة', property_kind: 'نوع العقار', organization: 'المنظمة', account: 'الحساب' }, sources: { exception: 'استثناء', account_override: 'تجاوز حساب', policy: 'سياسة', none: 'لا يوجد' }, targetTypes: { commission_policy: 'سياسة', commission_exception: 'استثناء', commission_account_override: 'تجاوز حساب', commission_confirmation: 'تأكيد' }, noAccount: 'أدخل معرّف حساب مكوّناً من 24 حرفاً سداسياً عشرياً.', validation: 'راجع الحقول المطلوبة وقواعد العقد.', saved: 'تم الحفظ بنجاح.', count: total => `${total} سجل`, page: (page, pages) => `صفحة ${page} من ${pages}`, value: valueLabel
  },
  en: {
    eyebrow: 'Commission administration',
    navLabel: 'Commissions',
    titles: { policies: 'Commission policies', newPolicy: 'Create commission policy', history: 'Commission change history', account: 'Account commission', exceptions: 'Commission exceptions', newException: 'Create exception', confirmations: 'Commission confirmations' },
    descriptions: { policies: 'Review explicit policies and their effective windows.', newPolicy: 'Create an explicit policy using the approved contract.', history: 'Review the chronological record of sensitive changes.', account: 'Review the effective policy for one account and create an override when needed.', exceptions: 'Review account-linked commission exceptions.', newException: 'Record an exception with a reason and effective date.', confirmations: 'Review policy, account, and exception confirmations.' },
    tabs: [['/admin/commissions', 'Policies'], ['/admin/commissions/new', 'New policy'], ['/admin/commissions/history', 'History'], ['/admin/commissions/account', 'Account'], ['/admin/commissions/exceptions', 'Exceptions'], ['/admin/commissions/exceptions/new', 'New exception'], ['/admin/commissions/confirmations', 'Confirmations']],
    actions: { retry: 'Retry', create: 'Create', save: 'Save', apply: 'Apply', previous: 'Previous', next: 'Next', back: 'Back' },
    labels: { key: 'Key', label: 'Label', kind: 'Kind', scope: 'Scope', scopeKey: 'Scope key', status: 'Status', value: 'Value', effectiveFrom: 'Effective from', effectiveTo: 'Effective to', currency: 'Currency', amountMinor: 'Amount in minor units', percentageBps: 'Percentage basis points', accountId: 'Account ID', reason: 'Reason', source: 'Source', policyVersion: 'Policy version', action: 'Action', targetType: 'Target type', targetId: 'Target ID', createdAt: 'Created at', acknowledgedAt: 'Acknowledged at', effectiveAt: 'Effective at', version: 'Version' },
    states: baseStates, kinds: { percentage: 'Percentage', fixed: 'Fixed amount', exempt: 'Exempt' }, statuses: { draft: 'Draft', active: 'Active', inactive: 'Inactive', archived: 'Archived' }, scopes: { default: 'Default', provider_type: 'Provider type', transaction_type: 'Transaction type', property_kind: 'Property kind', organization: 'Organization', account: 'Account' }, sources: { exception: 'Exception', account_override: 'Account override', policy: 'Policy', none: 'None' }, targetTypes: { commission_policy: 'Policy', commission_exception: 'Exception', commission_account_override: 'Account override', commission_confirmation: 'Confirmation' }, noAccount: 'Enter a 24-character hexadecimal accountId.', validation: 'Review the required fields and contract rules.', saved: 'Saved successfully.', count: total => `${total} records`, page: (page, pages) => `Page ${page} of ${pages}`, value: valueLabel
  },
  'zh-CN': {
    eyebrow: '佣金管理',
    navLabel: '佣金',
    titles: { policies: '佣金政策', newPolicy: '创建佣金政策', history: '佣金变更历史', account: '账户佣金', exceptions: '佣金例外', newException: '创建例外', confirmations: '佣金确认' },
    descriptions: { policies: '查看明确的政策及其生效时间。', newPolicy: '根据已批准的合同创建明确政策。', history: '查看敏感变更的时间顺序记录。', account: '查看单个账户的有效政策，并在需要时创建覆盖。', exceptions: '查看与账户关联的佣金例外。', newException: '填写原因和生效日期记录例外。', confirmations: '查看政策、账户和例外确认。' },
    tabs: [['/admin/commissions', '政策'], ['/admin/commissions/new', '新建政策'], ['/admin/commissions/history', '历史'], ['/admin/commissions/account', '账户'], ['/admin/commissions/exceptions', '例外'], ['/admin/commissions/exceptions/new', '新建例外'], ['/admin/commissions/confirmations', '确认']],
    actions: { retry: '重试', create: '创建', save: '保存', apply: '应用', previous: '上一页', next: '下一页', back: '返回' },
    labels: { key: '键', label: '名称', kind: '类型', scope: '范围', scopeKey: '范围键', status: '状态', value: '值', effectiveFrom: '生效时间', effectiveTo: '结束时间', currency: '货币', amountMinor: '最小单位金额', percentageBps: '百分比基点', accountId: '账户 ID', reason: '原因', source: '来源', policyVersion: '政策版本', action: '操作', targetType: '目标类型', targetId: '目标 ID', createdAt: '创建时间', acknowledgedAt: '确认时间', effectiveAt: '生效于', version: '版本' },
    states: { loading: { title: '正在加载', body: '正在加载佣金数据。' }, empty: { title: '暂无记录', body: '此视图目前没有佣金记录。' }, error: { title: '无法加载', body: '无法安全加载佣金数据。' }, retry: { title: '连接中断', body: '连接恢复后重试佣金请求。' }, permission: { title: '需要权限', body: '当前管理员会话无权查看或更改佣金记录。' }, not_found: { title: '需要账户标识', body: '请使用有效的 accountId 打开此视图。此 API 不提供账户目录。' } },
    kinds: { percentage: '百分比', fixed: '固定金额', exempt: '豁免' }, statuses: { draft: '草稿', active: '有效', inactive: '无效', archived: '已归档' }, scopes: { default: '默认', provider_type: '提供方类型', transaction_type: '交易类型', property_kind: '房产类型', organization: '组织', account: '账户' }, sources: { exception: '例外', account_override: '账户覆盖', policy: '政策', none: '无' }, targetTypes: { commission_policy: '政策', commission_exception: '例外', commission_account_override: '账户覆盖', commission_confirmation: '确认' }, noAccount: '请输入 24 位十六进制 accountId。', validation: '请检查必填字段和合同规则。', saved: '保存成功。', count: total => `${total} 条记录`, page: (page, pages) => `第 ${page} 页，共 ${pages} 页`, value: valueLabel
  }
};

export function getAdminCommissionsCopy(locale: SupportedLocale): AdminCommissionsCopy {
  return copyByLocale[locale];
}
