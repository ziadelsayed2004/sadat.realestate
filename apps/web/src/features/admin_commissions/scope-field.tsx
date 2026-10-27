import type { CommissionScope, SupportedLocale } from '@sadat-real-estate/contracts';

export function scopeLabel(scope: CommissionScope, locale: SupportedLocale): string {
  const ar = locale === 'ar';
  const types: Record<string, string> = { individual_broker: ar ? 'مالك عقار' : 'Property owner', brokerage_office: ar ? 'مكتب عقارات' : 'Real estate office', developer_company: ar ? 'شركة تطوير عقاري' : 'Developer company' };
  if (scope.kind === 'provider_type') return types[scope.key ?? ''] ?? scope.key ?? '—';
  if (scope.kind === 'default') return ar ? 'كل الحسابات بدون اتفاق خاص' : 'Accounts without a specific agreement';
  return scope.key ?? '—';
}

export function ScopeField({ locale, kind, value, onChange }: { locale: SupportedLocale; kind: CommissionScope['kind']; value: string; onChange: (value: string) => void }) {
  if (kind === 'default') return null;
  const ar = locale === 'ar';
  const choices = kind === 'provider_type' ? [['individual_broker', ar ? 'مالك عقار' : 'Property owner'], ['brokerage_office', ar ? 'مكتب عقارات' : 'Real estate office'], ['developer_company', ar ? 'شركة تطوير عقاري' : 'Developer company']]
    : kind === 'transaction_type' ? [['sale', ar ? 'بيع' : 'Sale'], ['rent', ar ? 'إيجار' : 'Rent']]
    : kind === 'property_kind' ? [['property', ar ? 'عقار' : 'Property'], ['unit', ar ? 'وحدة' : 'Unit']] : undefined;
  const label = kind === 'provider_type' ? ar ? 'فئة الحساب' : 'Account category' : ar ? 'الحساب أو المؤسسة المستهدفة' : 'Target account or organization';
  return <label className="admin-commissions__field" htmlFor="admin-commission-policy-scope-key"><span>{label}</span>
    {choices ? <select id="admin-commission-policy-scope-key" aria-label={label} value={value} onChange={event => onChange(event.target.value)} required><option value="">{ar ? 'اختر الفئة' : 'Select category'}</option>{choices.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>
      : <input id="admin-commission-policy-scope-key" value={value} onChange={event => onChange(event.target.value)} required pattern="[a-f0-9]{24}" />}
    <small>{ar ? 'الفئة بتحدد مين تتطبق عليه السياسة تلقائيًا. للاتفاق مع شركة بعينها، استخدم «الحساب» واختر اسم الشركة.' : 'The policy applies automatically to this category. Use Account commission for an agreement with a specific company.'}</small>
  </label>;
}
