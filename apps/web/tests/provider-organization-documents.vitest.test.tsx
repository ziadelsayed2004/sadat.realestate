import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ProviderApplicationData, ProviderDocumentData, ProviderRequirementSnapshot } from '@sadat-real-estate/contracts';
import { describe, expect, it, vi } from 'vitest';
import { AuthPage, type AuthFlowClient } from '../src/features/auth/pages.tsx';
import { AuthClient } from '../src/features/auth/client.ts';
import { getProviderAccountCopy } from '../src/features/provider_auth/account-copy.ts';
import { getProviderDocumentsCopy } from '../src/features/provider_auth/documents-copy.ts';
import { ProviderDocumentsPage, validateFile } from '../src/features/provider_auth/documents.tsx';
import { getProviderOrganizationCopy } from '../src/features/provider_auth/organization-copy.ts';
import { ProviderOrganizationPage } from '../src/features/provider_auth/organization.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const applicationId = 'a'.repeat(24);
const documentId = 'c'.repeat(24);

function requirements(providerType: ProviderApplicationData['providerType']): ProviderRequirementSnapshot['requirements'] {
  return [
    { key: 'commercial_registration', labelKey: 'provider.documents.commercialRegistration', classification: 'required', applies: true },
    { key: 'tax_card', labelKey: 'provider.documents.taxCard', classification: 'required', applies: true },
    { key: 'authorized_representative_id_front', labelKey: 'provider.documents.authorizedRepresentativeIdFront', classification: 'required', applies: true },
    { key: 'authorized_representative_id_back', labelKey: 'provider.documents.authorizedRepresentativeIdBack', classification: 'required', applies: true },
    ...(providerType === 'developer_company' ? [{ key: 'developer_license', labelKey: 'provider.documents.developerLicense', classification: 'optional', applies: true } as const] : [])
  ];
}

function application(
  providerType: ProviderApplicationData['providerType'],
  overrides: Partial<ProviderApplicationData> = {}
): ProviderApplicationData {
  return {
    id: applicationId,
    providerType,
    status: 'draft',
    version: 0,
    email: 'provider@example.com',
    requirementVersion: '2026-08-13.1',
    requirementsSnapshot: {
      version: '2026-08-13.1',
      providerType,
      requirements: requirements(providerType)
    },
    missingFields: [
      ...(providerType === 'brokerage_office' ? ['legalBusinessName', 'tradeName', 'businessAddress'] : ['legalCompanyName', 'brandName', 'headOfficeAddress']),
      'commercialRegistrationNumber',
      'taxRegistrationNumber',
      'authorizedRepresentativeFullName',
      'authorizedRepresentativeTitle',
      'accountOwnerHasRegisteredAuthority'
    ],
    missingDocuments: ['commercial_registration', 'tax_card', 'authorized_representative_id_front', 'authorized_representative_id_back'],
    availableActions: providerType === 'brokerage_office'
      ? ['edit_account', 'edit_business', 'submit', 'view_status']
      : ['edit_account', 'edit_company', 'submit', 'view_status'],
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides
  };
}

function documentData(category: ProviderDocumentData['category']): ProviderDocumentData {
  return {
    id: documentId,
    applicationId,
    category,
    requirementVersion: '2026-08-13.1',
    originalFilename: 'commercial-registration.pdf',
    normalizedExtension: '.pdf',
    detectedMime: 'application/pdf',
    byteSize: 1_024,
    sha256: 'd'.repeat(64),
    version: 1,
    securityState: 'scan_pending',
    reviewState: 'pending_review',
    uploadedAt: '2026-08-13T00:00:00.000Z',
    active: true,
    idempotentReplay: false
  };
}

