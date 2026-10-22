import { useContext, useEffect, useState } from 'react';
import { z } from 'zod';
import { propertyDataSchema, type PropertyData, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';
import { RouteShellAuthContext } from '../routing/shells.tsx';
import { Button } from '../design_system/index.ts';

function visible(property: PropertyData) {
  return property.status === 'published' && property.active && (property.expiresAt === undefined || Date.parse(property.expiresAt) > Date.now());
}

export function FeaturedPropertyControl({ property, locale, onSaved }: { property: PropertyData; locale: SupportedLocale; onSaved: (property: PropertyData) => void }) {
  const auth = useContext(RouteShellAuthContext), ar = locale === 'ar';
  const [featured, setFeatured] = useState(property.featured ?? false);
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('');
  useEffect(() => { setFeatured(property.featured ?? false); }, [property]);
  const save = async () => {
    setBusy(true); setFeedback('');
    try {
      const result = await new ApiClient().request(`/admin/properties/${property.id}/featured`, {
        method: 'PUT', json: { version: property.version, featured, reason: 'Manage homepage featured property' },
        headers: { authorization: auth?.getAuthorizationHeader?.() ?? '' }, responseSchema: z.object({ data: propertyDataSchema })
      });
      const saved = result.data.data;
      onSaved(saved);
      setFeedback(!saved.featured ? (ar ? 'تم إلغاء اختيار العقار للرئيسية.' : 'Homepage selection removed.') : visible(saved)
        ? (ar ? 'تمت إضافة العقار في أول عقارات مختارة بالرئيسية تلقائيًا.' : 'Property added first in the homepage selection automatically.')
        : (ar ? 'تم حفظ الاختيار، لكن العقار لن يظهر حتى يكون منشورًا ومفعّلًا وغير منتهي. انشره أو جدّد ظهوره أولًا.' : 'Selection saved, but the property must be published, active and unexpired before it can appear. Publish or renew it first.'));
    } catch {
      setFeedback(ar ? 'تعذر الحفظ؛ تحقق من الصلاحيات وحدّث العقار ثم حاول مجددًا.' : 'Save failed. Check permissions and reload the property.');
    } finally { setBusy(false); }
  };
  return <details open className="admin-properties__action-card" id="property-homepage-featured">
    <summary>{ar ? 'عقارات مختارة في الرئيسية' : 'Homepage property selection'}</summary>
    <p>{ar ? 'الترتيب تلقائي: آخر عقار تختاره يظهر أولًا ضمن ٣ عقارات. وباقي الأماكن تُكمل بأحدث العقارات المنشورة.' : 'Automatic order: the last property selected appears first among 3 properties. Remaining places show the latest published properties.'}</p>
    {!visible(property) ? <p>{ar ? 'هذا العقار غير ظاهر للزوار حاليًا. الاختيار وحده لا ينشره ولا يجدّد صلاحيته.' : 'This property is not currently public. Selecting it does not publish it or renew its expiry.'}</p> : null}
    <form onSubmit={event => { event.preventDefault(); if (!busy) void save(); }}>
      <label><input type="checkbox" checked={featured} disabled={busy} onChange={event => setFeatured(event.target.checked)} />{ar ? 'تمييز العقار في الرئيسية' : 'Feature on homepage'}</label>
      <Button type="submit" disabled={busy}>{ar ? 'حفظ التمييز' : 'Save featured selection'}</Button>
    </form>
    {feedback ? <p role="status">{feedback}</p> : null}
    {property.featured && visible(property) ? <a href={`/?lang=${locale}#public-homepage-properties`}>{ar ? 'عرض العقار في الرئيسية' : 'View property on homepage'}</a> : null}
  </details>;
}
