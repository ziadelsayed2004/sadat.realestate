import type { AdminPresence, SupportedLocale } from '@sadat-real-estate/contracts';

export function StaffPresence({ presence, locale }: { presence?: AdminPresence | undefined; locale: SupportedLocale }) {
  const ar = locale === 'ar';
  if (!presence) return <small>{ar ? 'حالة الاتصال غير متاحة' : 'Presence unavailable'}</small>;
  const at = presence.lastActiveAt ? new Date(presence.lastActiveAt) : undefined;
  const minutes = at ? Math.max(0, Math.floor((Date.now() - at.getTime()) / 60_000)) : 0;
  const unit = minutes < 60 ? 'minute' : minutes < 1440 ? 'hour' : 'day';
  const amount = unit === 'minute' ? minutes : unit === 'hour' ? Math.floor(minutes / 60) : Math.floor(minutes / 1440);
  return <>
    <small>{presence.online ? (ar ? '🟢 متصل الآن' : '🟢 Online now') : at ? (ar ? 'غير متصل' : 'Offline') : (ar ? 'غير متصل — لا يوجد نشاط مسجل' : 'Offline — no activity recorded')}</small>
    {at ? <small>{ar ? 'آخر اتصال: ' : 'Last connected: '}<time dateTime={presence.lastActiveAt!} title={at.toISOString()}>{new Intl.RelativeTimeFormat(ar ? 'ar' : 'en', { numeric: 'auto' }).format(-amount, unit)}</time><br />{at.toLocaleString(ar ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' })}</small> : null}
  </>;
}
