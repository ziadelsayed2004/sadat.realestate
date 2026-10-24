import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function CarouselArrow({ next, locale }: { next?: boolean; locale: SupportedLocale }) {
  const pointsRight = next ? locale !== 'ar' : locale === 'ar';
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={pointsRight ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7'} /></svg>;
}

/** Retain the outgoing photograph briefly; preloaded incoming images fade over it. */
export function useOutgoingSlide(key: string) {
  const [transition, setTransition] = useState({ current: key, previous: '' });
  if (transition.current !== key) setTransition({ current: key, previous: transition.current });
  useEffect(() => {
    if (!transition.previous) return;
    const timer = window.setTimeout(() => setTransition(value => ({ ...value, previous: '' })), 650);
    return () => window.clearTimeout(timer);
  }, [transition.current, transition.previous]);
  return transition.previous;
}
