import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminHomeSource } from '../admin_home/data.ts';
import { Button } from '../design_system/index.ts';

export function FeaturedDisplaySettings({ locale, source, onClose, onSaved }: { locale: SupportedLocale; source: AdminHomeSource; onClose: () => void; onSaved: () => void }) {
  const ar = locale === 'ar';
  const [config, setConfig] = useState<Awaited<ReturnType<AdminHomeSource['loadBannerConfig']>>>();
  const [active, setActive] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => { let current = true; setError(false); void source.loadBannerConfig().then(value => { if (current) { setConfig(value); setActive(value.enabled && value.placements.some(row => row.key === 'homepage.featured' && row.active)); } }, () => { if (current) setError(true); }); return () => { current = false; }; }, [source, attempt]);
  return <section className="admin-featured__display-settings" aria-label={ar ? 'إعدادات عرض الكروت' : 'Card display settings'}>
    <div className="admin-home__inline-actions"><h2>{ar ? 'عرض الكروت في الرئيسية' : 'Homepage card display'}</h2><Button variant="secondary" onClick={onClose}>{ar ? 'إغلاق' : 'Close'}</Button></div>
    <p>{ar ? 'تشغيل القسم لا ينشر المسودات تلقائيًا. عدّل الكارت ثم انشره بموعد وصورة ساريين.' : 'Enabling the section does not publish drafts. Edit a card, then publish it with valid dates and an image.'}</p>
    {config ? <form onSubmit={event => { event.preventDefault(); if (busy) return; setBusy(true); setError(false); void source.updateBannerConfig({ enabled: active ? true : config.enabled, featuredActive: active, expectedVersion: config.version, reason: 'Update featured card display' }).then(value => { setConfig(value); onSaved(); }, () => setError(true)).finally(() => setBusy(false)); }}>
      <label className="admin-featured__installment"><input type="checkbox" role="switch" checked={active} disabled={busy} onChange={event => setActive(event.target.checked)} />{ar ? 'إظهار قسم الإعلانات المميزة' : 'Show featured advertisements'}</label>
      <Button type="submit" disabled={busy}>{ar ? 'حفظ إعدادات العرض' : 'Save display settings'}</Button>
    </form> : !error ? <p role="status">{ar ? 'جارٍ تحميل الإعدادات…' : 'Loading settings…'}</p> : null}
    {error ? <p role="alert">{ar ? 'تعذر تحميل أو حفظ إعدادات العرض. راجع صلاحيات الإعلانات وحدّث الإعدادات.' : 'Could not load or save display settings. Check ad permissions and reload.'}<Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></p> : null}
  </section>;
}
