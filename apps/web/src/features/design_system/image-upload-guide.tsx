import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import './image-upload-guide.css';

export type ImageRatioKind = 'property' | 'logo' | 'cover' | 'project' | 'article' | 'portrait' | 'banner' | 'featured';
const ratios: Record<ImageRatioKind, readonly [number, number]> = {
  property: [3, 2], logo: [1, 1], cover: [16, 9], project: [16, 9], article: [16, 9], portrait: [1, 1], banner: [3, 1], featured: [3, 2]
};
export function imageRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}
export function matchesImageRatio(width: number, height: number, kind: ImageRatioKind): boolean {
  const [x, y] = ratios[kind];
  return width > 0 && height > 0 && Math.abs(width / height / (x / y) - 1) <= .02;
}
function readSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    const clear = () => { URL.revokeObjectURL(url); img.onload = null; img.onerror = null; };
    img.onload = () => { const size = { width: img.naturalWidth, height: img.naturalHeight }; clear(); resolve(size); };
    img.onerror = () => { clear(); reject(new Error('Image dimensions unavailable')); };
    img.src = url;
  });
}

/** Presentation advice only; existing upload validation and original files are unchanged. */
export function ImageUploadGuide({ kind, locale, children }: { kind: ImageRatioKind; locale: SupportedLocale; children: ReactNode }) {
  const ar = locale === 'ar', id = useId(), generation = useRef(0), container = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<Array<{ name: string; width?: number; height?: number; ready?: boolean }>>([]);
  useEffect(() => () => { generation.current += 1; }, []);
  useEffect(() => {
    container.current?.querySelectorAll('input[type="file"]').forEach(input => {
      const ids = new Set((input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)); ids.add(id);
      input.setAttribute('aria-describedby', [...ids].join(' '));
    });
  }, [id]);
  const ratio = ratios[kind].join(':');
  const full = kind === 'logo';
  const responsive = kind === 'cover' || kind === 'banner' || kind === 'featured';
  async function inspect(selected: File[]) {
    const current = ++generation.current;
    const images = selected.filter(file => file.type.startsWith('image/')).slice(0, 20);
    setFiles(images.map(file => ({ name: file.name })));
    const results = await Promise.all(images.map(async file => ({ name: file.name, ready: true, ...await readSize(file).catch(() => ({})) })));
    if (generation.current === current) setFiles(results);
  }
  return <div ref={container} className="image-upload-guide" data-image-ratio={ratio} onChangeCapture={event => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
      void inspect(Array.from(event.target.files ?? []));
    }
  }}>
    <aside className="image-upload-guide__hint" id={id}>
      <span className="image-upload-guide__shape" style={{ aspectRatio: ratios[kind].join(' / ') }} aria-hidden="true">{ratio}</span>
      <div><strong>{ar ? 'نسبة الصورة المقترحة (العرض : الارتفاع)' : 'Suggested image shape (width : height)'}: <bdi dir="ltr">{ratio}</bdi></strong>
        <p>{ar ? 'دي نسبة أبعاد، مش دقة أو مقاس بكسل مطلوب. جهّز الصورة بالنسبة دي قبل رفعها من الموبايل أو الكمبيوتر.' : 'This is an aspect ratio, not a required resolution or pixel size. Prepare this shape before uploading from phone or computer.'}</p>
        <p>{full ? ar ? 'الصورة تظهر كاملة؛ اختلاف النسبة قد يترك هوامش. استخدم صورة مربعة لتفاديها.' : 'The complete image is retained; other shapes may leave space. Use a square to avoid it.' : ar ? 'لو النسبة مختلفة، ملء الإطار يكبّر الصورة ويقصّ الأطراف الزائدة من غير تشويه. الملف الأصلي لا يتغير.' : 'A different shape is enlarged proportionally and cropped at the edges when filling the frame. The original file stays unchanged.'}</p>
        {kind === 'project' ? <p>{ar ? 'كارت المشروع يعرض الصورة بنسبتها الأصلية. صفحة التفاصيل تتبع اختيار «عرض كامل» أو «ملء الإطار».' : 'Project cards retain the original shape; project details follow the full-image or fill-frame choice.'}</p> : null}
        {responsive ? <p>{ar ? 'إطار الغلاف والإعلان يتغير حسب الشاشة؛ قد يحصل قص حتى مع النسبة المقترحة. خلّي الشعار والمعلومة المهمة في المنتصف وراجع معاينة الهاتف والكمبيوتر. البانر يستخدم نفس الصورة للشاشتين.' : 'Cover/ad frames change with screen size, so cropping can still occur. Keep key content centered and check phone/desktop previews. Banners reuse the same image on both screens.'}</p> : null}
      </div>
    </aside>
    {children}
    {files.length ? <ul className="image-upload-guide__results" aria-live="polite">{files.map((file, index) => <li key={`${file.name}-${index}`} data-match={file.width && file.height ? matchesImageRatio(file.width, file.height, kind) : undefined}>
      <bdi>{file.name}</bdi>{file.width && file.height ? <> — <bdi dir="ltr">{imageRatio(file.width, file.height)}</bdi> · {matchesImageRatio(file.width, file.height, kind) ? ar ? 'النسبة مناسبة.' : 'Matching shape.' : full ? ar ? 'نسبة مختلفة؛ قد تظهر هوامش.' : 'Different shape; space may remain.' : ar ? 'نسبة مختلفة؛ ملء الإطار سيقصّ الأطراف. يمكنك اختيار صورة أخرى.' : 'Different shape; filling the frame crops edges. You can choose another image.'}</> : <> — {file.ready ? ar ? 'تعذّر قراءة نسبة الصورة؛ تحقق من الملف.' : 'Could not read the image shape; check the file.' : ar ? 'جارٍ قراءة نسبة الصورة…' : 'Reading image shape…'}</>}
    </li>)}</ul> : null}
  </div>;
}
