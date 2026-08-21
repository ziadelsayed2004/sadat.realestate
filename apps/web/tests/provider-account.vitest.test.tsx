import { fireEvent, screen, waitFor } from '@testing-library/react';
import type {
  ProviderApplicationData,
  ProviderRegistrationData
} from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { AuthPage, type AuthFlowClient } from '../src/features/auth/pages.tsx';
import { getAuthCopy } from '../src/features/auth/copy.ts';
import { getProviderAccountCopy } from '../src/features/provider_auth/account-copy.ts';
import { ProviderAccountPage } from '../src/features/provider_auth/account.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const verificationToken = 'V'.repeat(43);
const applicationId = 'a'.repeat(24);
const session = {
  accessToken: 'header.payload.signature',
  tokenType: 'Bearer' as const,
  expiresInSeconds: 900,
  user: { id: 'b'.repeat(24), roleType: 'provider' as const, status: 'draft' as const }
};

function application(overrides: Partial<ProviderApplicationData> = {}): ProviderApplicationData {
  return {
    id: applicationId,
    providerType: 'developer_company',
    status: 'draft',
    version: 0,
    phone: '+201000000000',
    requirementVersion: '2026-08-13.1',
    missingFields: ['accountOwnerFullName', 'displayName', 'email', 'primaryLocationId', 'serviceAreaIds', 'preferredLocale', 'termsAcceptedAt', 'privacyAcceptedAt'],
    missingDocuments: [],
    availableActions: ['edit_account', 'edit_company', 'submit', 'view_status'],
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides
  };
}

function registration(app: ProviderApplicationData = application()): ProviderRegistrationData {
  return { outcome: 'registered_draft', session, application: app };
}

function createAuthClient(overrides: Partial<AuthFlowClient> = {}): AuthFlowClient {
  return {
    loginAdmin: vi.fn(),
    sendOtp: vi.fn().mockResolvedValue({
      accepted: true,
      challengeId: '00000000-0000-4000-8000-000000000001',
      expiresInSeconds: 300,
      retryAfterSeconds: 1
    }),
    verifyOtp: vi.fn().mockResolvedValue({
      outcome: 'verified',
      verificationToken,
      expiresInSeconds: 600,
      roleType: 'provider'
    }),
    registerSeeker: vi.fn(),
    registerProvider: vi.fn().mockResolvedValue(registration()),
    getProviderApplication: vi.fn().mockResolvedValue(application()),
    updateProviderAccount: vi.fn().mockResolvedValue(application({ version: 1, accountOwnerFullName: 'Mona Hassan', displayName: 'Mona Properties', email: 'mona@example.com', preferredLocale: 'en', termsAcceptedAt: '2026-08-13T00:00:00.000Z', privacyAcceptedAt: '2026-08-13T00:00:00.000Z' })),
    refresh: vi.fn(),
    ...overrides
  };
}

