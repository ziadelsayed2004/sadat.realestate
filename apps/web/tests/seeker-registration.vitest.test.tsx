import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../src/features/contracts/index.ts';
import type { AuthSnapshot } from '../src/features/auth/index.ts';
import { AuthPage, type AuthFlowClient } from '../src/features/auth/pages.tsx';
import { getAuthCopy } from '../src/features/auth/copy.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const registrationToken = 'A'.repeat(43);
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
    verifyOtp: vi.fn().mockResolvedValue({
      outcome: 'verified',
      verificationToken: registrationToken,
      expiresInSeconds: 600,
      roleType: 'seeker'
    }),
    registerSeeker: vi.fn().mockResolvedValue(authenticatedSnapshot),
    ...overrides
  };
}

async function completeEmailVerification(copy: ReturnType<typeof getAuthCopy>): Promise<void> {
  fireEvent.change(screen.getByLabelText(copy.identifierLabel), { target: { value: 'seeker@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: copy.sendCodeAction }));
  await waitFor(() => expect(screen.getByRole('heading', { name: copy.otpTitle, level: 1 })).toBeInTheDocument());

  Array.from({ length: 6 }, (_, position) => screen.getByLabelText(copy.codeDigitLabel(position + 1)))
    .forEach((input, position) => fireEvent.change(input, { target: { value: String(position + 1) } }));
  fireEvent.click(screen.getByRole('button', { name: copy.verifyAction }));
  await waitFor(() => expect(screen.getByRole('heading', { name: copy.registrationFormTitle, level: 1 })).toBeInTheDocument());
}

describe('seeker registration screens', () => {
  it.each(['ar', 'en', 'zh-CN'] as const)('renders account selection with the supported direction for %s', (locale) => {
    const result = renderWithLocale(
      <AuthPage url="/auth/register" locale={locale} client={createClient()} onAuthenticated={vi.fn()} />,
      { locale }
    );
    const copy = getAuthCopy(locale);

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(screen.getByRole('heading', { name: copy.accountSelectionTitle, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(copy.seekerAccountTitle) })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: copy.continueAction })).toBeDisabled();
    expect(screen.getByRole('link', { name: new RegExp(copy.providerAccountTitle) })).toHaveAttribute('href', '/auth/register/provider/type');
  });

  it('uses the verified authority in memory, submits the strict seeker request, and gates success on the API result', async () => {
    const registerSeeker = vi.fn().mockResolvedValue(authenticatedSnapshot);
    const client = createClient({ registerSeeker });
    const copy = getAuthCopy('en');
    renderWithLocale(<AuthPage url="/auth/register" locale="en" client={client} onAuthenticated={vi.fn()} />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(copy.seekerAccountTitle) }));
    fireEvent.click(screen.getByRole('button', { name: copy.continueAction }));
    await completeEmailVerification(copy);

    expect(window.location.pathname).toBe('/auth/register/seeker');
    expect(window.location.search).toBe('');
    expect(document.body.textContent).not.toContain(registrationToken);
    expect(document.body.textContent).not.toContain('verificationToken');

    fireEvent.change(screen.getByLabelText(copy.firstNameLabel), { target: { value: 'Mona' } });
    fireEvent.change(screen.getByLabelText(copy.lastNameLabel), { target: { value: 'Hassan' } });
    fireEvent.click(screen.getByRole('button', { name: copy.registerAction }));

    await waitFor(() => expect(registerSeeker).toHaveBeenCalledWith({
      verificationToken: registrationToken,
      firstName: 'Mona',
      lastName: 'Hassan',
      locale: 'en'
    }));
    expect(await screen.findByRole('heading', { name: copy.registrationSuccessTitle, level: 1 })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/auth/register/seeker/success');
    expect(document.body.textContent).not.toContain(registrationToken);
  });

  it('rejects incomplete form data before calling the registration contract', async () => {
    const registerSeeker = vi.fn().mockResolvedValue(authenticatedSnapshot);
    const client = createClient({ registerSeeker });
    const copy = getAuthCopy('en');
    renderWithLocale(<AuthPage url="/auth/register" locale="en" client={client} onAuthenticated={vi.fn()} />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(copy.seekerAccountTitle) }));
    fireEvent.click(screen.getByRole('button', { name: copy.continueAction }));
    await completeEmailVerification(copy);
    fireEvent.click(screen.getByRole('button', { name: copy.registerAction }));

    expect(screen.getByRole('alert')).toHaveTextContent(copy.invalidFormTitle);
    expect(registerSeeker).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: copy.registrationSuccessTitle, level: 1 })).not.toBeInTheDocument();
  });

  it('maps duplicate registration to a safe recoverable state without exposing server details', async () => {
    const duplicate = new ApiClientError('duplicate', {
      code: 'HTTP_ERROR',
      status: 409,
      apiError: {
        code: 'SEEKER_ALREADY_EXISTS',
        messageKey: 'errors.seeker.alreadyExists',
        details: [],
        requestId: 'seeker-registration-duplicate'
      }
    });
    const client = createClient({ registerSeeker: vi.fn().mockRejectedValue(duplicate) });
    const copy = getAuthCopy('en');
    renderWithLocale(<AuthPage url="/auth/register" locale="en" client={client} onAuthenticated={vi.fn()} />, { locale: 'en' });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(copy.seekerAccountTitle) }));
    fireEvent.click(screen.getByRole('button', { name: copy.continueAction }));
    await completeEmailVerification(copy);
    fireEvent.change(screen.getByLabelText(copy.firstNameLabel), { target: { value: 'Mona' } });
    fireEvent.change(screen.getByLabelText(copy.lastNameLabel), { target: { value: 'Hassan' } });
    fireEvent.click(screen.getByRole('button', { name: copy.registerAction }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(copy.duplicateRegistrationTitle));
    expect(screen.getByText(copy.duplicateRegistrationBody)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('SEEKER_ALREADY_EXISTS');
    expect(document.body.textContent).not.toContain('seeker-registration-duplicate');
  });

  it('fails closed on a direct success deep link and offers a restart instead of a fake success', () => {
    const copy = getAuthCopy('zh-CN');
    renderWithLocale(
      <AuthPage url="/auth/register/seeker/success" locale="zh-CN" client={createClient()} onAuthenticated={vi.fn()} />,
      { locale: 'zh-CN' }
    );

    expect(screen.getByRole('heading', { name: copy.accountSelectionTitle, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.registrationUnavailableTitle);
    expect(screen.queryByRole('button', { name: copy.registrationNextAction })).not.toBeInTheDocument();
    expect(screen.queryByText(copy.registrationSuccessTitle)).not.toBeInTheDocument();
  });
});
