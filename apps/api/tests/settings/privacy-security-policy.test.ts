import assert from 'node:assert/strict';
import test from 'node:test';
import { privacySecurityRuntimeSettings } from '../../src/modules/settings/privacy-security-policy.js';

test('maps privacy controls, bounded Admin timeout, and two-factor authentication', () => {
  assert.deepEqual(privacySecurityRuntimeSettings({
    hide_customer_contact: true,
    hide_internal_notes: false,
    hide_private_documents: true,
    admin_session_timeout_minutes: 30,
    two_factor_authentication: true
  }), {
    hideCustomerContact: true,
    hideInternalNotes: false,
    hidePrivateDocuments: true,
    adminSessionTimeoutMinutes: 30,
    twoFactorAuthentication: true
  });
});

test('uses privacy-preserving defaults and ignores invalid session timeouts', () => {
  assert.deepEqual(privacySecurityRuntimeSettings({
    admin_session_timeout_minutes: 0
  }), {
    hideCustomerContact: true,
    hideInternalNotes: true,
    hidePrivateDocuments: true,
    twoFactorAuthentication: false
  });
});
