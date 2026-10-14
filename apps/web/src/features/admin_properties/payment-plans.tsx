import type { PropertyPaymentPlan, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';

export function AdminPaymentPlans({ locale, enabled, onEnabled, plans, onChange, currency }: {
  locale: SupportedLocale; enabled: boolean; onEnabled: (value: boolean) => void;
  plans: readonly PropertyPaymentPlan[]; onChange: (plans: PropertyPaymentPlan[]) => void; currency: string;
}) {
  const ar = locale === 'ar';
  const update = (index: number, change: Partial<PropertyPaymentPlan>) => onChange(plans.map((plan, position) => position === index ? { ...plan, ...change } : plan));
  const add = () => onChange([...plans, { name: { ar: 'خطة تقسيط', en: 'Installment plan' }, installments: 12, frequency: 'monthly', installmentAmount: { amount: NaN, currency } }]);
  return <section aria-label={ar ? 'السداد والتقسيط' : 'Payment and installments'}>
    <h3>{ar ? 'السداد والتقسيط' : 'Payment and installments'}</h3>
    <label>{ar ? 'طريقة السداد' : 'Payment method'}<select aria-label={ar ? 'طريقة السداد' : 'Payment method'} value={enabled ? 'installments' : 'cash'} onChange={event => { const next = event.target.value === 'installments'; onEnabled(next); if (next && !plans.length) add(); }}><option value="cash">{ar ? 'كاش فقط — بدون تقسيط' : 'Cash only — no installments'}</option><option value="installments">{ar ? 'متاح بالتقسيط' : 'Installments available'}</option></select></label>
    <p>{ar ? 'البيع أو الإيجار هو نوع العرض. لإزالة شارة التقسيط اختر كاش فقط ثم احفظ التعديلات.' : 'Sale or rent is the listing type. Choose cash only and save to remove the installment badge.'}</p>
    <Button type="button" variant="secondary" onClick={() => onEnabled(false)}>{ar ? 'إلغاء التقسيط' : 'Remove installments'}</Button>
    {enabled ? <>{plans.map((plan, index) => <fieldset key={index} aria-label={`${ar ? 'خطة' : 'Plan'} ${index + 1}`}><legend>{ar ? 'خطة' : 'Plan'} {index + 1}</legend><div className="admin-property-editor__grid">
      {(['ar', 'en'] as const).map(language => <label key={language}>{ar ? 'اسم الخطة' : 'Plan name'} {language.toUpperCase()}<input value={plan.name[language] ?? ''} onChange={event => update(index, { name: { ...plan.name, [language]: event.target.value } })} /></label>)}
      <label>{ar ? 'عدد الأقساط' : 'Installments'}<input type="number" min="1" max="120" step="1" value={Number.isFinite(plan.installments) ? plan.installments : ''} onChange={event => update(index, { installments: event.target.valueAsNumber })} /></label>
      <label>{ar ? 'دورية السداد' : 'Payment frequency'}<select aria-label={ar ? 'دورية السداد' : 'Payment frequency'} value={plan.frequency} onChange={event => update(index, { frequency: event.target.value as PropertyPaymentPlan['frequency'] })}>{(['monthly', 'quarterly', 'annually'] as const).map((value, position) => <option key={value} value={value}>{(ar ? ['شهري', 'ربع سنوي', 'سنوي'] : ['Monthly', 'Quarterly', 'Annually'])[position]}</option>)}</select></label>
      <label>{ar ? 'المقدم (اختياري)' : 'Down payment (optional)'}<input type="number" min="0.01" step="any" value={plan.downPayment && Number.isFinite(plan.downPayment.amount) ? plan.downPayment.amount : ''} onChange={event => update(index, { downPayment: event.target.value === '' ? undefined : { amount: event.target.valueAsNumber, currency } })} /></label>
      <label>{ar ? 'قيمة القسط' : 'Installment amount'} ({currency})<input type="number" min="0.01" step="any" value={Number.isFinite(plan.installmentAmount.amount) ? plan.installmentAmount.amount : ''} onChange={event => update(index, { installmentAmount: { amount: event.target.valueAsNumber, currency } })} /></label>
    </div><Button type="button" variant="secondary" onClick={() => { onChange(plans.filter((_, position) => position !== index)); if (plans.length === 1) onEnabled(false); }}>{ar ? 'حذف الخطة' : 'Remove plan'}</Button></fieldset>)}<Button type="button" variant="secondary" disabled={plans.length >= 20} onClick={add}>{ar ? 'إضافة خطة تقسيط' : 'Add installment plan'}</Button></> : null}
  </section>;
}