describe('provider account details', () => {
  it.each(['ar', 'en', 'zh-CN'] as const)('renders the API-backed account form with the correct direction for %s', async (locale) => {
    const copy = getProviderAccountCopy(locale);
    const getProviderApplication = vi.fn().mockResolvedValue(application());
    renderWithLocale(
      <ProviderAccountPage
        client={{ getProviderApplication }}
        locale={locale}
        providerType="developer_company"
        onBack={vi.fn()}
      />,
      { locale }
    );

    expect(screen.getByTestId('provider-account-details')).toHaveAttribute('data-state', 'loading');
    await waitFor(() => expect(screen.getByTestId('provider-account-details')).toHaveAttribute('data-screen-id', 'AUTH-09'));
    expect(getProviderApplication).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(copy.phoneLabel)).toHaveValue('+201000000000');
    expect(screen.getByLabelText(copy.accountOwnerFullNameLabel)).toBeInTheDocument();
    expect(screen.queryByLabelText(/password|كلمة المرور|密码/iu)).not.toBeInTheDocument();
  });

  it('validates the supported fields and sends only the strict versioned account patch', async () => {
    const copy = getProviderAccountCopy('en');
    const getProviderApplication = vi.fn().mockResolvedValue(application());
    const updateProviderAccount = vi.fn().mockResolvedValue(application({
      version: 1,
      accountOwnerFullName: 'Mona Hassan',
      displayName: 'Mona Properties',
      email: 'mona@example.com',
      whatsappNumber: '+201000000000',
      preferredLocale: 'en',
      termsAcceptedAt: '2026-08-13T00:00:00.000Z',
      privacyAcceptedAt: '2026-08-13T00:00:00.000Z'
    }));
    renderWithLocale(
      <ProviderAccountPage
        client={{ getProviderApplication, updateProviderAccount }}
        locale="en"
        providerType="developer_company"
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(copy.accountOwnerFullNameLabel), { target: { value: 'Mona Hassan' } });
    fireEvent.change(screen.getByLabelText(copy.displayNameLabel), { target: { value: 'Mona Properties' } });
    fireEvent.change(screen.getByLabelText(copy.emailLabel), { target: { value: 'Mona@Example.com' } });
    fireEvent.click(screen.getByLabelText(copy.samePhoneLabel));
    fireEvent.change(screen.getByLabelText(copy.preferredLocaleLabel), { target: { value: 'en' } });
    fireEvent.click(screen.getByLabelText(copy.termsLabel));
    fireEvent.click(screen.getByLabelText(copy.privacyLabel));
    fireEvent.click(screen.getByRole('button', { name: copy.saveDraftAction }));

    await waitFor(() => expect(updateProviderAccount).toHaveBeenCalledTimes(1));
    const [patch] = updateProviderAccount.mock.calls[0] as [Record<string, unknown>];
    expect(patch).toMatchObject({
      version: 0,
      accountOwnerFullName: 'Mona Hassan',
      displayName: 'Mona Properties',
      email: 'mona@example.com',
      whatsappNumber: '+201000000000',
      preferredLocale: 'en'
    });
    expect(patch.termsAcceptedAt).toEqual(expect.any(String));
    expect(patch.privacyAcceptedAt).toEqual(expect.any(String));
    expect(Object.keys(patch)).not.toContain('password');
    expect(Object.keys(patch)).not.toContain('verificationToken');
    await waitFor(() => expect(screen.getByTestId('provider-account-details')).toHaveAttribute('data-screen-id', 'AUTH-09+'));
    expect(screen.getByText(copy.savedTitle)).toBeInTheDocument();
  });

  it('fails closed on a direct account route without a provider session', async () => {
    const copy = getProviderAccountCopy('zh-CN');
    const getProviderApplication = vi.fn().mockRejectedValue({ status: 401 });
    const onBack = vi.fn();
    renderWithLocale(
      <ProviderAccountPage client={{ getProviderApplication }} locale="zh-CN" providerType="individual_broker" onBack={onBack} />,
      { locale: 'zh-CN' }
    );

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(copy.permissionTitle));
    expect(screen.queryByLabelText(copy.emailLabel)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.backAction }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the verified provider grant in memory while creating and resuming the draft', async () => {
    const client = createAuthClient();
    const authCopy = getAuthCopy('en');
    renderWithLocale(
      <AuthPage url="/auth/register/provider/type?lang=en" locale="en" client={client} onAuthenticated={vi.fn()} />,
      { locale: 'en' }
    );

    fireEvent.click(screen.getByRole('button', { name: /developer company/iu }));
    fireEvent.click(screen.getByRole('button', { name: authCopy.continueAction }));
    await waitFor(() => expect(screen.getByRole('heading', { name: authCopy.phoneTitle, level: 1 })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(authCopy.phoneLabel), { target: { value: '+20 100 000 0000' } });
    fireEvent.click(screen.getByRole('button', { name: authCopy.sendCodeAction }));
    await waitFor(() => expect(screen.getByRole('heading', { name: authCopy.otpTitle, level: 1 })).toBeInTheDocument());
    Array.from({ length: 6 }, (_, position) => screen.getByLabelText(authCopy.codeDigitLabel(position + 1)))
      .forEach((input, position) => fireEvent.change(input, { target: { value: String(position + 1) } }));
    fireEvent.click(screen.getByRole('button', { name: authCopy.verifyAction }));

    await waitFor(() => expect(client.registerProvider).toHaveBeenCalledWith({
      verificationToken,
      providerType: 'developer_company'
    }));
    await waitFor(() => expect(screen.getByTestId('provider-account-details')).toBeInTheDocument());
    expect(client.getProviderApplication).toHaveBeenCalled();
    expect(window.location.pathname).toBe('/auth/register/provider/account');
    expect(window.location.search).not.toContain('verificationToken');
    expect(document.body.textContent).not.toContain(verificationToken);
    expect(document.body.textContent).not.toContain('accessToken');
  });
});
