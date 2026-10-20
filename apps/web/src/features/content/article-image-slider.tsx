import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import './article-image-slider.css';

export interface ArticleSlide { readonly src: string; readonly key: string }
function usableSource(src: string, preview: boolean) {
  if (preview && src.startsWith('blob:')) return src;
  if (/^\/(?!\/)[^\s]*$/u.test(src) || /^https?:\/\/[^\s]+$/iu.test(src)) return src;
  return undefined;
}

export function ArticleImageSlider({ images, title, locale, preview = false }: { images: readonly ArticleSlide[]; title: string; locale: SupportedLocale; preview?: boolean }) {
  const ar = locale === 'ar', [index, setIndex] = useState(0), [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const image = useRef<HTMLImageElement>(null), touch = useRef<{ x: number; y: number } | undefined>(undefined);
  const slides = useMemo(() => {
    const seen = new Set<string>();
    return images.flatMap(item => { const src = usableSource(item.src.trim(), preview); if (!src || seen.has(src) || failed.has(src)) return []; seen.add(src); return [{ ...item, src }]; }).slice(0, 13);
  }, [images, failed, preview]);
  const offset = Math.min(index, Math.max(0, slides.length - 1)), active = slides[offset], multiple = slides.length > 1;
  const rejectImage = (src: string) => setFailed(previous => previous.has(src) ? previous : new Set([...previous, src]));
  useEffect(() => {
    const element = image.current;
    // An SSR image may have failed before hydration attached its error listener.
    if (active && element?.complete && element.currentSrc && element.naturalWidth === 0) rejectImage(active.src);
  }, [active]);
  const move = (delta: number) => setIndex(Math.max(0, Math.min(slides.length - 1, offset + delta)));
  return <section className="article-image-slider" aria-label={ar ? 'صور المقال' : 'Article images'} aria-roledescription={ar ? 'عارض صور' : 'carousel'} dir={ar ? 'rtl' : 'ltr'} tabIndex={multiple ? 0 : undefined} onKeyDown={event => {
    const delta = event.key === 'ArrowLeft' ? (ar ? 1 : -1) : event.key === 'ArrowRight' ? (ar ? -1 : 1) : undefined;
    if (delta !== undefined) { event.preventDefault(); move(delta); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setIndex(event.key === 'Home' ? 0 : Math.max(0, slides.length - 1)); }
  }}>
    <div className="article-image-slider__frame" onTouchStart={event => { const point = event.touches[0]; touch.current = event.touches.length === 1 && point ? { x: point.clientX, y: point.clientY } : undefined; }} onTouchEnd={event => {
      const start = touch.current, end = event.changedTouches[0]; touch.current = undefined;
      if (!start || !end) return;
      const dx = end.clientX - start.x, dy = end.clientY - start.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? (ar ? 1 : -1) : (ar ? -1 : 1));
    }}>
      {active ? <img key={active.src} ref={image} src={active.src} alt={title} decoding="async" onError={() => rejectImage(active.src)} /> : <div className="article-image-slider__empty" role="status"><span aria-hidden="true">▧</span><p>{ar ? 'صور المقال غير متاحة حاليًا' : 'Article images are currently unavailable'}</p><small>{ar ? 'تقدر تكمل قراءة المقال بالأسفل.' : 'You can continue reading the article below.'}</small></div>}
      {multiple ? <><button className="article-image-slider__previous" type="button" disabled={offset === 0} onClick={() => move(-1)} aria-label={ar ? 'الصورة السابقة' : 'Previous image'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button><button className="article-image-slider__next" type="button" disabled={offset === slides.length - 1} onClick={() => move(1)} aria-label={ar ? 'الصورة التالية' : 'Next image'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button></> : null}
    </div>
    {multiple ? <div className="article-image-slider__controls"><span aria-live="polite" aria-atomic="true">{ar ? `الصورة ${offset + 1} من ${slides.length}` : `Image ${offset + 1} of ${slides.length}`}</span><div className="article-image-slider__dots">{slides.map((item, i) => <button key={item.key} type="button" aria-label={ar ? `عرض الصورة ${i + 1}` : `Show image ${i + 1}`} aria-current={i === offset ? 'true' : undefined} onClick={() => setIndex(i)} />)}</div></div> : null}
    {active && failed.size > 0 ? <p className="article-image-slider__notice" role="status">{ar ? 'تم تجاوز الصور غير المتاحة؛ باقي المقال متاح للقراءة.' : 'Unavailable images were skipped. The rest of the article is still available.'}</p> : null}
  </section>;
}
