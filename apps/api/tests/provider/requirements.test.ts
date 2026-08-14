import assert from 'node:assert/strict';
import test from 'node:test';
import {
  availableProviderActions,
  canTransitionProviderApplication,
  missingProviderFields,
  providerRequirementSnapshot,
  requiredDocumentCategories
} from '../../src/modules/provider/requirements.js';

const common = {
  accountOwnerFullName: 'Mona Hassan',
  displayName: 'Mona Properties',
  email: 'mona@example.com',
  primaryLocationId: '0123456789abcdef01234567',
  serviceAreaIds: ['abcdefabcdefabcdefabcdef'],
  preferredLocale: 'ar',
  termsAcceptedAt: new Date('2026-08-13T00:00:00.000Z'),
  privacyAcceptedAt: new Date('2026-08-13T00:00:00.000Z')
};

test('applies exact required and optional categories by provider type', () => {
  const individual = providerRequirementSnapshot('individual_broker', undefined);
  assert.deepEqual(requiredDocumentCategories(individual), [
    'government_id_front', 'government_id_back'
  ]);
  assert.equal(individual.requirements.find((item) => item.key === 'broker_license')?.applies, true);

  const officeOwner = providerRequirementSnapshot('brokerage_office', true);
  assert.equal(requiredDocumentCategories(officeOwner).includes('authorization_letter'), false);
  const officeDelegate = providerRequirementSnapshot('brokerage_office', false);
  assert.equal(requiredDocumentCategories(officeDelegate).includes('authorization_letter'), true);
  assert.equal(
    officeDelegate.requirements.find((item) => item.key === 'authorization_letter')?.condition?.key,
    'account_owner_lacks_registered_authority'
  );
});

test('validates common and type-specific submission fields without retroactive defaults', () => {
  assert.deepEqual(missingProviderFields({ providerType: 'individual_broker', ...common }), []);
  const officeMissing = missingProviderFields({ providerType: 'brokerage_office', ...common });
  assert.ok(officeMissing.includes('legalBusinessName'));
  assert.ok(officeMissing.includes('accountOwnerHasRegisteredAuthority'));
  const companyMissing = missingProviderFields({
    providerType: 'developer_company',
    ...common,
    legalCompanyName: 'Company',
    brandName: 'Brand',
    headOfficeAddress: 'Address',
    commercialRegistrationNumber: 'CR-1',
    taxRegistrationNumber: 'TAX-1',
    authorizedRepresentativeFullName: 'Mona Hassan',
    authorizedRepresentativeTitle: 'CEO',
    accountOwnerHasRegisteredAuthority: true
  });
  assert.deepEqual(companyMissing, []);
});

test('exposes state-derived actions and rejects undefined transitions', () => {
  assert.deepEqual(
    availableProviderActions('brokerage_office', 'draft'),
    ['edit_account', 'edit_business', 'submit', 'view_status']
  );
  assert.deepEqual(availableProviderActions('developer_company', 'pending_review'), ['view_status']);
  assert.deepEqual(availableProviderActions('developer_company', 'approved'), ['view_status', 'open_dashboard']);
  assert.equal(canTransitionProviderApplication('draft', 'pending_review'), true);
  assert.equal(canTransitionProviderApplication('pending_review', 'needs_information'), true);
  assert.equal(canTransitionProviderApplication('pending_review', 'approved'), true);
  assert.equal(canTransitionProviderApplication('draft', 'approved'), false);
  assert.equal(canTransitionProviderApplication('rejected', 'pending_review'), false);
});
