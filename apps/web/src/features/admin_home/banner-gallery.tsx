import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';

export interface BannerImageSelection { id: string; url?: string | undefined }

export function BannerGallery({ locale, images, files, disabled, onChange, onFilesChange }: {
  locale: SupportedLocale;
  images: BannerImageSelection[];
  files: File[];
  disabled: boolean;
  onChange: (images: BannerImageSelection[]) => void;
  onFilesChange: (files: File[]) => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  function move(index: number, direction: number) {
    const next = [...images];
    [next[index], next[index + direction]] = [next[index + direction]!, next[index]!];
    onChange(next);
  }
  return <div className="admin-home__banner-gallery" aria-label={locale === 'ar' ? 'صور الإعلان بالترتيب' : 'Advertisement images in order'}>
    {images.map((item, index) => <div key={item.id} className="admin-home__banner-slide" data-testid="banner-saved-image">
      {item.url ? <img src={item.url} alt={`${locale === 'ar' ? 'صورة' : 'Image'} ${index + 1}`} /> : null}
      <span>{locale === 'ar' ? 'صورة' : 'Image'} {index + 1}</span>
      <div className="admin-home__inline-actions">
        <Button type="button" size="sm" variant="secondary" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label={`${locale === 'ar' ? 'تقديم الصورة' : 'Move image earlier'} ${index + 1}`}>↑</Button>
        <Button type="button" size="sm" variant="secondary" disabled={disabled || index === images.length - 1} onClick={() => move(index, 1)} aria-label={`${locale === 'ar' ? 'تأخير الصورة' : 'Move image later'} ${index + 1}`}>↓</Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(images.filter(image => image.id !== item.id))}>{locale === 'ar' ? 'إزالة' : 'Remove'}</Button>
      </div>
    </div>)}
    {files.map((file, index) => <div key={`${file.name}_${index}`} className="admin-home__banner-slide" data-testid="banner-pending-image">
      {previews[index] ? <img src={previews[index]} alt="" /> : null}
      <span>{file.name}</span><small>{locale === 'ar' ? 'ستُضاف عند الحفظ' : 'Added when saved'}</small>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onFilesChange(files.filter((_, position) => position !== index))}>{locale === 'ar' ? 'إزالة' : 'Remove'}</Button>
    </div>)}
  </div>;
}
