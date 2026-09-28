import type { SupportedLocale } from '@sadat-real-estate/contracts';

/** Shared SSR and hydration state: never show dashboard scaffolding before authentication. */
export function SessionLoading({ locale }: { readonly locale: SupportedLocale }) {
  return (
    <main className="session-loading" id="main-content" data-auth-resolution="pending" aria-busy="true" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <img src="/assets/sadat-real-estate-logo.svg" width="160" height="140" alt="" />
      <p role="status" aria-live="polite">{locale === 'ar' ? 'جارٍ تجهيز حسابك…' : 'Preparing your account…'}</p>
      <span className="session-loading__progress" aria-hidden="true" />
    </main>
  );
}
