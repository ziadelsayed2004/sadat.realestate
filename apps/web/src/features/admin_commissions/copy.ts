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
  },};

export function getAdminCommissionsCopy(locale: SupportedLocale): AdminCommissionsCopy {
  return copyByLocale[locale];
}
