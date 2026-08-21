import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../src/features/contracts/index.ts';
import type { AuthSnapshot } from '../src/features/auth/index.ts';
import { AuthPage, type AuthFlowClient } from '../src/features/auth/pages.tsx';
import { getAuthCopy } from '../src/features/auth/copy.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const authenticatedSnapshot: AuthSnapshot = {
  status: 'authenticated',
  user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', roleType: 'seeker', status: 'verified' },
  availableActions: []
};

const challenge = {
  accepted: true as const,
  challengeId: '00000000-0000-4000-8000-000000000001',
  expiresInSeconds: 300,
  retryAfterSeconds: 30
};

function createClient(overrides: Partial<AuthFlowClient> = {}): AuthFlowClient {
  return {
    loginAdmin: vi.fn().mockResolvedValue(authenticatedSnapshot),
    sendOtp: vi.fn().mockResolvedValue(challenge),
    verifyOtp: vi.fn().mockResolvedValue({ outcome: 'verified', verificationToken: 'A'.repeat(43), expiresInSeconds: 600, roleType: 'seeker' }),
    registerSeeker: vi.fn().mockResolvedValue(authenticatedSnapshot),
    ...overrides
  };
}

describe('login and OTP screens', () => {
  it.each(['ar', 'en', 'zh-CN'] as const)('renders the login surface with the supported direction for %s', (locale) => {
    const result = renderWithLocale(
      <AuthPage url="/auth/login" locale={locale} client={createClient()} onAuthenticated={vi.fn()} />,
      { locale }
    );
    const copy = getAuthCopy(locale);

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.loginTitle, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(copy.identifierLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.passwordLabel)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('link', { name: copy.phoneLoginAction })).toHaveAttribute('href', '/auth/verify-phone?purpose=login&roleType=seeker');
  });

  it('validates login input, calls the implemented login contract, and never renders the access token', async () => {
    const client = createClient();
    const onAuthenticated = vi.fn();
    const copy = getAuthCopy('en');
    renderWithLocale(<AuthPage url="/auth/login" locale="en" client={client} onAuthenticated={onAuthenticated} />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: copy.loginAction }));
    expect(screen.getByRole('alert')).toHaveTextContent(copy.invalidFormTitle);
    expect(client.loginAdmin).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(copy.identifierLabel), { target: { value: ' ADMIN@EXAMPLE.COM ' } });
    fireEvent.change(screen.getByLabelText(copy.passwordLabel), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: copy.loginAction }));

    await waitFor(() => expect(client.loginAdmin).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'secret' }));
    expect(onAuthenticated).toHaveBeenCalledWith(authenticatedSnapshot);
    expect(document.body.textContent).not.toContain('header.payload.signature');
  });

  it('sends OTP through the real contract, applies the server cooldown, and verifies six digits', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ outcome: 'authenticated', snapshot: authenticatedSnapshot });
    const client = createClient({ verifyOtp });
    const copy = getAuthCopy('en');
    renderWithLocale(
      <AuthPage url="/auth/verify-phone?purpose=login&roleType=seeker" locale="en" client={client} onAuthenticated={vi.fn()} />,
      { locale: 'en' }
    );

    fireEvent.change(screen.getByLabelText(copy.phoneLabel), { target: { value: '+20 100 000 0000' } });
    fireEvent.click(screen.getByRole('button', { name: copy.sendCodeAction }));
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.otpTitle, level: 1 })).toBeInTheDocument());
    expect(client.sendOtp).toHaveBeenCalledWith({ phone: '+201000000000', roleType: 'seeker', purpose: 'login' });

    const resendButton = screen.getByRole('button', { name: copy.resendIn(30) });
    expect(resendButton).toBeDisabled();
    const digits = Array.from({ length: 6 }, (_, position) => screen.getByLabelText(copy.codeDigitLabel(position + 1)));
    digits.forEach((input, position) => fireEvent.change(input, { target: { value: String(position + 1) } }));
    fireEvent.click(screen.getByRole('button', { name: copy.verifyAction }));

    await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith({
      phone: '+201000000000',
      roleType: 'seeker',
      purpose: 'login',
      challengeId: challenge.challengeId,
      code: '123456'
    }));
    expect(screen.getByRole('status')).toHaveTextContent(copy.loginSuccessTitle);
    expect(document.body.textContent).not.toContain('verificationToken');
  });

  it('maps rate-limit and network failures to safe retry states', async () => {
    const rateLimited = new ApiClientError('rate limited', {
      code: 'HTTP_ERROR',
      status: 429,
      apiError: {
        code: 'OTP_SEND_RATE_LIMITED',
        messageKey: 'errors.auth.otpSendRateLimited',
        details: [],
        requestId: 'auth-ui-rate-limit'
      }
    });
    const sendOtp = vi.fn().mockRejectedValue(rateLimited);
    const client = createClient({ sendOtp });
    const copy = getAuthCopy('en');
    renderWithLocale(<AuthPage url="/auth/verify-phone" locale="en" client={client} onAuthenticated={vi.fn()} />, { locale: 'en' });

    fireEvent.change(screen.getByLabelText(copy.phoneLabel), { target: { value: '+201000000000' } });
    fireEvent.click(screen.getByRole('button', { name: copy.sendCodeAction }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(copy.otpRateLimitedTitle));
    expect(screen.getByText(copy.otpRateLimitedBody)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('OTP_SEND_RATE_LIMITED');
  });

  it('keeps a direct verification route in the safe phone-entry state until a challenge exists', () => {
    const copy = getAuthCopy('zh-CN');
    renderWithLocale(<AuthPage url="/auth/verify-phone" locale="zh-CN" client={createClient()} onAuthenticated={vi.fn()} />, { locale: 'zh-CN' });

    expect(screen.getByRole('heading', { name: copy.phoneTitle, level: 1 })).toBeInTheDocument();
    expect(screen.queryByLabelText(copy.codeDigitLabel(1))).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.loginAction })).toHaveAttribute('href', '/auth/login');
  });
});
