import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PROPERTY_RUNTIME_SETTINGS, propertyExpiryDays, propertyRuntimeSettings } from '../../src/modules/settings/property-policy.js';

test('maps saved property settings into a bounded runtime policy', () => {
  const policy = propertyRuntimeSettings({
    requires_admin_review: false,
    publication_after_approval: 'automatic',
    automatic_expiry: '60_days',
    max_images: 12,
    accepted_image_formats: ['.JPG', 'png', 'jpeg', 'webp'],
    max_image_size_mb: 4,
    hide_provider_contact: false,
    contact_visibility: 'public'
  });
  assert.deepEqual(policy, {
    requiresAdminReview: false,
    publicationAfterApproval: 'automatic',
    automaticExpiry: '60_days',
    maxImages: 12,
    acceptedImageMimes: ['image/jpeg', 'image/png'],
    maxImageBytes: 4 * 1024 * 1024,
    hideProviderContact: false,
    contactVisibility: 'public'
  });
  assert.equal(propertyExpiryDays(policy.automaticExpiry), 60);
});

test('uses secure compatible defaults for missing or out-of-range values', () => {
  assert.deepEqual(propertyRuntimeSettings(undefined), DEFAULT_PROPERTY_RUNTIME_SETTINGS);
  const policy = propertyRuntimeSettings({ max_images: 0, max_image_size_mb: 50, accepted_image_formats: ['webp'], contact_visibility: 'unknown' });
  assert.equal(policy.maxImages, 50);
  assert.equal(policy.maxImageBytes, 10 * 1024 * 1024);
  assert.deepEqual(policy.acceptedImageMimes, ['image/jpeg', 'image/png']);
  assert.equal(policy.hideProviderContact, true);
  assert.equal(propertyExpiryDays(policy.automaticExpiry), undefined);
});
