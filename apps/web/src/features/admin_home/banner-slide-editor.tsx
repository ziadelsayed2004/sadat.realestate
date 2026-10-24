import type { LocalizedText, SupportedLocale } from '@sadat-real-estate/contracts';
import type { BannerImageSelection } from './banner-gallery.tsx';

export interface BannerSlideDraft { title?: LocalizedText | undefined; body?: LocalizedText | undefined; targetUrl?: string | undefined }
export type BannerSlideDrafts = Record<string, BannerSlideDraft>;
const fileKeys = new WeakMap<File, string>();
let nextFileKey = 0;
export const bannerFileKey = (file: File) => {
  const existing = fileKeys.get(file);
  if (existing) return existing;
  const key = `file:${++nextFileKey}`;
  fileKeys.set(file, key);
  return key;
};

export function BannerSlideEditor({ locale, images, files, drafts, disabled, onChange }: {
  locale: SupportedLocale; images: BannerImageSelection[]; files: File[]; drafts: BannerSlideDrafts;
  disabled: boolean; onChange: (drafts: BannerSlideDrafts) => void;
}) {
  const ar = locale === 'ar';
  const entries = [...images.map(image => ({ key: image.id, name: '' })), ...files.map(file => ({ key: bannerFileKey(file), name: file.name }))];
  if (!entries.length) return null;
  return <fieldset className="admin-home__slide-copy" disabled={disabled}>
    <legend>{ar ? 'نص ورابط كل صورة' : 'Text and link for each image'}</legend>
    <p>{ar ? 'كل صورة لها إعداد مستقل. الخانة الفارغة تستخدم عنوان البانر ووصفه ورابطه المكتوبين أعلاه. يمكنك إبقاء بانرات المنصة وإضافة إعلان منفصل لكل شركة.' : 'Each image has independent settings. Empty fields use the banner title, description and link above. Keep platform banners and add a separate advertisement for each company.'}</p>
    {entries.map((entry, index) => {
      const draft = drafts[entry.key] ?? {};
      const update = (next: BannerSlideDraft) => onChange({ ...drafts, [entry.key]: { ...draft, ...next } });
      return <details key={entry.key} open={entries.length === 1 || undefined}>
        <summary>{ar ? 'الصورة' : 'Image'} {index + 1} {entry.name}</summary>
        {(['title', 'body'] as const).map(field => <div className="admin-home__form-grid" key={field}>{(['ar', 'en'] as const).map(language => <label key={language}>
          {field === 'title' ? ar ? 'عنوان الصورة' : 'Image title' : ar ? 'وصف الصورة' : 'Image description'} — {language === 'ar' ? 'العربية' : 'English'}
          <input dir={language === 'ar' ? 'rtl' : 'ltr'} value={draft[field]?.[language] ?? ''} onChange={event => update({ [field]: { ...draft[field], [language]: event.target.value } })} />
        </label>)}</div>)}
        <label>{ar ? 'رابط الانتقال لهذه الصورة (اختياري)' : 'Destination for this image (optional)'}<input type="url" dir="ltr" placeholder="https://" value={draft.targetUrl ?? ''} onChange={event => update({ targetUrl: event.target.value })} /></label>
      </details>;
    })}
  </fieldset>;
}
