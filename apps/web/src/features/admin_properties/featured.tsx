import { useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { propertyDataSchema, type PropertyData, type SupportedLocale } from '@sadat-real-estate/contracts';
import { createSessionClient } from '../contracts/session-client.ts';
import { RouteShellAuthContext } from '../routing/shells.tsx';
import { Button } from '../design_system/index.ts';
import { ApiClientError } from '../contracts/index.ts';

function visible(property: PropertyData) {
  return property.status === 'published' && property.active && (property.expiresAt === undefined || Date.parse(property.expiresAt) > Date.now());
}

export function FeaturedPropertyControl({ property, locale, onSaved }: { property: PropertyData; locale: SupportedLocale; onSaved: (property: PropertyData) => void }) {
  const auth = useContext(RouteShellAuthContext), ar = locale === 'ar';
  const [featured, setFeatured] = useState(property.featured ?? false);
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFeatured(property.featured ?? false); }, [property]);
  const save = async () => {
    setBusy(true); setFeedback(''); setFailed(false);
    try {
      const result = await createSessionClient({ authorization: auth?.getAuthorizationHeader ? {
        getAuthorizationHeader: () => auth.getAuthorizationHeader?.(),
        ...(auth.refresh ? { refresh: () => auth.refresh!() } : {})
      } : undefined }).request(`/admin/properties/${property.id}/featured`, {
        method: 'PUT', json: { version: property.version, featured, reason: 'Manage homepage featured property' },
        responseSchema: z.object({ data: propertyDataSchema })
      });
      const saved = result.data.data;
      onSaved(saved);
      setFeedback(!saved.featured ? (ar ? 'تم إلغاء اختيار العقار للرئيسية.' : 'Homepage selection removed.') : visible(saved)
        ? (ar ? 'تمت إضافة العقار في أول عقارات مختارة بالرئيسية تلقائيًا.' : 'Property added first in the homepage selection automatically.')
        : (ar ? 'تم حفظ الاختيار، لكن العقار لن يظهر حتى يكون منشورًا ومفعّلًا وغير منتهي. انشره أو جدّد ظهوره أولًا.' : 'Selection saved, but the property must be published, active and unexpired before it can appear. Publish or renew it first.'));
    } catch (error) {
      setFailed(true);
      setFeedback(error instanceof ApiClientError && error.status === 409
        ? ar ? 'تغيّرت نسخة العقار. أعد تحميل الصفحة، ثم اختر التمييز المطلوب واحفظه مجددًا.' : 'The property changed. Reload this page, then choose and save its homepage selection again.'
        : error instanceof ApiClientError && error.status === 403
          ? ar ? 'حسابك لا يملك صلاحية إدارة العقارات اللازمة لحفظ التمييز.' : 'Your account needs property management permission to save this selection.'
          : error instanceof ApiClientError && error.status === 401
            ? ar ? 'تعذر تجديد جلسة الإدارة. سجّل الدخول مجددًا ثم أعد الحفظ.' : 'The admin session could not be renewed. Sign in again and retry.'
            : ar ? 'تعذر حفظ التمييز. اختيارك محفوظ هنا؛ أعد المحاولة.' : 'Could not save the homepage selection. Your choice is retained here; retry.');
    } finally { setBusy(false); }
  };
  return <details open className="admin-properties__action-card admin-properties__featured" id="property-homepage-featured">
    <summary>{ar ? 'عقارات مختارة في الرئيسية' : 'Homepage property selection'}</summary>
    <p>{ar ? 'اختيار العقار يضعه أولًا ضمن ٣ عقارات بالرئيسية. إلغاء الاختيار يزيله من هذا القسم فقط، ويظل ظاهرًا في قائمة العقارات إذا كان منشورًا.' : 'Select this property to place it first among 3 homepage properties. Unselecting removes it from this section only; a published property remains in the property directory.'}</p>
    {!visible(property) ? <p>{ar ? 'هذا العقار غير ظاهر للزوار حاليًا. الاختيار وحده لا ينشره ولا يجدّد صلاحيته.' : 'This property is not currently public. Selecting it does not publish it or renew its expiry.'}</p> : null}
    <form onSubmit={event => { event.preventDefault(); if (!busy) void save(); }}>
      <label><input type="checkbox" checked={featured} disabled={busy} onChange={event => setFeatured(event.target.checked)} />{ar ? 'تمييز العقار في الرئيسية' : 'Feature on homepage'}</label>
      <Button type="submit" disabled={busy}>{ar ? 'حفظ التمييز' : 'Save featured selection'}</Button>
    </form>
    {feedback ? <p role={failed ? 'alert' : 'status'}>{feedback}</p> : null}
    {property.featured && visible(property) ? <a href={`/?lang=${locale}#public-homepage-properties`}>{ar ? 'عرض العقار في الرئيسية' : 'View property on homepage'}</a> : null}
  </details>;
}
