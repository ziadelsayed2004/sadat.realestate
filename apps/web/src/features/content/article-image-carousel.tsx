import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import './article-image-carousel.css';

export interface ArticleGalleryImage { readonly src: string; readonly key: string }
function usableSource(src: string, preview: boolean) {
  if (preview && src.startsWith('blob:')) return src;
  if (/^\/(?!\/)[^\s]*$/u.test(src) || /^https?:\/\/[^\s]+$/iu.test(src)) return src;
  return undefined;
}

/** Additional article images only. The cover is rendered separately by the caller. */
export function ArticleImageCarousel({ images, title, locale, preview = false }: { images: readonly ArticleGalleryImage[]; title: string; locale: SupportedLocale; preview?: boolean }) {
  const ar = locale === 'ar', trackId = useId(), track = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [position, setPosition] = useState({ index: 0, start: true, end: images.length < 2 });
  const photos = useMemo(() => {
    const seen = new Set<string>();
    return images.flatMap(item => { const src = usableSource(item.src.trim(), preview); if (!src || seen.has(src) || failed.has(src)) return []; seen.add(src); return [{ ...item, src }]; }).slice(0, 12);
  }, [images, failed, preview]);
  const rejectImage = (src: string) => setFailed(previous => previous.has(src) ? previous : new Set([...previous, src]));
  const updatePosition = useCallback(() => {
    const element = track.current;
    if (!element || element.clientWidth === 0) return;
    const frame = element.getBoundingClientRect(), cards = Array.from(element.children, child => child.getBoundingClientRect());
    const first = cards[0], last = cards.at(-1);
    if (!first || !last) return;
    const distances = cards.map(card => Math.abs(ar ? card.right - frame.right : card.left - frame.left));
    const next = { index: distances.indexOf(Math.min(...distances)), start: ar ? first.right <= frame.right + 2 : first.left >= frame.left - 2, end: ar ? last.left >= frame.left - 2 : last.right <= frame.right + 2 };
    setPosition(previous => previous.index === next.index && previous.start === next.start && previous.end === next.end ? previous : next);
  }, [ar]);
  useEffect(() => {
    const element = track.current;
    // An SSR image can fail before hydration attaches its error listener.
    element?.querySelectorAll('img').forEach(image => { if (image.complete && image.currentSrc && image.naturalWidth === 0) rejectImage(image.getAttribute('src')!); });
    updatePosition();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updatePosition);
    if (element) observer?.observe(element);
    window.addEventListener('resize', updatePosition);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updatePosition); };
  }, [photos, updatePosition]);
  const goTo = (index: number) => {
    const element = track.current, card = element?.children[Math.max(0, Math.min(photos.length - 1, index))];
    if (!element || !card) return;
    const frame = element.getBoundingClientRect(), target = card.getBoundingClientRect();
    element.scrollBy({ left: ar ? target.right - frame.right : target.left - frame.left, behavior: 'auto' });
  };
  const navigable = photos.length > 1 && !(position.start && position.end);
  return <section className="article-image-carousel" aria-label={ar ? 'صور المقال' : 'Article images'} aria-roledescription={ar ? 'كاروسيل صور' : 'carousel'} dir={ar ? 'rtl' : 'ltr'} tabIndex={photos.length > 1 ? 0 : undefined} onKeyDown={event => {
    const delta = event.key === 'ArrowLeft' ? (ar ? 1 : -1) : event.key === 'ArrowRight' ? (ar ? -1 : 1) : undefined;
    if (delta !== undefined) { event.preventDefault(); goTo(position.index + delta); }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); goTo(event.key === 'Home' ? 0 : photos.length - 1); }
  }}>
    <div className="article-image-carousel__heading"><div><h3>{ar ? 'صور المقال' : 'Article images'}</h3><span aria-live="polite">{ar ? `${photos.length} صور إضافية` : `${photos.length} additional images`}</span></div>{navigable ? <div className="article-image-carousel__buttons"><button type="button" disabled={position.start} onClick={() => goTo(position.index - 1)} aria-controls={trackId} aria-label={ar ? 'الصورة السابقة' : 'Previous image'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button><button type="button" disabled={position.end} onClick={() => goTo(position.index + 1)} aria-controls={trackId} aria-label={ar ? 'الصورة التالية' : 'Next image'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button></div> : null}</div>
    {photos.length ? <div ref={track} id={trackId} className="article-image-carousel__track" onScroll={updatePosition}>{photos.map((item, index) => <figure className="article-image-carousel__card" key={item.src}><img src={item.src} alt={ar ? `${title} — صورة ${index + 1}` : `${title} — image ${index + 1}`} loading="lazy" decoding="async" onError={() => rejectImage(item.src)} /></figure>)}</div> : <div className="article-image-carousel__empty" role="status"><p>{ar ? 'صور المقال غير متاحة حاليًا' : 'Article images are currently unavailable'}</p><small>{ar ? 'تقدر تكمل قراءة المقال.' : 'You can continue reading the article.'}</small></div>}
    {photos.length > 0 && failed.size > 0 ? <p className="article-image-carousel__notice" role="status">{ar ? 'تم تجاوز الصور غير المتاحة؛ باقي المقال متاح للقراءة.' : 'Unavailable images were skipped. The rest of the article is still available.'}</p> : null}
  </section>;
}
