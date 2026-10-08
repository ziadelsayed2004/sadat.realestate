import type { SupportedLocale, TeamCategory } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';

export function teamDepartmentLabel(category: string | undefined, categories: readonly TeamCategory[], locale: SupportedLocale): string {
  const item = categories.find(item => item.key === category);
  return item?.label[locale] ?? item?.label.ar ?? item?.label.en ?? category ?? (locale === 'ar' ? 'غير مصنف' : 'Unassigned');
}

export function TeamDepartmentField({ value, categories, locale, disabled, onChange }: {
  value: string; categories: readonly TeamCategory[]; locale: SupportedLocale; disabled: boolean; onChange: (value: string) => void;
}) {
  const ar = locale === 'ar';
  const options = categories.filter(item => item.active || item.key === value);
  const manage = () => {
    const manager = document.getElementById('team-departments');
    if (manager instanceof HTMLDetailsElement) {
      manager.open = true;
      manager.scrollIntoView({ block: 'start', behavior: 'smooth' });
      manager.querySelector('summary')?.focus({ preventScroll: true });
    }
  };
  return <div>
    <label htmlFor="admin-cms-team-category">{ar ? 'قسم الفريق' : 'Team department'}
      <select id="admin-cms-team-category" value={value} disabled={disabled} onChange={event => onChange(event.target.value)} aria-describedby="admin-cms-team-category-help">
        <option value="">{ar ? 'غير مصنف' : 'Unassigned'}</option>
        {value && !options.some(item => item.key === value) ? <option value={value}>{value}</option> : null}
        {options.map(item => <option key={item.key} value={item.key}>{teamDepartmentLabel(item.key, categories, locale)}</option>)}
      </select>
    </label>
    <p id="admin-cms-team-category-help" className="admin-content__muted">{ar ? 'اختر إدارة أو مبيعات أو قسمًا أنشأته. يظهر الشخص تحت هذا القسم في صفحة فريق العمل. اكتب «مدير المبيعات» مثلًا في المسمى الوظيفي.' : 'Choose management, sales or a department you created. The person appears under it on the Team page. Enter a title such as Sales Manager separately.'}</p>
    <Button type="button" size="sm" variant="secondary" onClick={manage}>{ar ? 'إضافة أو تعديل قسم' : 'Add or edit a department'}</Button>
  </div>;
}