describe('provider organization details', () => {
  it('advances the authenticated provider flow from account to organization to documents', async () => {
    const accountCopy = getProviderAccountCopy('en');
    const initial = application('brokerage_office');
    const accountUpdated = application('brokerage_office', {
      accountOwnerFullName: 'Mona Hassan',
      displayName: 'Nile Homes',
      email: 'mona@example.com',
      preferredLocale: 'en',
      termsAcceptedAt: '2026-08-13T00:00:00.000Z',
      privacyAcceptedAt: '2026-08-13T00:00:00.000Z',
      missingFields: ['legalBusinessName', 'tradeName', 'businessAddress']
    });
    const organizationUpdated = application('brokerage_office', {
      ...accountUpdated,
      version: 2,
      legalBusinessName: 'Nile Brokerage',
      tradeName: 'Nile Homes',
      businessAddress: 'Cairo',
      missingFields: [],
      requirementsSnapshot: {
        version: '2026-08-13.1',
        providerType: 'brokerage_office',
        requirements: requirements('brokerage_office')
      }
    });
    const getProviderApplication = vi.fn()
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce(accountUpdated)
      .mockResolvedValueOnce(organizationUpdated);
    const client: AuthFlowClient = {
      loginAdmin: vi.fn(),
      sendOtp: vi.fn(),
      verifyOtp: vi.fn(),
      registerSeeker: vi.fn(),
      getProviderApplication,
      updateProviderAccount: vi.fn().mockResolvedValue(accountUpdated),
      updateProviderBusiness: vi.fn().mockResolvedValue(organizationUpdated)
    };
    renderWithLocale(<AuthPage url="/auth/register/provider/account?providerType=brokerage_office&lang=en" locale="en" client={client} onAuthenticated={vi.fn()} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByRole('heading', { name: accountCopy.title, level: 1 })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(accountCopy.accountOwnerFullNameLabel), { target: { value: 'Mona Hassan' } });
    fireEvent.change(screen.getByLabelText(accountCopy.displayNameLabel), { target: { value: 'Nile Homes' } });
    fireEvent.change(screen.getByLabelText(accountCopy.emailLabel), { target: { value: 'mona@example.com' } });
    fireEvent.click(screen.getByLabelText(accountCopy.termsLabel));
    fireEvent.click(screen.getByLabelText(accountCopy.privacyLabel));
    fireEvent.click(screen.getByRole('button', { name: accountCopy.saveContinueAction }));
    const organizationCopy = getProviderOrganizationCopy('en');
    await waitFor(() => expect(screen.getByRole('heading', { name: organizationCopy.businessTitle, level: 1 })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(organizationCopy.legalBusinessNameLabel), { target: { value: 'Nile Brokerage' } });
    fireEvent.click(screen.getByRole('button', { name: organizationCopy.saveContinueAction }));
    const documentsCopy = getProviderDocumentsCopy('en');
    await waitFor(() => expect(screen.getByTestId('provider-documents')).toHaveAttribute('data-state', 'ready'));
    expect(screen.getByRole('heading', { name: documentsCopy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(documentsCopy.requirementsTitle)).toBeInTheDocument();
  });

  it.each(['ar', 'en',] as const)('renders the business variant in the supported direction for %s', async (locale) => {
    const copy = getProviderOrganizationCopy(locale);
    renderWithLocale(
      <ProviderOrganizationPage
        client={{ getProviderApplication: vi.fn().mockResolvedValue(application('brokerage_office')) }}
        locale={locale}
        providerType="brokerage_office"
        onBack={vi.fn()}
      />,
      { locale }
    );

    await waitFor(() => expect(screen.getByTestId('provider-organization-details')).toHaveAttribute('data-screen-id', 'AUTH-10'));
    expect(screen.getByRole('heading', { name: copy.businessTitle, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(copy.legalBusinessNameLabel)).toBeInTheDocument();
    expect(screen.queryByLabelText(/service area|property type/iu)).not.toBeInTheDocument();
  });

  it('sends only supported business fields and continues after a valid save', async () => {
    const initial = application('brokerage_office');
    const updateProviderBusiness = vi.fn().mockResolvedValue(application('brokerage_office', {
      version: 1,
      legalBusinessName: 'Nile Brokerage',
      tradeName: 'Nile Homes',
      businessAddress: 'Cairo',
      commercialRegistrationNumber: 'CR-11',
      taxRegistrationNumber: 'TAX-22',
      authorizedRepresentativeFullName: 'Mona Hassan',
      authorizedRepresentativeTitle: 'Managing Director',
      accountOwnerHasRegisteredAuthority: true,
      missingFields: []
    }));
    const onContinue = vi.fn();
    const copy = getProviderOrganizationCopy('en');
    renderWithLocale(
      <ProviderOrganizationPage
        client={{ getProviderApplication: vi.fn().mockResolvedValue(initial), updateProviderBusiness }}
        locale="en"
        providerType="brokerage_office"
        onBack={vi.fn()}
        onContinue={onContinue}
      />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.businessTitle, level: 1 })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(copy.legalBusinessNameLabel), { target: { value: 'Nile Brokerage' } });
    fireEvent.change(screen.getByLabelText(copy.tradeNameLabel), { target: { value: 'Nile Homes' } });
    fireEvent.change(screen.getByLabelText(copy.addressLabel), { target: { value: 'Cairo' } });
    fireEvent.change(screen.getByLabelText(copy.commercialRegistrationNumberLabel), { target: { value: 'CR-11' } });
    fireEvent.change(screen.getByLabelText(copy.taxRegistrationNumberLabel), { target: { value: 'TAX-22' } });
    fireEvent.change(screen.getByLabelText(copy.authorizedRepresentativeFullNameLabel), { target: { value: 'Mona Hassan' } });
    fireEvent.change(screen.getByLabelText(copy.authorizedRepresentativeTitleLabel), { target: { value: 'Managing Director' } });
    fireEvent.change(screen.getByLabelText(copy.authorityLabel), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: copy.saveContinueAction }));

    await waitFor(() => expect(updateProviderBusiness).toHaveBeenCalledTimes(1));
    expect(updateProviderBusiness).toHaveBeenCalledWith({
      version: 0,
      legalBusinessName: 'Nile Brokerage',
      tradeName: 'Nile Homes',
      businessAddress: 'Cairo',
      commercialRegistrationNumber: 'CR-11',
      taxRegistrationNumber: 'TAX-22',
      authorizedRepresentativeFullName: 'Mona Hassan',
      authorizedRepresentativeTitle: 'Managing Director',
      accountOwnerHasRegisteredAuthority: true
    });
    expect(updateProviderBusiness.mock.calls[0]?.[0]).not.toHaveProperty('serviceAreaIds');
    expect(updateProviderBusiness.mock.calls[0]?.[0]).not.toHaveProperty('propertyTypes');
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }));
    expect(screen.getByTestId('provider-organization-details')).toHaveAttribute('data-screen-id', 'AUTH-10+');
  });

  it('renders the developer company variant and rejects an empty strict patch', async () => {
    const copy = getProviderOrganizationCopy('en');
    const updateProviderCompany = vi.fn();
    renderWithLocale(
      <ProviderOrganizationPage
        client={{ getProviderApplication: vi.fn().mockResolvedValue(application('developer_company')), updateProviderCompany }}
        locale="en"
        providerType="developer_company"
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: copy.companyTitle, level: 1 })).toBeInTheDocument());
    expect(screen.getByTestId('provider-organization-details')).toHaveAttribute('data-screen-id', 'AUTH-11');
    fireEvent.click(screen.getByRole('button', { name: copy.saveDraftAction }));
    expect(updateProviderCompany).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(copy.invalidFormTitle);
  });
});

