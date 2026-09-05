import { useEffect, useState } from 'react';
import type { ProviderAccountPatch, ProviderApplicationData, PublicPropertyLocation, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button, Select } from '../design_system/index.ts';
import { loadProviderAccountLocations } from './locations.ts';

export function DocumentLocationRepair({ application, locale, save, onSaved }: {
  readonly application: ProviderApplicationData;
  readonly locale: SupportedLocale;
  readonly save: (patch: ProviderAccountPatch) => Promise<ProviderApplicationData>;
  readonly onSaved: (application: ProviderApplicationData) => void;
}) {
  const ar = locale === 'ar';
  const [locations, setLocations] = useState<readonly PublicPropertyLocation[]>([]);
  const [primary, setPrimary] = useState(application.primaryLocationId ?? '');
  const [areas, setAreas] = useState<readonly string[]>(application.serviceAreaIds ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    void loadProviderAccountLocations().then(rows => {
      if (active) { setLocations(rows); setError(rows.length === 0); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  return <form onSubmit={event => {
    event.preventDefault();
    if (busy || !primary || areas.length === 0) return;
    setBusy(true); setError(false);
    void save({ version: application.version, primaryLocationId: primary, serviceAreaIds: [...areas] })
      .then(onSaved).catch(() => setError(true)).finally(() => setBusy(false));
  }}>
    <h2>{ar ? 'استكمل موقعك للمتابعة' : 'Complete your location to continue'}</h2>
    <p>{ar ? 'الملفات محفوظة. اختر الموقع الرئيسي ومناطق الخدمة ثم احفظ؛ لا تحتاج لإعادة رفع الملفات.' : 'Your files are saved. Select your primary location and service areas, then save; no re-upload is needed.'}</p>
    <Select label={ar ? 'الموقع الرئيسي' : 'Primary location'} value={primary} onChange={event => setPrimary(event.currentTarget.value)} disabled={busy || locations.length === 0} options={[
      { value: '', label: ar ? 'اختر الموقع الرئيسي' : 'Choose primary location' },
      ...locations.map(location => ({ value: location.id, label: location.name[locale] ?? location.name.ar }))
    ]} />
    <fieldset disabled={busy}><legend>{ar ? 'مناطق الخدمة' : 'Service areas'}</legend>
      {locations.map(location => <label className="provider-account-checkbox" key={location.id}>
        <input type="checkbox" checked={areas.includes(location.id)} onChange={event => { const checked = event.currentTarget.checked; setAreas(previous => checked ? [...previous, location.id] : previous.filter(id => id !== location.id)); }} />
        <span>{location.name[locale] ?? location.name.ar}</span>
      </label>)}
    </fieldset>
    {error ? <p role="alert">{ar ? 'تعذر تحميل أو حفظ الموقع. أعد المحاولة، وارجع لبيانات الحساب إذا استمر الخطأ.' : 'Could not load or save locations. Retry, or return to account details if the error persists.'}<Button type="button" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></p> : null}
    <Button type="submit" disabled={busy || !primary || areas.length === 0}>{busy ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'حفظ الموقع ومناطق الخدمة' : 'Save location and service areas')}</Button>
  </form>;
}
