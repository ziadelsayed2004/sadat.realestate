import assert from 'node:assert/strict';
import test from 'node:test';
import { advertisingRuntimeSettings } from '../../src/modules/settings/advertising-policy.js';

test('maps advertising placements, formats, dimensions, quote validity, and payment methods', () => {
  assert.deepEqual(advertisingRuntimeSettings({ supported_placements: ['homepage.hero'], supported_ad_types: ['banner'], desktop_dimensions: '1200x400', mobile_dimensions: '600×300', accepted_file_formats: ['jpg', 'webp'], quote_validity_days: 14, payment_proof_methods: ['bank_transfer'] }), {
    supportedPlacements: ['homepage.hero'], supportedAdTypes: ['banner'], acceptedFileFormats: ['image/jpeg', 'image/webp'], dimensions: [{ width: 1200, height: 400 }, { width: 600, height: 300 }], quoteValidityDays: 14, paymentProofMethods: ['bank_transfer']
  });
});

test('ignores malformed advertising settings', () => {
  assert.deepEqual(advertisingRuntimeSettings({ supported_placements: ['bad value'], desktop_dimensions: 'huge', quote_validity_days: 0 }), { supportedPlacements: [], supportedAdTypes: [], acceptedFileFormats: [], dimensions: [], paymentProofMethods: [] });
});
