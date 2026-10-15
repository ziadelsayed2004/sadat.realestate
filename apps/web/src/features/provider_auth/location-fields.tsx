import { useEffect, useId, useState } from 'react';
import type { PublicPropertyLocation, SupportedLocale } from '@sadat-real-estate/contracts';

const normalize = (text: string) => text.normalize('NFKD').replace(/\p{M}|ـ/gu, '').replace(/[أإآٱ]/gu, 'ا').replace(/ى/gu, 'ي').toLowerCase();

export function ProviderLocationFields({ locale, locations, primary, areas, onPrimary, onAreas, showPrimary = true, showAreas = true, error = false, disabled = false, office = false }: {
  readonly locale: SupportedLocale;
  readonly locations: readonly PublicPropertyLocation[];
  readonly primary: string;
  readonly areas: readonly string[];
  readonly onPrimary: (id: string) => void;
  readonly onAreas: (ids: readonly string[]) => void;
  readonly showPrimary?: boolean;
  readonly showAreas?: boolean;
  readonly error?: boolean;
  readonly disabled?: boolean;
  readonly office?: boolean;
}) {
  const ar = locale === 'ar';
  const id = useId();
  const name = (location: PublicPropertyLocation) => location.name[locale] ?? location.name.ar ?? location.slug;
  const selected = locations.find(location => location.id === primary);
  const selectedName = selected ? name(selected) : '';
  const [query, setQuery] = useState(selectedName);
  const [areaQuery, setAreaQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => { if (selectedName) setQuery(selectedName); }, [selectedName]);
  useEffect(() => { if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' }); }, [open, active, id]);
  const matches = (location: PublicPropertyLocation, text: string) => normalize(`${location.name.ar ?? ''} ${location.name.en ?? ''}`).includes(normalize(text.trim()));
  const suggestions = locations.filter(location => matches(location, primary ? '' : query));
  function choose(location: PublicPropertyLocation) {
    onPrimary(location.id); setQuery(name(location)); setOpen(false);
  }
  return <div className="provider-location-fields">
    {showPrimary ? <div className="provider-location-fields__primary">
      <label htmlFor={`${id}-primary`}>{ar ? (office ? 'موقع المكتب (مطلوب للمتابعة)' : 'الموقع الرئيسي (مطلوب للمتابعة)') : 'Primary location (required to continue)'}</label>
      <div className="provider-location-fields__picker">
      <input id={`${id}-primary`} role="combobox" autoComplete="off" value={query} disabled={disabled} maxLength={120}
        placeholder={ar ? 'اكتب اسم المنطقة واختر من القائمة' : 'Type an area and choose a suggestion'}
        aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open && suggestions[active] ? `${id}-option-${active}` : undefined}
        aria-invalid={error && !primary ? true : undefined} aria-describedby={`${id}-help`}
        onFocus={() => { setOpen(true); setActive(0); }} onBlur={() => setOpen(false)}
        onChange={event => { setQuery(event.target.value); onPrimary(''); setOpen(true); setActive(0); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); return; }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive(index => open ? Math.max(0, Math.min(suggestions.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))) : 0);
          } else if (event.key === 'Enter' && open) {
            event.preventDefault(); if (suggestions[active]) choose(suggestions[active]);
          }
        }} />
      {open ? <ul id={`${id}-options`} role="listbox" aria-label={ar ? 'المناطق المتاحة' : 'Available areas'}>
        {suggestions.map((location, index) => <li key={location.id} role="none"><button id={`${id}-option-${index}`} type="button" role="option" aria-selected={location.id === primary} data-active={index === active} tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => choose(location)}>{name(location)}</button></li>)}
        {suggestions.length === 0 ? <li role="presentation">{ar ? 'لا توجد منطقة مطابقة. جرّب اسمًا آخر.' : 'No matching area. Try another name.'}</li> : null}
      </ul> : null}
      </div>
      <small id={`${id}-help`}>{ar ? (office ? 'اختر المنطقة الموجود فيها مكتبك مرة واحدة. أسفلها اختر المناطق التي تقدم فيها خدماتك؛ ممكن تكون أكثر من منطقة.' : 'اكتب للبحث، ثم اختر مقر الشركة من الاقتراحات. مناطق الخدمة تختارها أسفل.') : 'Search and select your office location. Choose service areas below.'}</small>
    </div> : null}
    {showAreas ? <fieldset className="provider-account-consents" disabled={disabled} aria-invalid={error && areas.length === 0 ? true : undefined}>
      <legend>{ar ? (office ? 'المناطق التي يخدمها المكتب (اختر منطقة واحدة على الأقل)' : 'مناطق الخدمة (اختر منطقة واحدة على الأقل)') : 'Service areas (choose at least one)'}</legend>
      <label htmlFor={`${id}-areas`}>{ar ? 'ابحث في مناطق الخدمة' : 'Search service areas'}</label>
      <input id={`${id}-areas`} type="search" maxLength={120} value={areaQuery} onChange={event => setAreaQuery(event.target.value)} />
      <small role="status">{ar ? `المناطق المختارة: ${areas.length}` : `Selected areas: ${areas.length}`}</small>
      <div className="provider-location-fields__areas">{locations.filter(location => matches(location, areaQuery)).map(location => <label className="provider-account-checkbox" key={location.id}>
        <input type="checkbox" checked={areas.includes(location.id)} onChange={event => onAreas(event.target.checked ? [...areas, location.id] : areas.filter(area => area !== location.id))} /><span>{name(location)}</span>
      </label>)}</div>
      {areaQuery && !locations.some(location => matches(location, areaQuery)) ? <p role="status">{ar ? 'لا توجد منطقة مطابقة.' : 'No matching area.'}</p> : null}
    </fieldset> : null}
  </div>;
}
