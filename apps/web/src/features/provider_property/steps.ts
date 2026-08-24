import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { getProviderPropertyCompletionCopy } from './completion-copy.ts';
import { getProviderPropertyCopy } from './copy.ts';
import { getProviderPropertyAdvancedCopy } from './steps-copy.ts';

export const PROVIDER_PROPERTY_RAIL_STEPS = [
  'basic',
  'location',
  'details',
  'price-payment',
  'features-services',
  'media',
  'contact',
  'review'
] as const;

export type ProviderPropertyRailStep = typeof PROVIDER_PROPERTY_RAIL_STEPS[number];

export function getProviderPropertyRailLabels(locale: SupportedLocale): Readonly<Record<ProviderPropertyRailStep, string>> {
  const basic = getProviderPropertyCopy(locale);
  const advanced = getProviderPropertyAdvancedCopy(locale);
  const completion = getProviderPropertyCompletionCopy(locale);
  return {
    basic: basic.wizard.steps.basic,
    location: basic.wizard.steps.location,
    details: advanced.steps.details,
    'price-payment': advanced.steps['price-payment'],
    'features-services': advanced.steps['features-services'],
    media: completion.steps.media,
    contact: completion.steps.contact,
    review: completion.steps.review
  };
}
