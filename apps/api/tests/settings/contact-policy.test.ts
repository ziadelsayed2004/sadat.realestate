import assert from 'node:assert/strict';
import test from 'node:test';
import { contactSettingsProjection } from '../../src/modules/settings/contact-policy.js';
import { createPublicBootstrapService } from '../../src/modules/public/bootstrap.js';

test('publishes configured contacts, normalizes Egyptian phone numbers and omits unsupported or unsafe social links', async () => {
  const contact = contactSettingsProjection({ whatsapp_number: '01012345678', primary_phone: '00201098765432', office_address: { ar: 'مدينة السادات' }, internal_note: 'hidden' }, { facebook_url: 'https://www.facebook.com/sadat', instagram_url: 'https://instagram.com/sadat', youtube_url: 'https://youtube.com/sadat' });
  assert.deepEqual(contact, { whatsappNumber: '+201012345678', phone: '+201098765432', facebookUrl: 'https://www.facebook.com/sadat', instagramUrl: 'https://instagram.com/sadat', address: { ar: 'مدينة السادات' } });
  assert.deepEqual(contactSettingsProjection({ whatsapp_number: 'invalid' }, { facebook_url: 'https://facebook.com.evil.test', instagram_url: 'javascript:alert(1)' }), {});
  const bootstrap = await createPublicBootstrapService({ async read() { return {}; } }, { async read() { return contact; } }).read();
  assert.deepEqual(bootstrap.contact, contact);
});
