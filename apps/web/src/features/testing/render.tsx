import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { applyLocaleToDocument, directionForLocale } from '../localization/runtime.ts';

export interface RenderWithLocaleOptions extends Omit<RenderOptions, 'queries'> {
  readonly locale?: SupportedLocale;
}

export type RenderWithLocaleResult = RenderResult & {
  readonly locale: SupportedLocale;
  readonly direction: ReturnType<typeof directionForLocale>;
};

export function renderWithLocale(
  ui: ReactElement,
  options: RenderWithLocaleOptions = {}
): RenderWithLocaleResult {
  const { locale = 'ar', ...renderOptions } = options;
  applyLocaleToDocument(locale);
  const result = render(ui, renderOptions);
  return Object.assign(result, {
    locale,
    direction: directionForLocale(locale)
  });
}
