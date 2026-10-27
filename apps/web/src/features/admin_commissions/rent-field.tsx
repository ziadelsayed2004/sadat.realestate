import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function rentLabel(months: number | undefined, locale: SupportedLocale): string {
  const ar = locale === 'ar';
  if (months === undefined) return ar ? 'الإيجار: لم يُحدد في هذا الاتفاق' : 'Rent: not specified in this agreement';
  if (months === 0) return ar ? 'الإيجار: بدون عمولة' : 'Rent: exempt';
  if (months === 0.5) return ar ? 'الإيجار: نصف شهر من الإيجار الشهري' : 'Rent: half of one month’s rent';
  return ar ? `الإيجار: ${months.toLocaleString(locale)} شهر من الإيجار الشهري` : `Rent: ${months.toLocaleString(locale)} month(s) of monthly rent`;
}

export function RentField({ locale, value, onChange }: { locale: SupportedLocale; value: string; onChange: (value: string) => void }) {
  const ar = locale === 'ar';
  return <label className="admin-commissions__field"><span>{ar ? 'عمولة الإيجار (عدد الأشهر)' : 'Rental commission (months)'}</span>
    <input aria-label={ar ? 'عمولة الإيجار (عدد الأشهر)' : 'Rental commission (months)'} type="number" min="0" max="12" step="0.01" value={value} onChange={event => onChange(event.target.value)} required />
    <small>{ar ? 'اكتب 0.5 لنصف شهر، أو 1 لشهر. تُحسب من الإيجار الشهري، وليس إجمالي مدة العقد. مثال: إيجار 4000 جنيه × 0.5 = عمولة 2000 جنيه. قابلة للتعديل من هنا.' : 'Enter 0.5 for half a month, or 1 for one month. The basis is monthly rent, not the entire lease. Example: 4,000 × 0.5 = 2,000.'}</small>
  </label>;
}
