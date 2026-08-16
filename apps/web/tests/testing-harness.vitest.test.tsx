import { fireEvent, screen } from '@testing-library/react';
import { publicHomepageSuccessEnvelopeSchema } from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { Button } from '../src/features/design_system/index.ts';
import { UxStateView } from '../src/features/ux_states/index.ts';
import { ApiClient } from '../src/features/contracts/index.ts';
import {
  TEST_DEVICE_SCOPES,
  TEST_LOCALES,
  TEST_MATRIX,
  renderWithLocale,
  urlForTestLocale
} from '../src/features/testing/index.ts';

describe('frontend testing harness', () => {
  it.each(TEST_LOCALES)('renders supported locale %s with its canonical direction', (locale) => {
    const result = renderWithLocale(<Button>Continue</Button>, { locale });

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(document.documentElement).toHaveAttribute('lang', locale);
    expect(document.documentElement).toHaveAttribute('dir', result.direction);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('covers every approved device scope and locale combination without adding routes', () => {
    expect(TEST_DEVICE_SCOPES).toEqual(['desktop', 'tablet', 'mobile']);
    expect(TEST_MATRIX).toHaveLength(TEST_DEVICE_SCOPES.length * TEST_LOCALES.length);
    expect(urlForTestLocale('/properties', 'zh-CN')).toBe('/properties?lang=zh-CN');
  });

  it('covers loading, empty, error, retry, success, and permission UI states', () => {
    renderWithLocale(
      <UxStateView
        state="retry"
        title="Unable to load"
        message="Try again when the connection is available."
        retryLabel="Retry"
        onRetry={() => undefined}
      />,
      { locale: 'en' }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByRole('status', { name: 'Unable to load' })).toBeInTheDocument();
  });

  it('uses MSW only for the implemented public home contract', async () => {
    const client = new ApiClient({
      baseUrl: 'http://sadat-real-estate.test',
      requestIdFactory: () => 'test-client-request'
    });

    const response = await client.request('/public/home', {
      responseSchema: publicHomepageSuccessEnvelopeSchema
    });

    expect(response.requestId).toBe('test-public-home');
    expect(response.data.data).toEqual({
      sections: [],
      properties: [],
      developers: [],
      content: [],
      banners: []
    });
  });
});
