import { useEffect, useState } from 'react';
import type { AdBannerConfig, SupportedLocale } from '@sadat-real-estate/contracts';
import { getBannerControlCopy } from './banner-controls-copy.ts';
export { getBannerControlCopy } from './banner-controls-copy.ts';
import { Button } from '../design_system/index.ts';
import type { AdminHomeSource } from './data.ts';

export function BannerDisplayControls({ locale, source }: { locale: SupportedLocale; source: AdminHomeSource }) {
  const copy = getBannerControlCopy(locale);
  const [config, setConfig] = useState<AdBannerConfig>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setError(false);
    void source.loadBannerConfig().then(value => { if (active) setConfig(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [source, attempt]);
  async function toggle() {
    if (!config) return;
    setBusy(true); setError(false);
    try { setConfig(await source.updateBannerConfig({ enabled: !config.enabled, expectedVersion: config.version, reason: config.enabled ? 'Stop homepage banner display' : 'Enable homepage banner display' })); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return <section className="admin-home__panel admin-home__banner-settings"><h2>{copy.setup}</h2><p>{copy.configureHint}</p>{config ? <><p role="status">{config.enabled ? copy.on : copy.off}</p><Button variant="secondary" disabled={busy} onClick={() => void toggle()}>{config.enabled ? copy.disable : copy.enable}</Button></> : null}{error ? <p role="alert">{copy.setupError} <Button size="sm" variant="ghost" onClick={() => setAttempt(value => value + 1)}>{locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}</Button></p> : null}</section>;
}
