export const EGYPT_TIME_ZONE = 'Africa/Cairo';

/** Cairo civil time, independent of the browser's time zone and calendar. */
export function egyptLocalDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EGYPT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

export function egyptInstant(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)) return undefined;
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) return undefined;
  // Test both Cairo offsets against the IANA rules for the requested date.
  // This rejects a missing spring hour, and chooses the earlier repeated fall hour.
  for (const offset of [3, 2]) {
    const date = new Date(wall - offset * 3_600_000);
    if (egyptLocalDateTime(date) === value) return date;
  }
  return undefined;
}

export function egyptTimeLabel(locale: string, date: Date): string {
  const zone = new Intl.DateTimeFormat('en', { timeZone: EGYPT_TIME_ZONE, timeZoneName: 'shortOffset' })
    .formatToParts(date).find(part => part.type === 'timeZoneName')?.value ?? 'GMT+2';
  return `${locale === 'ar' ? 'توقيت مصر' : 'Egypt time'} (${zone})`;
}
