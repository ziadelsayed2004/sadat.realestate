import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { loadProviderPropertyTypes, type ProviderPropertyTypeOption } from '../provider_property/data.ts';

export function AdminPropertyTaxonomyFields({ value, locale, apiOrigin, onChange, onIncompleteChange }: {
  value: string; locale: SupportedLocale; apiOrigin?: string | undefined;
  onChange: (value: string) => void; onIncompleteChange: (value: boolean) => void;
}) {
  const ar = locale === 'ar';
  const [types, setTypes] = useState<readonly ProviderPropertyTypeOption[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [chosenCategory, setChosenCategory] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    void loadProviderPropertyTypes({ apiOrigin, signal: controller.signal }).then(items => {
      if (!controller.signal.aborted) { setTypes(items); setState('ready'); }
    }, () => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [apiOrigin, attempt]);
  const category = types.find(type => type.id === value)?.categoryId ?? chosenCategory;
  const categories = [...new Map(types.flatMap(type => type.categoryId && type.categoryName ? [[type.categoryId, type.categoryName] as const] : [])).entries()];
  return <div className="admin-property-editor__grid">
    <label>{ar ? 'تصنيف العقار' : 'Property category'}<select value={category} disabled={state !== 'ready'} onChange={event => {
      setChosenCategory(event.target.value); onChange(''); onIncompleteChange(Boolean(event.target.value));
    }}><option value="">{ar ? 'كل التصنيفات' : 'All categories'}</option>{categories.map(([id, name]) => <option key={id} value={id}>{name[locale] ?? name.ar ?? name.en}</option>)}</select></label>
    <label>{ar ? 'نوع العقار' : 'Property type'}<select value={value} disabled={state !== 'ready'} onChange={event => { onChange(event.target.value); onIncompleteChange(Boolean(category) && !event.target.value); }}>
      <option value="">{ar ? 'اختر نوع العقار' : 'Choose property type'}</option>
      {value && !types.some(type => type.id === value) ? <option value={value}>{ar ? 'النوع المحفوظ غير متاح حاليًا' : 'Saved property type currently unavailable'}</option> : null}
      {types.filter(type => !category || type.categoryId === category).map(type => <option key={type.id} value={type.id}>{type.name[locale] ?? type.name.ar ?? type.name.en}</option>)}
    </select></label>
    <p>{ar ? 'اختيار نوع العقار يحفظ التصنيف التابع له. بعد تغيير التصنيف اختر النوع المناسب ثم احفظ التعديلات.' : 'The property type determines its category. After changing category, choose a type and save changes.'}</p>
    {state === 'error' ? <button type="button" onClick={() => setAttempt(current => current + 1)}>{ar ? 'إعادة تحميل التصنيفات' : 'Reload categories'}</button> : null}
  </div>;
}