describe('provider private documents', () => {
  it('rejects unsafe filenames and MIME-extension mismatches before upload', () => {
    const copy = getProviderDocumentsCopy('en');
    expect(validateFile(new File(['pdf'], '../private.pdf', { type: 'application/pdf' }), copy)?.state).toBe('error');
    expect(validateFile(new File(['jpeg'], 'identity.pdf', { type: 'image/jpeg' }), copy)?.state).toBe('error');
    expect(validateFile(new File(['png'], 'identity.png', { type: 'image/png' }), copy)).toBeUndefined();
  });

  it('maps the strict provider patch and raw document methods to implemented API routes', async () => {
    const apiClient = { request: vi.fn().mockImplementation(async (path: string) => ({
      data: {
        data: path.includes('/documents/') && path.endsWith(documentId)
          ? { documentId, deleted: true }
          : path.endsWith('/documents')
            ? documentData('commercial_registration')
            : application('developer_company'),
        meta: { requestId: 'provider-client-test' }
      },
      requestId: 'provider-client-test',
      status: 200,
      headers: new Headers()
    })) };
    const client = new AuthClient({ apiClient });
    await client.updateProviderBusiness({ version: 0, legalBusinessName: 'Nile Brokerage' });
    await client.updateProviderCompany({ version: 0, legalCompanyName: 'Nile Developments' });
    const file = new File([new Uint8Array([37, 80, 68, 70])], 'registration.pdf', { type: 'application/pdf' });
    await client.uploadProviderDocument('commercial_registration', file);
    await client.deleteProviderDocument(documentId);

    expect(apiClient.request).toHaveBeenNthCalledWith(1, '/provider/application/business', expect.objectContaining({ method: 'PATCH', json: { version: 0, legalBusinessName: 'Nile Brokerage' } }));
    expect(apiClient.request).toHaveBeenNthCalledWith(2, '/provider/application/company', expect.objectContaining({ method: 'PATCH', json: { version: 0, legalCompanyName: 'Nile Developments' } }));
    const uploadOptions = apiClient.request.mock.calls[2]?.[1] as { body?: unknown; headers?: Record<string, string> };
    expect(uploadOptions.body).toBe(file);
    expect(uploadOptions.headers).toMatchObject({ 'content-type': 'application/pdf', 'x-document-category': 'commercial_registration', 'x-file-name': 'registration.pdf' });
    expect(apiClient.request).toHaveBeenNthCalledWith(4, `/provider/application/documents/${documentId}`, expect.objectContaining({ method: 'DELETE' }));
  });

  it('uploads an allowed raw file, renders server states, and deletes without exposing private URLs', async () => {
    const copy = getProviderDocumentsCopy('en');
    const uploadProviderDocument = vi.fn().mockResolvedValue(documentData('commercial_registration'));
    const deleteProviderDocument = vi.fn().mockResolvedValue({ documentId, deleted: true as const });
    renderWithLocale(
      <ProviderDocumentsPage
        client={{
          getProviderApplication: vi.fn().mockResolvedValue(application('developer_company')),
          uploadProviderDocument,
          deleteProviderDocument
        }}
        locale="en"
        providerType="developer_company"
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByTestId('provider-documents')).toHaveAttribute('data-state', 'ready'));

    const file = new File([new Uint8Array([37, 80, 68, 70])], 'commercial-registration.pdf', { type: 'application/pdf' });
    const label = `${copy.chooseFileAction}: ${copy.categoryLabels.commercial_registration}`;
    fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });

    await waitFor(() => expect(uploadProviderDocument).toHaveBeenCalledWith('commercial_registration', file));
    expect(await screen.findByText('commercial-registration.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('provider-document-file-commercial_registration')).toHaveTextContent(copy.securityPendingLabel);
    expect(document.body.textContent).not.toContain('/api/v1/private/provider-documents/');
    expect(document.body.textContent).not.toContain('storageKey');

    fireEvent.click(screen.getByRole('button', { name: copy.removeAction }));
    await waitFor(() => expect(deleteProviderDocument).toHaveBeenCalledWith(documentId));
    await waitFor(() => expect(screen.queryByText('commercial-registration.pdf')).not.toBeInTheDocument());
  });

  it('fails closed for oversized files and unavailable requirements', async () => {
    const copy = getProviderDocumentsCopy('en');
    const uploadProviderDocument = vi.fn();
    renderWithLocale(
      <ProviderDocumentsPage
        client={{ getProviderApplication: vi.fn().mockResolvedValue(application('developer_company')), uploadProviderDocument }}
        locale="en"
        providerType="developer_company"
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByTestId('provider-documents')).toHaveAttribute('data-state', 'ready'));
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'too-large.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(`${copy.chooseFileAction}: ${copy.categoryLabels.commercial_registration}`), { target: { files: [oversized] } });
    expect(uploadProviderDocument).not.toHaveBeenCalled();
    expect(await screen.findByText(copy.fileTooLargeTitle)).toBeInTheDocument();

    cleanup();
    renderWithLocale(
      <ProviderDocumentsPage
        client={{ getProviderApplication: vi.fn().mockResolvedValue(application('developer_company', { requirementsSnapshot: undefined })) }}
        locale="en"
        providerType="developer_company"
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByTestId('provider-documents')).toHaveAttribute('data-state', 'empty'));
    expect(screen.getByRole('status')).toHaveTextContent(copy.emptyTitle);
  });

  it('blocks a provider application that lacks the server-provided edit action', async () => {
    const copy = getProviderDocumentsCopy('en');
    renderWithLocale(
      <ProviderDocumentsPage
        client={{ getProviderApplication: vi.fn().mockResolvedValue(application('developer_company', { availableActions: ['view_status'] })) }}
        locale="en"
        providerType="developer_company"
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByTestId('provider-documents')).toHaveAttribute('data-state', 'permission'));
    expect(screen.getByRole('alert')).toHaveTextContent(copy.permissionTitle);
    expect(screen.queryByLabelText(/选择文件|choose file/iu)).not.toBeInTheDocument();
  });
});
