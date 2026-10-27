import type { SupportedLocale, TeamCategory } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import './team-categories.css';

export function teamDepartmentLabel(category: string | undefined, categories: readonly TeamCategory[], locale: SupportedLocale): string {
  const item = categories.find(item => item.key === category);
  return item?.label[locale] ?? item?.label.ar ?? item?.label.en ?? category ?? (locale === 'ar' ? 'غير مصنف' : 'Unassigned');
}

export function TeamDepartmentField({ value, categories, locale, disabled, onChange }: {
  value: readonly string[]; categories: readonly TeamCategory[]; locale: SupportedLocale; disabled: boolean; onChange: (value: string[]) => void;
}) {
  const ar = locale === 'ar';
  const options = categories.filter(item => item.active || value.includes(item.key));
  const keys = [...options.map(item => item.key), ...value.filter(key => !options.some(item => item.key === key))];
  const manage = () => {
    const manager = document.getElementById('team-departments');
    if (manager instanceof HTMLDetailsElement) {
      manager.open = true;
      manager.scrollIntoView({ block: 'start', behavior: 'smooth' });
      manager.querySelector('summary')?.focus({ preventScroll: true });
    }
  };
  return <div className="admin-team-department-field">
    <fieldset id="admin-cms-team-category" className="admin-team-department-field__options" disabled={disabled} aria-describedby="admin-cms-team-category-help">
      <legend>{ar ? 'أقسام الفريق' : 'Team departments'}</legend>
      {keys.map(key => <label key={key} className="admin-team-department-field__choice"><input type="checkbox" checked={value.includes(key)} onChange={event => onChange(event.target.checked ? [...value, key] : value.filter(item => item !== key))} />{teamDepartmentLabel(key, categories, locale)}{categories.find(item => item.key === key)?.active === false ? <small>{ar ? '(متوقف)' : '(Inactive)'}</small> : null}</label>)}
      {keys.length === 0 ? <p>{ar ? 'أضف قسمًا أولًا من الزر أدناه.' : 'Add a department using the button below.'}</p> : null}
    </fieldset>
    <p id="admin-cms-team-category-help" className="admin-content__muted">{ar ? 'اختَر قسمًا أو أكثر، مثل مبيعات ودعم. يظهر الشخص مرة واحدة في «الكل»، وتحت كل قسم اخترته. إلغاء كل الاختيارات يجعله غير مصنف. المسمى الوظيفي مستقل.' : 'Choose one or more departments, such as Sales and Support. The member appears once under All and in each selected department. Clear all choices for Unassigned. Job title is separate.'}</p>
    <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={manage}>{ar ? 'إضافة أو تعديل قسم' : 'Add or edit a department'}</Button>
  </div>;
}
