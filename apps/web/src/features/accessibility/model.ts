import {
  LOCALE_DIRECTIONS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TextDirection
} from '@sadat-real-estate/contracts';
import { DESIGN_TOKENS } from '../design_system/tokens.ts';

export const ACCESSIBILITY_LOCALES = Object.freeze([...SUPPORTED_LOCALES]) as readonly SupportedLocale[];

export const ACCESSIBILITY_DIRECTIONS = Object.freeze({ ...LOCALE_DIRECTIONS }) as Readonly<Record<SupportedLocale, TextDirection>>;

export type AccessibilitySurface = 'public' | 'auth' | 'seeker' | 'provider' | 'admin';
export type ApprovedDeviceScope = 'desktop' | 'desktop/tablet/mobile';

export const APPROVED_DEVICE_SCOPES: Readonly<Record<AccessibilitySurface, ApprovedDeviceScope>> = Object.freeze({
  public: 'desktop/tablet/mobile',
  auth: 'desktop/tablet/mobile',
  seeker: 'desktop',
  provider: 'desktop',
  admin: 'desktop'
});

export const ACCESSIBILITY_CONTRACT = Object.freeze({
  minimumTargetSize: '2.5rem',
  focusOutline: '3px solid var(--color-brand-secondary)',
  focusOffset: '3px',
  reducedMotion: 'prefers-reduced-motion',
  highContrast: 'prefers-contrast'
});

export interface AccessibilityCopy {
  readonly skipToContent: string;
}

const accessibilityCopy: Readonly<Record<SupportedLocale, AccessibilityCopy>> = {
  ar: { skipToContent: '\u062a\u062e\u0637\u064a \u0625\u0644\u0649 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0631\u0626\u064a\u0633\u064a' },
  en: { skipToContent: 'Skip to main content' },
  'zh-CN': { skipToContent: '\u8df3\u8f6c\u5230\u4e3b\u8981\u5185\u5bb9' }
};

export function getAccessibilityCopy(locale: SupportedLocale): AccessibilityCopy {
  return accessibilityCopy[locale];
}

export interface ContrastPair {
  readonly name: string;
  readonly foreground: string;
  readonly background: string;
  readonly minimumRatio: number;
}

export const ACCESSIBLE_CONTRAST_PAIRS: readonly ContrastPair[] = Object.freeze([
  {
    name: 'body text on surface',
    foreground: DESIGN_TOKENS.color.textStrong,
    background: DESIGN_TOKENS.color.surface,
    minimumRatio: 4.5
  },
  {
    name: 'primary action label',
    foreground: DESIGN_TOKENS.color.onBrand,
    background: DESIGN_TOKENS.color.brandPrimary,
    minimumRatio: 4.5
  },
  {
    name: 'secondary action label',
    foreground: DESIGN_TOKENS.color.onBrand,
    background: DESIGN_TOKENS.color.brandSecondary,
    minimumRatio: 4.5
  },
  {
    name: 'accent action label',
    foreground: DESIGN_TOKENS.color.brandSecondary,
    background: DESIGN_TOKENS.color.brandAccent,
    minimumRatio: 4.5
  },
  {
    name: 'info action label',
    foreground: DESIGN_TOKENS.color.brandSecondary,
    background: DESIGN_TOKENS.color.info,
    minimumRatio: 4.5
  }
]);

function parseHexColor(value: string): readonly [number, number, number] {
  if (!/^#[0-9a-f]{6}$/iu.test(value)) throw new RangeError(`Unsupported color value: ${value}`);
  return [0, 2, 4].map(offset => Number.parseInt(value.slice(offset + 1, offset + 3), 16) / 255) as [number, number, number];
}

function relativeLuminance(value: string): number {
  const [red, green, blue] = parseHexColor(value)
    .map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

export function meetsContrast(pair: ContrastPair): boolean {
  return contrastRatio(pair.foreground, pair.background) >= pair.minimumRatio;
}
