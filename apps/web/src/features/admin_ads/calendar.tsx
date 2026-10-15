import { useState } from 'react';
import type { AdCalendarListData, SupportedLocale } from '@sadat-real-estate/contracts';
import { getAdminAdsCopy } from './copy.ts';
import { adPlacementName } from './placement-guide.tsx';
import { egyptDurationLabel, egyptLocalDateTime } from '../public/egypt-time.ts';

export function CalendarTable({ data, locale }: { data: AdCalendarListData; locale: SupportedLocale }) {
  const ar = locale === 'ar', copy = getAdminAdsCopy(locale);
  const [date, setDate] = useState(''), [scope, setScope] = useState('all');
  const now = Date.now();
  const items = data.items.filter(item => (!date || egyptLocalDateTime(new Date(item.startsAt)).slice(0, 10) <= date && egyptLocalDateTime(new Date(item.endsAt)).slice(0, 10) >= date) &&
    (scope === 'all' || scope === 'upcoming' && Date.parse(item.startsAt) > now || scope === 'current' && Date.parse(item.startsAt) <= now && now < Date.parse(item.endsAt) || scope === 'ended' && Date.parse(item.endsAt) <= now))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.requestId.localeCompare(b.requestId));
  const time = (value: string) => new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  return <div className="admin-ads-calendar">
    <div className="admin-ads__detail-actions"><a href={`/admin/ads/featured?lang=${locale}`}>{ar ? 'إضافة كارت مميز' : 'Add featured card'}</a><a href={`/admin/banners/new?lang=${locale}`}>{ar ? 'إضافة بانر الرئيسية' : 'Add homepage banner'}</a></div>
    <div className="admin-ads-calendar__filters"><label>{ar ? 'اعرض إعلانات يوم' : 'Advertisements on date'}<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>{ar ? 'الفترة' : 'Period'}<select value={scope} onChange={event => setScope(event.target.value)}>{(ar ? [['all', 'كل المواعيد'], ['current', 'في فترة العرض الآن'], ['upcoming', 'قادم'], ['ended', 'انتهت فترته']] : [['all', 'All dates'], ['current', 'Within display period'], ['upcoming', 'Upcoming'], ['ended', 'Period ended']]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" onClick={() => { setDate(''); setScope('all'); }}>{ar ? 'مسح التصفية' : 'Clear filters'}</button></div>
    <p>{ar ? 'بتوقيت مصر. التصفية للمواعيد في الصفحة الحالية. الحجز لا يعني نشر التصميم؛ افتح الإعلان لمراجعته.' : 'Egypt time. Filters apply to this page. A reserved slot does not mean the creative is published; open the ad to review it.'}</p>
    <div className="admin-ads-calendar__cards">{items.map(item => <article key={`${item.requestId}-${item.version}`} data-testid={`admin-ad-calendar-${item.requestId}`}>
      <header><h3>{adPlacementName(item.placementKey, locale)}</h3><span className="admin-ads-calendar__status">{copy.calendarStatus[item.status] ?? item.status}</span></header>
      <dl><div><dt>{ar ? 'البداية' : 'Starts'}</dt><dd><time dateTime={item.startsAt}>{time(item.startsAt)}</time></dd></div><div><dt>{ar ? 'النهاية' : 'Ends'}</dt><dd><time dateTime={item.endsAt}>{time(item.endsAt)}</time></dd></div><div><dt>{ar ? 'مدة العرض' : 'Display duration'}</dt><dd>{egyptDurationLabel(new Date(item.startsAt), new Date(item.endsAt), locale)}</dd></div></dl>
      <nav aria-label={ar ? 'إجراءات الإعلان' : 'Ad actions'}><a href={`${item.placementKey === 'homepage.featured' ? '/admin/ads/featured?requestId=' : '/admin/banners?adRequestId='}${item.requestId}&lang=${locale}`}>{ar ? 'تعديل التصميم والموعد' : 'Edit creative and schedule'}</a><a href={`/admin/ads/requests?requestId=${item.requestId}&lang=${locale}`}>{ar ? 'فتح طلب الإعلان' : 'Open ad request'}</a><a href={`/admin/providers/${item.providerId}?lang=${locale}`}>{ar ? 'حساب المعلن' : 'Advertiser account'}</a></nav>
    </article>)}</div>
    {!items.length ? <p role="status">{ar ? 'لا توجد مواعيد مطابقة لهذه التصفية.' : 'No schedules match these filters.'}</p> : null}
  </div>;
}
