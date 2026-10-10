import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { getEditableCopyCatalog } from '../localization/copy-catalog.ts';

type UserGuideCopy = Readonly<Record<'title' | 'eyebrow' | 'description' | 'language' | 'quickActions' | 'quickHelp' | 'readSteps' | 'openScreen' | 'accountType' | 'audienceNote' | 'download' | 'search' | 'placeholder' | 'category' | 'all' | 'toc' | 'openAll' | 'closeAll' | 'maximize' | 'restore' | 'minimize' | 'expand' | 'print' | 'clear' | 'empty' | 'emptyHelp' | 'count' | 'before' | 'steps' | 'fields' | 'result' | 'faq' | 'links' | 'limitation' | 'share' | 'copied' | 'copyFailed' | 'tabNote' | 'permission' | 'textSize' | 'normal' | 'large' | 'minimized' | 'resume' | 'top', string>>;

export function getUserGuideCopy(locale: SupportedLocale): UserGuideCopy {
  return getEditableCopyCatalog(locale)['admin_user_guide/copy#getUserGuideCopy'] as unknown as UserGuideCopy;
}
