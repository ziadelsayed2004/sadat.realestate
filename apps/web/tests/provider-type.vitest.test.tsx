import { fireEvent, screen, waitFor } from '@testing-library/react';
import { PROVIDER_TYPES } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { AuthPage, type AuthFlowClient } from '../src/features/auth/pages.tsx';
import { getProviderTypeCopy } from '../src/features/provider_auth/copy.ts';
import { ProviderTypePage, providerAccountPath } from '../src/features/provider_auth/pages.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

function createAuthClient(): AuthFlowClient {
  return {
    loginAdmin: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    registerSeeker: vi.fn(),
    dispose: vi.fn()
  };
}

describe('provider type selection', () => {
  it.each(['ar', 'en',] as const)('renders all contract types in the correct direction for %s', (locale) => {
    const copy = getProviderTypeCopy(locale);
    const result = renderWithLocale(
      <ProviderTypePage url={`/auth/register/provider/type?lang=${encodeURIComponent(locale)}`} locale={locale} />,
      { locale }
    );

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('provider-type-selection')).toHaveAttribute('data-screen-id', 'AUTH-07');
    expect(screen.getByRole('button', { name: copy.continueAction })).toBeDisabled();
    for (const providerType of PROVIDER_TYPES) {
      expect(screen.getByRole('button', { name: new RegExp(copy.options[providerType].title) })).toBeInTheDocument();
    }
  });

  it('selects a contract provider type, validates its password, and hands off the registration inputs', () => {
    const onContinue = vi.fn();
    const copy = getProviderTypeCopy('en');
    renderWithLocale(
      <ProviderTypePage url="/auth/register/provider/type?lang=en" locale="en" onContinue={onContinue} />,
      { locale: 'en' }
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(copy.options.developer_company.title) }));
    expect(screen.getByTestId('provider-type-selection')).toHaveAttribute('data-screen-id', 'AUTH-08');
    expect(screen.getByRole('button', { name: new RegExp(copy.options.developer_company.title) })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Provider1!' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Provider1!' } });
    expect(screen.getByRole('button', { name: copy.continueAction })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: copy.continueAction }));
    expect(onContinue).toHaveBeenCalledWith(
      'developer_company',
      '/auth/register/provider/account?providerType=developer_company&lang=en',
      'Provider1!'
    );
    expect(document.body.textContent).not.toContain('verificationToken');
    expect(document.body.textContent).not.toContain('accessToken');
  });

  it('accepts a valid non-sensitive query handoff and rejects unsupported provider types', async () => {
    const copy = getProviderTypeCopy('en');
    const { rerender } = renderWithLocale(
      <ProviderTypePage url="/auth/register/provider/type?providerType=brokerage_office" locale="en" />,
      { locale: 'en' }
    );
    expect(screen.getByTestId('provider-type-selection')).toHaveAttribute('data-screen-id', 'AUTH-08');
    expect(screen.getByRole('button', { name: new RegExp(copy.options.brokerage_office.title) })).toHaveAttribute('aria-pressed', 'true');

    rerender(<ProviderTypePage url="/auth/register/provider/type?providerType=unsupported" locale="en" />);
    await waitFor(() => expect(screen.getByTestId('provider-type-selection')).toHaveAttribute('data-screen-id', 'AUTH-07'));
    expect(screen.getByRole('button', { name: copy.continueAction })).toBeDisabled();
    expect(providerAccountPath('/auth/register/provider/type?lang=en', 'individual_broker')).toBe('/auth/register/provider/account?providerType=individual_broker&lang=en');
  });

  it('is connected to the existing auth route without exposing the unavailable fallback', () => {
    const copy = getProviderTypeCopy('en');
    renderWithLocale(
      <AuthPage url="/auth/register/provider/type?lang=en" locale="en" client={createAuthClient()} onAuthenticated={vi.fn()} />,
      { locale: 'en' }
    );

    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/route is unavailable|المسار غير متاح|路径不可用/iu)).not.toBeInTheDocument();
  });
});
