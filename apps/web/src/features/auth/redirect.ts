import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function authCompletionHref(_url: string | undefined, _role: string | undefined, locale: SupportedLocale): string {
  // Every account starts on the public homepage. A stale login returnTo must
  // not turn a private page (such as viewings) into the site's landing page.
  return `/?lang=${locale}`;
}
