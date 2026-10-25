import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function ImageFitField({ locale, value, onChange, disabled }: { locale: SupportedLocale; value: 'cover' | 'contain'; onChange: (value: 'cover' | 'contain') => void; disabled?: boolean }) {
  const ar = locale === 'ar';
  return <label>{ar ? 'طريقة عرض الصورة' : 'Image display'}
    <select value={value} disabled={disabled} onChange={event => onChange(event.target.value as 'cover' | 'contain')}>
      <option value="contain">{ar ? 'الصورة كاملة مع مسافات عند اختلاف الأبعاد' : 'Full image with space when proportions differ'}</option>
      <option value="cover">{ar ? 'ملء الإطار مع قص الأطراف عند الحاجة' : 'Fill the frame, cropping edges when necessary'}</option>
    </select>
    <small>{ar ? 'اختيارك يُحفظ مع الصورة ويظهر في الصفحة والكروت. لا يتم تمديد الصورة أو تشويهها.' : 'Saved with the image and applied to its page and cards. Images are never stretched.'}</small>
  </label>;
}
