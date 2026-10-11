import assert from 'node:assert/strict';
import test from 'node:test';
import { advertisingRuntimeSettings } from '../../src/modules/settings/advertising-policy.js';

test('maps advertising placements, formats, dimensions, quote validity, and payment methods', () => {
  assert.deepEqual(advertisingRuntimeSettings({ supported_placements: ['homepage.hero'], supported_ad_types: ['banner'], desktop_dimensions: '1200x400', mobile_dimensions: '600×300', accepted_file_formats: ['jpg', 'webp'], quote_validity_days: 14, payment_proof_methods: ['bank_transfer'] }), {
    supportedPlacements: ['homepage.hero', 'homepage.featured'], supportedAdTypes: ['banner', 'featured_card'], acceptedFileFormats: ['image/jpeg', 'image/webp'], dimensions: [{ width: 1200, height: 400 }, { width: 600, height: 300 }], quoteValidityDays: 14, paymentProofMethods: ['bank_transfer']
  });
});

test('ignores malformed advertising settings', () => {
  assert.deepEqual(advertisingRuntimeSettings({ supported_placements: ['bad value'], desktop_dimensions: 'huge', quote_validity_days: 0 }), { supportedPlacements: ['homepage.featured'], supportedAdTypes: ['featured_card'], acceptedFileFormats: [], dimensions: [], paymentProofMethods: [] });
});

test('payment recipients come only from the explicit method settings, with bounded safe lines', () => {
  const policy = advertisingRuntimeSettings({
    vodafone_cash_payment_details: ['  Test beneficiary  ', '+201000000001'],
    instapay_payment_details: ['Test beneficiary', 'test-beneficiary@instapay'],
    bank_transfer_payment_details: ['Test bank', 'Test beneficiary', 'EG120000000000000000000000001'],
    cash_payment_details: ['At the platform office'],
    primary_phone: '+201999999999', unsupported_payment_details: ['Do not project']
  });
  assert.deepEqual(policy.paymentInstructions, {
    vodafone_cash: ['Test beneficiary', '+201000000001'], instapay: ['Test beneficiary', 'test-beneficiary@instapay'],
    bank_transfer: ['Test bank', 'Test beneficiary', 'EG120000000000000000000000001'], cash: ['At the platform office']
  });
  assert.equal(advertisingRuntimeSettings({ primary_phone: '+201999999999' }).paymentInstructions, undefined);
  for (const invalid of [[], ['bad\nline'], [42], Array(11).fill('line'), ['x'.repeat(501)]]) {
    assert.equal(advertisingRuntimeSettings({ vodafone_cash_payment_details: invalid }).paymentInstructions, undefined);
  }
});
