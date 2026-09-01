import {
  LOCALE_DIRECTIONS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TextDirection
} from '@sadat-real-estate/contracts';

export const TEST_LOCALES = [...SUPPORTED_LOCALES] as const;
export type TestLocale = typeof TEST_LOCALES[number];

export const TEST_DEVICE_PRESETS = Object.freeze({
  desktop: 'Desktop Chrome',
  tablet: 'Galaxy Tab S4',
  mobile: 'Pixel 5'
} as const);

export type TestDeviceScope = keyof typeof TEST_DEVICE_PRESETS;

export const TEST_DEVICE_SCOPES = Object.freeze([
  'desktop',
  'tablet',
  'mobile'
] as const satisfies readonly TestDeviceScope[]);

export interface TestMatrixEntry {
  readonly name: string;
  readonly locale: TestLocale;
  readonly direction: TextDirection;
  readonly device: TestDeviceScope;
  readonly preset: typeof TEST_DEVICE_PRESETS[TestDeviceScope];
}

export const TEST_MATRIX: readonly TestMatrixEntry[] = Object.freeze(
  TEST_DEVICE_SCOPES.flatMap((device) => TEST_LOCALES.map((locale) => ({
    name: `${device}-${locale}`,
    locale,
    direction: LOCALE_DIRECTIONS[locale],
    device,
    preset: TEST_DEVICE_PRESETS[device]
  })))
);

export function directionForTestLocale(locale: SupportedLocale): TextDirection {
  return LOCALE_DIRECTIONS[locale];
}

export function urlForTestLocale(pathname: string, locale: TestLocale): string {
  const url = new URL(pathname, 'http://sadat-real-estate.test');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}`;
}
