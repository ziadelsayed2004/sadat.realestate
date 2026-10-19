import assert from 'node:assert/strict';
import test from 'node:test';
import {
  providerAccountPatchSchema,
  providerApplicationCreateRequestSchema,
  providerApplicationDataSchema,
  providerRequirementSnapshotSchema,
  providerBusinessPatchSchema,
  providerCompanyPatchSchema,
  providerDocumentRequirementSchema,
  providerSubmitRequestSchema,
  providerTypeSchema
} from '@sadat-real-estate/contracts';

test('reads office-specific requirement versions as well as legacy versions without accepting arbitrary strings', () => {
  for (const version of ['2026-08-13.1', '2026-10-15.office.1']) {
    assert.equal(providerApplicationDataSchema.shape.requirementVersion.parse(version), version);
    assert.equal(providerRequirementSnapshotSchema.shape.version.parse(version), version);
  }
  for (const version of ['', 'office', '2026-10-15.office', '2026-10-15..1', '2026-10-15.office.1.extra']) {
    assert.equal(providerApplicationDataSchema.shape.requirementVersion.safeParse(version).success, false);
    assert.equal(providerRequirementSnapshotSchema.shape.version.safeParse(version).success, false);
  }
});

test('accepts only the three approved provider types and strict draft creation input', () => {
  for (const value of ['individual_broker', 'brokerage_office', 'developer_company']) {
    assert.equal(providerTypeSchema.parse(value), value);
  }
  assert.equal(providerTypeSchema.safeParse('office').success, false);
  assert.equal(providerTypeSchema.safeParse('development_company').success, false);
  assert.equal(providerApplicationCreateRequestSchema.safeParse({
    verificationToken: 'T'.repeat(43),
    providerType: 'brokerage_office',
    password: 'Abc1!xyz',
    injected: true
  }).success, false);
});

test('validates account, office, company, and optimistic-version DTOs', () => {
  assert.equal(providerAccountPatchSchema.safeParse({
    version: 0,
    accountOwnerFullName: 'Mona Hassan',
    email: 'OWNER@EXAMPLE.COM',
    primaryLocationId: '0123456789abcdef01234567',
    serviceAreaIds: ['abcdefabcdefabcdefabcdef'],
    preferredLocale: 'ar',
    termsAcceptedAt: '2026-08-13T00:00:00.000Z',
    privacyAcceptedAt: '2026-08-13T00:00:00.000Z'
  }).success, true);
  assert.equal(providerAccountPatchSchema.safeParse({ version: 0 }).success, false);
  assert.equal(providerAccountPatchSchema.safeParse({ version: 0, userId: 'other' }).success, false);
  assert.equal(providerBusinessPatchSchema.safeParse({
    version: 1,
    legalBusinessName: 'Sadat Brokerage',
    accountOwnerHasRegisteredAuthority: false
  }).success, true);
  assert.equal(providerCompanyPatchSchema.safeParse({
    version: 1,
    legalCompanyName: 'Sadat Development',
    accountOwnerHasRegisteredAuthority: true
  }).success, true);
  assert.equal(providerSubmitRequestSchema.safeParse({ version: -1 }).success, false);
});

test('requires machine-readable conditions only on conditional document requirements', () => {
  assert.equal(providerDocumentRequirementSchema.safeParse({
    key: 'authorization_letter',
    labelKey: 'provider.documents.authorizationLetter',
    classification: 'conditional',
    condition: {
      key: 'account_owner_lacks_registered_authority',
      field: 'accountOwnerHasRegisteredAuthority',
      operator: 'equals',
      value: false
    }
  }).success, true);
  assert.equal(providerDocumentRequirementSchema.safeParse({
    key: 'authorization_letter',
    labelKey: 'provider.documents.authorizationLetter',
    classification: 'conditional'
  }).success, false);
  assert.equal(providerDocumentRequirementSchema.safeParse({
    key: 'tax_card',
    labelKey: 'provider.documents.taxCard',
    classification: 'required',
    condition: {
      key: 'account_owner_lacks_registered_authority',
      field: 'accountOwnerHasRegisteredAuthority',
      operator: 'equals',
      value: false
    }
  }).success, false);
});
