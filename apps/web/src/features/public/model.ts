import type {
  LocalizedText,
  PropertyArea,
  PropertyLayout,
  PropertyMoney,
  PublicHomepageData,
  PublicHomepageProperty,
  SupportedLocale
} from '@sadat-real-estate/contracts';

export function localizedText(text: LocalizedText | undefined, locale: SupportedLocale): string | undefined {
  if (text === undefined) return undefined;

  const candidates: readonly SupportedLocale[] = [locale, 'ar', 'en', 'zh-CN'];
  for (const candidate of candidates) {
    const value = text[candidate];
    if (value !== undefined && value.trim().length > 0) return value;
  }
  return undefined;
}

export function ordered<T extends { readonly order: number }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.order - right.order);
}

export function isHomepageEmpty(data: PublicHomepageData): boolean {
  return data.sections.length === 0
    && data.properties.length === 0
    && data.developers.length === 0
    && data.content.length === 0
    && data.banners.length === 0;
}

export function formatMoney(value: PropertyMoney | undefined, locale: SupportedLocale): string | undefined {
  if (value === undefined) return undefined;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: value.currency,
      maximumFractionDigits: 0
    }).format(value.amount);
  } catch {
    return String(value.amount) + ' ' + value.currency;
  }
}

export function formatArea(value: PropertyArea | undefined, locale: SupportedLocale, unitLabel: string): string | undefined {
  if (value === undefined) return undefined;
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value.value);
  return formatted + ' ' + unitLabel;
}

export function propertyFeatures(
  property: PublicHomepageProperty,
  locale: SupportedLocale,
  labels: { readonly area: string; readonly bedrooms: string; readonly bathrooms: string; readonly floor: string; readonly sqm: string }
): Array<{ readonly label: string; readonly value: string }> {
  const features: Array<{ readonly label: string; readonly value: string }> = [];
  const area = formatArea(property.area, locale, labels.sqm);
  if (area !== undefined) features.push({ label: labels.area, value: area });

  const layout: PropertyLayout | undefined = property.layout;
  if (layout?.bedrooms !== undefined) {
    features.push({ label: labels.bedrooms, value: String(layout.bedrooms) });
  }
  if (layout?.bathrooms !== undefined) {
    features.push({ label: labels.bathrooms, value: String(layout.bathrooms) });
  }
  if (layout?.floor !== undefined) {
    features.push({ label: labels.floor, value: String(layout.floor) });
  }
  return features;
}

