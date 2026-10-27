import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { WhatsAppIcon } from './contact.tsx';
import './floating-actions.css';

export function PublicFloatingActions({ locale, whatsapp }: { readonly locale: SupportedLocale; readonly whatsapp?: string | undefined }) {
  const [scroll, setScroll] = useState({ progress: 0, visible: false });
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const position = Math.max(0, window.scrollY);
      const range = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      setScroll({ progress: range > 0 ? Math.min(100, position / range * 100) : 0, visible: position > 180 });
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    observer?.observe(document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, []);
  const top = locale === 'ar' ? 'العودة لأعلى الصفحة' : 'Back to top';
  const contact = locale === 'ar' ? 'تواصل عبر واتساب' : 'Contact on WhatsApp';
  return <div className="public-floating-actions">
    {whatsapp ? <a className="public-floating-actions__whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={contact} title={contact}><WhatsAppIcon /></a> : null}
    <button className="public-floating-actions__top" type="button" hidden={!scroll.visible} aria-label={top} title={top} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}>
      <svg className="public-floating-actions__progress" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
        <circle className="public-floating-actions__track" cx="28" cy="28" r="24" />
        <circle className="public-floating-actions__value" cx="28" cy="28" r="24" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - scroll.progress} />
      </svg>
      <svg className="public-floating-actions__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5m-7 7 7-7 7 7" /></svg>
    </button>
  </div>;
}
