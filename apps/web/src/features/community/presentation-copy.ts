import type { SupportedLocale } from '@sadat-real-estate/contracts';
import ar from '../localization/messages/ar.json' with { type: 'json' };
import en from '../localization/messages/en.json' with { type: 'json' };

const messages = { ar, en };

export function getCommunityPresentationCopy(locale: SupportedLocale) {
  return messages[locale]['community/presentation-copy#getCommunityPresentationCopy'];
}
