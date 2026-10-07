import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { publicPropertySearchQuerySchema, type SupportedLocale } from '@sadat-real-estate/contracts';

export interface HomepagePriceRangeProps {
  readonly locale: SupportedLocale;
  readonly transactionType: 'sale' | 'rent';
  readonly minPrice: string;
  readonly maxPrice: string;
  readonly onChange: (minPrice: string, maxPrice: string) => void;
}

export function isHomepagePriceRangeValid(min: string, max: string): boolean {
  return publicPropertySearchQuerySchema.safeParse({
    ...(min === '' ? {} : { minPrice: min }), ...(max === '' ? {} : { maxPrice: max })
  }).success;
}

export function HomepagePriceRange({ locale, transactionType, minPrice, maxPrice, onChange }: HomepagePriceRangeProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const ar = locale === 'ar';
  const copy = ar
    ? { price: 'السعر', range: 'نطاق السعر', from: 'من', to: 'إلى', min: 'أقل سعر', max: 'أعلى سعر', unit: 'جنيه مصري', optional: 'اختياري', noLimit: 'بدون حد أقصى', clear: 'مسح السعر', done: 'تطبيق', help: 'حرّك المؤشرين أو اكتب السعر المناسب. تحديد السعر اختياري.', error: 'اكتب أسعارًا صحيحة، ويكون سعر «من» أقل من أو يساوي سعر «إلى».', review: 'راجع السعر', sale: 'ميزانية الشراء', rent: 'ميزانية الإيجار' }
    : { price: 'Price', range: 'Price range', from: 'From', to: 'To', min: 'Minimum price', max: 'Maximum price', unit: 'EGP', optional: 'Optional', noLimit: 'No upper limit', clear: 'Clear price', done: 'Apply', help: 'Move the handles or enter your budget. Price is optional.', error: 'Enter valid prices with the minimum no higher than the maximum.', review: 'Check price', sale: 'Purchase budget', rent: 'Rental budget' };
  const valid = isHomepagePriceRangeValid(minPrice, maxPrice);
  const baseCeiling = transactionType === 'rent' ? 100_000 : 10_000_000;
  const step = transactionType === 'rent' ? 500 : 50_000;
  const numericPrice = (value: string) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const ceiling = Math.ceil(Math.max(baseCeiling, numericPrice(minPrice), numericPrice(maxPrice)) / step) * step;
  const lower = numericPrice(minPrice);
  const upper = maxPrice === '' ? ceiling : Math.max(lower, numericPrice(maxPrice));
  const format = (value: string | number) => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-EG', { numberingSystem: 'latn', maximumFractionDigits: 2 }).format(Number(value));
  const summary = !valid ? copy.review : minPrice && maxPrice ? `${format(minPrice)} – ${format(maxPrice)}`
    : minPrice ? `${copy.from} ${format(minPrice)}` : maxPrice ? `${copy.to} ${format(maxPrice)}` : copy.price;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', escape); };
  }, [open]);

  function finish() { setOpen(false); trigger.current?.focus(); }

  return <div className="homepage-price-range" ref={root} data-open={open}>
    <input type="hidden" name="minPrice" value={minPrice} disabled={minPrice === ''} />
    <input type="hidden" name="maxPrice" value={maxPrice} disabled={maxPrice === ''} />
    <button ref={trigger} type="button" className="homepage-price-range__trigger" aria-label={`${copy.range}: ${summary}`} title={`${summary} ${minPrice || maxPrice ? copy.unit : ''}`} aria-expanded={open} aria-controls={`${id}-panel`} aria-invalid={!valid} onClick={() => setOpen(value => !value)}>
      <span dir={valid && minPrice !== '' && maxPrice !== '' ? 'ltr' : undefined}>{summary}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
    </button>
    {open ? <section id={`${id}-panel`} className="homepage-price-range__panel" aria-label={copy.range}>
      <header><strong>{transactionType === 'rent' ? copy.rent : copy.sale}</strong><small>{copy.unit}</small></header>
      <p className="homepage-price-range__help">{copy.help}</p>
      <div className="homepage-price-range__sliders" dir="ltr" style={{ '--range-start': `${Math.min(100, lower / ceiling * 100)}%`, '--range-end': `${Math.min(100, upper / ceiling * 100)}%` } as CSSProperties}>
        <div className="homepage-price-range__track" aria-hidden="true" />
        <input type="range" aria-label={`${copy.min} — ${copy.unit}`} min={0} max={ceiling} step={step} value={lower} aria-valuetext={`${format(lower)} ${copy.unit}`} onChange={event => onChange(String(Math.min(Number(event.currentTarget.value), upper)), maxPrice)} />
        <input type="range" aria-label={`${copy.max} — ${copy.unit}`} min={0} max={ceiling} step={step} value={upper} aria-valuetext={maxPrice === '' ? copy.noLimit : `${format(upper)} ${copy.unit}`} onChange={event => onChange(minPrice, String(Math.max(Number(event.currentTarget.value), lower)))} />
      </div>
      <div className="homepage-price-range__values">
        <label htmlFor={`${id}-min`}><span>{copy.from}</span><input id={`${id}-min`} type="number" inputMode="decimal" min={0} step="any" placeholder={copy.optional} value={minPrice} aria-label={`${copy.min} (${copy.optional})`} aria-invalid={!valid} onChange={event => onChange(event.currentTarget.value, maxPrice)} /></label>
        <label htmlFor={`${id}-max`}><span>{copy.to}</span><input id={`${id}-max`} type="number" inputMode="decimal" min={0} step="any" placeholder={copy.optional} value={maxPrice} aria-label={`${copy.max} (${copy.optional})`} aria-invalid={!valid} onChange={event => onChange(minPrice, event.currentTarget.value)} /></label>
      </div>
      {valid ? <p className="homepage-price-range__limit">{maxPrice === '' ? copy.noLimit : `${copy.to} ${format(maxPrice)} ${copy.unit}`}</p> : <p className="homepage-price-range__error" role="alert">{copy.error}</p>}
      <footer><button type="button" onClick={() => onChange('', '')}>{copy.clear}</button><button type="button" disabled={!valid} onClick={finish}>{copy.done}</button></footer>
    </section> : null}
  </div>;
}
