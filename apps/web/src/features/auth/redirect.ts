import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function authCompletionHref(url: string | undefined, role: string | undefined, locale: SupportedLocale): string {
  const location = new URL(url ?? '/auth/login', 'https://example.invalid');
  if (location.pathname.startsWith('/auth/register') || location.searchParams.get('purpose') === 'registration') return `/?lang=${locale}`;
  const returnTo = location.searchParams.get('returnTo');
  if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) return returnTo;
  const home = role === 'admin' ? '/admin' : role === 'provider' ? '/provider' : '/seeker';
  return `${home}?lang=${locale}`;
}
