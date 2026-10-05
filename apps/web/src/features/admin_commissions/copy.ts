import { localizeCopy } from '../localization/copy-catalog.ts';
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
  readonly autoKey: string;
  readonly validation: string;
  readonly saved: string;
  readonly mutation: Readonly<{ duplicateAccount: string; conflict: string; network: string; failed: string; savedDraft: string }>;
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
  not_found: { title: 'Account not found', body: 'Choose an account from the list or check its account ID.' }
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
    mutation: {
      duplicateAccount: 'يوجد تخصيص عمولة محفوظ لهذا الحساب بنفس تاريخ البداية ببيانات مختلفة أو بحالة غير مسودة. لم يتم تغيير السجل السابق. استخدم تاريخ بداية آخر لإنشاء تخصيص جديد.',
      conflict: 'تعذر الحفظ لأن السجل موجود بالفعل أو تغيرت نسخته. حدّث الصفحة وراجع البيانات قبل إعادة المحاولة.',
      network: 'تعذر الاتصال لحفظ العمولة. تحقق من الاتصال ثم أعد المحاولة؛ تكرار نفس الحفظ لا ينشئ مسودة أخرى.',
      failed: 'تعذر حفظ العمولة. أعد المحاولة، وإذا استمرت المشكلة تواصل مع الدعم.',
      savedDraft: 'تم حفظ السجل كمسودة. لم تتغير العمولة الفعالة على الحساب.'
    },
    autoKey: 'يتم إنشاؤه تلقائياً؛ لا تحتاج لكتابته',
    navLabel: 'العمولات',
    titles: { policies: 'سياسات العمولات', newPolicy: 'إنشاء سياسة عمولة', history: 'سجل تغييرات العمولات', account: 'عمولة الحساب', exceptions: 'استثناءات العمولات', newException: 'إنشاء استثناء', confirmations: 'تأكيدات العمولات' },
    descriptions: { policies: 'راجع السياسات الصريحة وتواريخ سريانها.', newPolicy: 'اختر نوع العمولة ونطاق تطبيقها وتاريخ بدايتها. اكتب 2.5 لعمولة 2.5%؛ رمز السياسة يُنشأ تلقائياً. تُحفظ السياسة كمسودة قبل تفعيلها.', history: 'راجع السجل الزمني للتغييرات الحساسة.', account: 'اختر حساب مقدم الخدمة لعرض عمولته الحالية. تخصيص العمولة هنا يخص هذا الحساب فقط.', exceptions: 'راجع الاستثناءات المرتبطة بالحسابات.', newException: 'سجّل استثناءً مع سبب وتاريخ سريان.', confirmations: 'راجع تأكيدات السياسة والحساب والاستثناء.' },
    tabs: [['/admin/commissions', 'السياسات'], ['/admin/commissions/new', 'إنشاء سياسة'], ['/admin/commissions/history', 'السجل'], ['/admin/commissions/account', 'الحساب'], ['/admin/commissions/exceptions', 'الاستثناءات'], ['/admin/commissions/exceptions/new', 'إنشاء استثناء'], ['/admin/commissions/confirmations', 'التأكيدات']],
    actions: { retry: 'إعادة المحاولة', create: 'إنشاء', save: 'حفظ', apply: 'تطبيق', previous: 'السابق', next: 'التالي', back: 'رجوع' },
    labels: { key: 'رمز السياسة (اختياري)', label: 'الاسم', kind: 'النوع', scope: 'النطاق', scopeKey: 'مفتاح النطاق', status: 'الحالة', value: 'القيمة', effectiveFrom: 'يبدأ في', effectiveTo: 'ينتهي في', currency: 'العملة', amountMinor: 'مبلغ العمولة', percentageBps: 'نسبة العمولة (%)', accountId: 'معرّف الحساب', reason: 'السبب', source: 'المصدر', policyVersion: 'إصدار السياسة', action: 'الإجراء', targetType: 'نوع السجل', targetId: 'معرّف السجل', createdAt: 'أنشئ في', acknowledgedAt: 'أكّد في', effectiveAt: 'فعّال في', version: 'الإصدار' },
    states: { loading: { title: 'جارٍ التحميل', body: 'جارٍ تحميل بيانات العمولات.' }, empty: { title: 'لا توجد سجلات', body: 'لا توجد سجلات عمولات لهذا العرض حتى الآن.' }, error: { title: 'تعذر التحميل', body: 'تعذر تحميل بيانات العمولات بأمان.' }, retry: { title: 'انقطع الاتصال', body: 'أعد محاولة طلب العمولات عند توفر الاتصال.' }, permission: { title: 'الإذن مطلوب', body: 'لا تملك جلسة المسؤول هذه إذناً لعرض أو تغيير سجلات العمولات.' }, not_found: { title: 'الحساب غير موجود', body: 'اختر حساباً من القائمة أو تحقق من معرّف الحساب.' } },
    kinds: { percentage: 'نسبة', fixed: 'مبلغ ثابت', exempt: 'إعفاء' }, statuses: { draft: 'مسودة', active: 'فعالة', inactive: 'غير فعالة', archived: 'مؤرشفة' }, scopes: { default: 'افتراضي', provider_type: 'نوع مقدم الخدمة', transaction_type: 'نوع المعاملة', property_kind: 'نوع العقار', organization: 'المنظمة', account: 'الحساب' }, sources: { exception: 'استثناء', account_override: 'تجاوز حساب', policy: 'سياسة', none: 'لا يوجد' }, targetTypes: { commission_policy: 'سياسة', commission_exception: 'استثناء', commission_account_override: 'تجاوز حساب', commission_confirmation: 'تأكيد' }, noAccount: 'أدخل معرّف حساب مكوّناً من 24 حرفاً سداسياً عشرياً.', validation: 'راجع الحقول المطلوبة. النسبة من 0 إلى 100، وتاريخ الانتهاء بعد تاريخ البداية.', saved: 'تم الحفظ بنجاح.', count: total => `${total} سجل`, page: (page, pages) => `صفحة ${page} من ${pages}`, value: valueLabel
  },
  en: {
    eyebrow: 'Commission administration',
    mutation: {
      duplicateAccount: 'This account already has an override with the same start date and different details or a non-draft status. The existing record was not changed. Use a different start date to create a new override.',
      conflict: 'The record already exists or its version has changed. Refresh the page and review the data before trying again.',
      network: 'Could not connect to save the commission. Check your connection and retry; repeating the same save does not create another draft.',
      failed: 'Could not save the commission. Try again and contact support if the problem persists.',
      savedDraft: 'The record was saved as a draft. The account’s active commission has not changed.'
    },
    autoKey: 'Generated automatically; leave blank',
    navLabel: 'Commissions',
    titles: { policies: 'Commission policies', newPolicy: 'Create commission policy', history: 'Commission change history', account: 'Account commission', exceptions: 'Commission exceptions', newException: 'Create exception', confirmations: 'Commission confirmations' },
    descriptions: { policies: 'Review explicit policies and their effective windows.', newPolicy: 'Choose the commission type, scope and start date. Enter 2.5 for 2.5%; the policy code is generated automatically. Policies are saved as drafts before activation.', history: 'Review the chronological record of sensitive changes.', account: 'Choose a provider account to view its current commission. An override here applies only to this account.', exceptions: 'Review account-linked commission exceptions.', newException: 'Record an exception with a reason and effective date.', confirmations: 'Review policy, account, and exception confirmations.' },
    tabs: [['/admin/commissions', 'Policies'], ['/admin/commissions/new', 'New policy'], ['/admin/commissions/history', 'History'], ['/admin/commissions/account', 'Account'], ['/admin/commissions/exceptions', 'Exceptions'], ['/admin/commissions/exceptions/new', 'New exception'], ['/admin/commissions/confirmations', 'Confirmations']],
    actions: { retry: 'Retry', create: 'Create', save: 'Save', apply: 'Apply', previous: 'Previous', next: 'Next', back: 'Back' },
    labels: { key: 'Policy code (optional)', label: 'Label', kind: 'Kind', scope: 'Scope', scopeKey: 'Scope key', status: 'Status', value: 'Value', effectiveFrom: 'Effective from', effectiveTo: 'Effective to', currency: 'Currency', amountMinor: 'Commission amount', percentageBps: 'Commission (%)', accountId: 'Account ID', reason: 'Reason', source: 'Source', policyVersion: 'Policy version', action: 'Action', targetType: 'Target type', targetId: 'Target ID', createdAt: 'Created at', acknowledgedAt: 'Acknowledged at', effectiveAt: 'Effective at', version: 'Version' },
    states: baseStates, kinds: { percentage: 'Percentage', fixed: 'Fixed amount', exempt: 'Exempt' }, statuses: { draft: 'Draft', active: 'Active', inactive: 'Inactive', archived: 'Archived' }, scopes: { default: 'Default', provider_type: 'Provider type', transaction_type: 'Transaction type', property_kind: 'Property kind', organization: 'Organization', account: 'Account' }, sources: { exception: 'Exception', account_override: 'Account override', policy: 'Policy', none: 'None' }, targetTypes: { commission_policy: 'Policy', commission_exception: 'Exception', commission_account_override: 'Account override', commission_confirmation: 'Confirmation' }, noAccount: 'Enter a 24-character hexadecimal accountId.', validation: 'Check the required fields. Percentages must be between 0 and 100, and the end date must follow the start date.', saved: 'Saved successfully.', count: total => `${total} records`, page: (page, pages) => `Page ${page} of ${pages}`, value: valueLabel
  },};

export function getAdminCommissionsCopy(locale: SupportedLocale): AdminCommissionsCopy {
  return localizeCopy('admin_commissions/copy#getAdminCommissionsCopy', locale, copyByLocale[locale]);
}
