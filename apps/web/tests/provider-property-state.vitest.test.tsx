import { screen, waitFor } from '@testing-library/react';
import { propertyDataSchema, type PropertyData } from '@sadat-real-estate/contracts';
import { describe, expect, it } from 'vitest';
import { getProviderPropertyCopy } from '../src/features/provider_property/copy.ts';
import { getProviderPropertyStateCopy } from '../src/features/provider_property/state-copy.ts';
import { ProviderPropertyCompletionWizard, ProviderPropertyStatePage, type ProviderPropertyAuthClient } from '../src/features/provider_property/index.ts';
import { getProviderCopy } from '../src/features/provider/index.ts';
import { renderWithLocale } from '../src/features/testing/index.ts';

const providerId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const propertyId = 'bbbbbbbbbbbbbbbbbbbbbbbb';

function property(overrides: Partial<PropertyData> = {}): PropertyData {
  return propertyDataSchema.parse({
    id: propertyId,
    kind: 'property',
    name: { ar: 'عقار المزود', en: 'Provider property', 'zh-CN': '提供方房产' },
    slug: 'provider-property',
    transactionType: 'sale',
    source: { providerId, sourceType: 'individual_broker' },
    locationId: 'dddddddddddddddddddddddd',
    price: { amount: 1_000_000, currency: 'EGP' },
    contact: { contactName: 'Mona Hassan', phone: '+201000000000', preferredLocale: 'en' },
    status: 'draft',
    active: true,
    version: 2,
    createdAt: '2026-08-18T08:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z',
    availableActions: ['update', 'submit'],
    ...overrides
  });
}

const session = { status: 'authenticated' as const, role: 'provider' as const };
const authClient: ProviderPropertyAuthClient = {
  getAuthorizationHeader: () => 'Bearer provider.state.token',
  getSnapshot: () => ({ status: 'authenticated', user: { id: providerId, roleType: 'provider', status: 'verified' }, availableActions: [] })
};

describe('provider property submission and state screens', () => {
  it.each([
    ['submitted', 'pending_review', 'PRV-12'],
    ['rejected', 'rejected', 'PRV-13'],
    ['published', 'published', 'PRV-14']
  ] as const)('renders the server-owned %s state as %s without internal fields', (route, status, screenId) => {
    const locale = 'en';
    const copy = getProviderPropertyStateCopy(locale);
    renderWithLocale(<ProviderPropertyStatePage locale={locale} session={session} authClient={authClient} route={route} propertyId={propertyId} initialData={property({ status, availableActions: [], ...(status === 'rejected' ? { reviewReason: 'Missing approved media.' } : {}), ...(status === 'pending_review' ? { submittedAt: '2026-08-18T10:00:00.000Z' } : {}), ...(status === 'published' ? { publishedAt: '2026-08-18T11:00:00.000Z' } : {}) })} />, { locale });

    expect(document.querySelector(`[data-screen-id="${screenId}"]`)).not.toBeNull();
    expect(screen.getByRole('heading', { name: copy.statuses[status].title, level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(copy.labels.unavailable).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/reviewedBy|assignedTo|auditData|storageKey|refreshToken|accessToken/u);
  });

  it('renders a rejection reason and does not invent a support or edit action', () => {
    const copy = getProviderPropertyStateCopy('en');
    renderWithLocale(<ProviderPropertyStatePage locale="en" session={session} authClient={authClient} route="rejected" propertyId={propertyId} initialData={property({ status: 'rejected', reviewReason: 'Missing approved media.', availableActions: [] })} />, { locale: 'en' });

    expect(screen.getByText('Missing approved media.')).toBeInTheDocument();
    expect(screen.getByText(copy.actions.supportUnavailable)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: getProviderCopy('en').properties.edit })).not.toBeInTheDocument();
  });

  it('renders the published public-page action only for published server state', () => {
    const copy = getProviderPropertyStateCopy('en');
    renderWithLocale(<ProviderPropertyStatePage locale="en" session={session} authClient={authClient} route="published" propertyId={propertyId} initialData={property({ status: 'published', availableActions: [] })} />, { locale: 'en' });

    expect(screen.getByRole('link', { name: copy.actions.viewPublic })).toHaveAttribute('href', expect.stringContaining('/properties/provider-property'));
    expect(screen.getAllByText(copy.labels.unavailable).length).toBeGreaterThan(0);
  });

  it.each(['ar', 'en', 'zh-CN'] as const)('renders PRV-11 validation errors with the correct %s direction', locale => {
    const copy = getProviderPropertyStateCopy(locale);
    const incomplete = property({ locationId: undefined, price: undefined, contact: undefined, reviewReason: 'Complete the missing property data.' });
    const result = renderWithLocale(<ProviderPropertyCompletionWizard locale={locale} session={session} authClient={authClient} step="review" propertyId={propertyId} initialData={incomplete} />, { locale });

    expect(result.direction).toBe(locale === 'ar' ? 'rtl' : 'ltr');
    expect(document.querySelector('[data-screen-id="PRV-11"]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: copy.validation.title, level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText(copy.validation.issueLabels.location).length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.validation.issueLabels.price).length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.validation.issueLabels.contact).length).toBeGreaterThan(0);
    expect(screen.getByText('Complete the missing property data.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.validation.edit })).toHaveAttribute('href', expect.stringContaining('/location'));
  });

  it('fails closed when the provider session is not authenticated', async () => {
    const copy = getProviderPropertyCopy('en');
    renderWithLocale(<ProviderPropertyStatePage locale="en" session={{ status: 'anonymous' }} route="submitted" propertyId={propertyId} initialData={property({ status: 'pending_review', availableActions: [] })} />, { locale: 'en' });

    await waitFor(() => expect(screen.getByRole('heading', { name: copy.states.permission.title, level: 3 })).toBeInTheDocument());
    expect(document.querySelector('[data-screen-id="PRV-12"]')).not.toBeNull();
    expect(screen.queryByRole('link', { name: getProviderPropertyStateCopy('en').actions.viewProperty })).not.toBeInTheDocument();
  });
});
