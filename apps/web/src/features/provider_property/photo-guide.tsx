import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function PropertyPhotoGuide({ locale }: { readonly locale: SupportedLocale }) {
  const ar = locale === 'ar';
  const items = [
    ['landscape', ar ? 'صوّر بالموبايل بالعرض' : 'Hold your phone horizontally', ar ? 'ثبّت الموبايل مستقيمًا عند مستوى الصدر، وخلي الأرض والحوائط مستقيمة. بلاش زوم أو عدسة تشوّه المساحة.' : 'Keep the phone level at chest height, with straight floors and walls. Avoid zoom or lenses that distort the space.'],
    ['corner', ar ? 'اختار ركن يوضح الغرفة' : 'Choose a corner of the room', ar ? 'قف في ركن أو عند الباب وصوّر ناحية الركن المقابل؛ خلي الصورة توضح حائطين وجزءًا من الأرض.' : 'Stand in a corner or doorway and face the opposite corner. Include two walls and part of the floor.'],
    ['light', ar ? 'استغل ضوء النهار' : 'Use natural daylight', ar ? 'افتح الستائر وأنوّر الإضاءة. خلّي الشباك جنبك بدل ما تصوّر في وش ضوء قوي، وراجع إن الصورة واضحة.' : 'Open the curtains and switch on the lights. Keep the window beside you rather than shooting into bright light, and check the result.']
  ];
  return <details className="provider-photo-guide" open>
    <summary>{ar ? 'دليل تصوير العقار — صور واضحة تساعد العميل يختار' : 'Property photo guide — help customers see the space'}</summary>
    <div className="provider-photo-guide__grid">{items.map(([key, title, text]) => <figure key={key}>
      <img src={`/assets/guides/property-${key}.svg`} alt={title} width={360} height={200} />
      <figcaption><strong>{title}</strong><p>{text}</p></figcaption>
    </figure>)}</div>
    <p className="provider-photo-guide__coverage">{ar ? 'ابدأ بصورة واضحة للواجهة أو أكبر غرفة، وبعدها صوّر كل غرفة والمطبخ والحمام وأي بلكونة. رتّب المكان وراجع الصور قبل رفعها؛ اختار أفضل صورة كغلاف.' : 'Start with the exterior or largest room, then photograph each room, kitchen, bathroom and any balcony. Tidy the space and check the photos before uploading. Choose your strongest photo as the cover.'}</p>
  </details>;
}
