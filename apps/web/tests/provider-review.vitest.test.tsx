import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ProviderApplicationData, ProviderApplicationStatusData } from '@sadat-real-estate/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProviderReviewCopy } from '../src/features/provider_auth/review-copy.ts';
import { ProviderReviewPage } from '../src/features/provider_auth/review.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const applicationId = 'a'.repeat(24);

function application(overrides: Partial<ProviderApplicationData> = {}): ProviderApplicationData {
  return {
    id: applicationId,
    providerType: 'developer_company',
    status: 'draft',
    version: 3,
    requirementVersion: '2026-08-13.1',
    accountOwnerFullName: 'Mona Hassan',
    displayName: 'Nile Developments',
    email: 'mona@example.com',
    legalCompanyName: 'Nile Developments LLC',
    brandName: 'Nile Homes',
    headOfficeAddress: 'Cairo',
    accountOwnerHasRegisteredAuthority: true,
    missingFields: [],
    missingDocuments: [],
    availableActions: ['edit_account', 'edit_company', 'submit', 'view_status'],
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    ...overrides
  };
}

function status(overrides: Partial<ProviderApplicationStatusData> = {}): ProviderApplicationStatusData {
  return {
    applicationId,
    providerType: 'developer_company',
    status: 'pending_review',
    version: 4,
    submittedAt: '2026-08-14T00:00:00.000Z',
    availableActions: ['view_status'],
    ...overrides
  };
}

afterEach(() => cleanup());

describe('provider application review and status', () => {
  it.each(['ar', 'en',] as const)('renders the complete review summary in the supported direction for %s', async (locale) => {
    const copy = getProviderReviewCopy(locale);
    renderWithLocale(<ProviderReviewPage client={{}} locale={locale} initialApplication={application()} onBack={vi.fn()} />, { locale });

    await waitFor(() => expect(screen.getByTestId('provider-review')).toHaveAttribute('data-screen-id', 'AUTH-13'));
    expect(screen.getByRole('heading', { name: copy.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Nile Developments LLC')).toBeInTheDocument();
    expect(screen.getByText(copy.documentsCompleteLabel)).toBeInTheDocument();
    expect(screen.getByTestId('provider-review')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    expect(document.body.textContent).not.toContain('internalNote');
    expect(document.body.textContent).not.toContain('storageKey');
  });

  it('submits only the current application version and transitions to the API-provided pending state', async () => {
    const copy = getProviderReviewCopy('en');
    const submitProviderApplication = vi.fn().mockResolvedValue(application({
      status: 'pending_review',
      version: 4,
      submittedAt: '2026-08-14T00:00:00.000Z',
      availableActions: ['view_status']
    }));
    renderWithLocale(
      <ProviderReviewPage
        client={{ submitProviderApplication }}
        locale="en"
        initialApplication={application()}
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );

    await waitFor(() => expect(screen.getByRole('button', { name: copy.submitAction })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: copy.submitAction }));
    await waitFor(() => expect(submitProviderApplication).toHaveBeenCalledWith({ version: 3 }));
    await waitFor(() => expect(screen.getByTestId('provider-review')).toHaveAttribute('data-screen-id', 'AUTH-14'));
    expect(screen.getByText(copy.underReviewTitle)).toBeInTheDocument();
  });

  it('renders the separate tracking view and refreshes status through the implemented status contract', async () => {
    const copy = getProviderReviewCopy('en');
    const getProviderApplicationStatus = vi.fn().mockResolvedValue(status());
    renderWithLocale(
      <ProviderReviewPage
        client={{ getProviderApplicationStatus }}
        locale="en"
        initialApplication={application({ status: 'pending_review', availableActions: ['view_status'], submittedAt: '2026-08-14T00:00:00.000Z' })}
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );

    await waitFor(() => expect(screen.getByTestId('provider-review')).toHaveAttribute('data-screen-id', 'AUTH-14'));
    fireEvent.click(screen.getByRole('button', { name: copy.trackingAction }));
    expect(screen.getByTestId('provider-review')).toHaveAttribute('data-screen-id', 'AUTH-15');
    fireEvent.click(screen.getByRole('button', { name: copy.retryAction }));
    await waitFor(() => expect(getProviderApplicationStatus).toHaveBeenCalledTimes(1));
    expect(screen.getByText(copy.reviewStep)).toBeInTheDocument();
  });

  it('shows the provider-safe review reason and returns to editing only when the API allows it', async () => {
    const copy = getProviderReviewCopy('en');
    const onEdit = vi.fn();
    const needsInformation = application({
      status: 'needs_information',
      missingFields: ['authorizedRepresentativeTitle'],
      missingDocuments: ['additional_supporting_document'],
      availableActions: ['edit_account', 'edit_company', 'submit', 'view_status'],
      reviewReason: 'Please provide the missing representative title.'
    });
    renderWithLocale(<ProviderReviewPage client={{}} locale="en" initialApplication={needsInformation} onBack={vi.fn()} onEdit={onEdit} />, { locale: 'en' });

    await waitFor(() => expect(screen.getByTestId('provider-review')).toHaveAttribute('data-screen-id', 'AUTH-16'));
    expect(screen.getByText('Please provide the missing representative title.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: copy.editApplicationAction }));
    expect(onEdit).toHaveBeenCalledWith(needsInformation);
  });

  it('renders the approved dashboard link only when open_dashboard is returned by the API', async () => {
    const copy = getProviderReviewCopy('en');
    renderWithLocale(
      <ProviderReviewPage
        client={{}}
        locale="en"
        initialApplication={application({ status: 'approved', availableActions: ['view_status', 'open_dashboard'] })}
        onBack={vi.fn()}
      />,
      { locale: 'en' }
    );
    await waitFor(() => expect(screen.getByTestId('provider-review')).toHaveAttribute('data-screen-id', 'AUTH-17'));
    expect(screen.getByRole('link', { name: copy.openDashboardAction })).toHaveAttribute('href', '/provider');

    cleanup();
    renderWithLocale(<ProviderReviewPage client={{}} locale="en" initialApplication={application({ status: 'approved', availableActions: ['view_status'] })} onBack={vi.fn()} />, { locale: 'en' });
    await waitFor(() => expect(screen.getByTestId('provider-review')).toHaveAttribute('data-screen-id', 'AUTH-17'));
    expect(screen.queryByRole('link', { name: copy.openDashboardAction })).not.toBeInTheDocument();
  });

  it('fails closed for an unavailable application and exposes retry without private response data', async () => {
    const copy = getProviderReviewCopy('en');
    const getProviderApplication = vi.fn().mockRejectedValue({ status: 503 });
    renderWithLocale(<ProviderReviewPage client={{ getProviderApplication }} locale="en" onBack={vi.fn()} />, { locale: 'en' });

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(copy.networkTitle));
    expect(screen.getByRole('button', { name: copy.retryAction })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('accessToken');
    expect(document.body.textContent).not.toContain('privateUrl');
  });
});
