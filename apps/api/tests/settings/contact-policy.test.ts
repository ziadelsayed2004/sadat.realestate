import assert from 'node:assert/strict';
import test from 'node:test';
import { contactSettingsProjection, createMongoosePublicContactSettingsReader } from '../../src/modules/settings/contact-policy.js';
import type { Connection } from 'mongoose';
import { createPublicBootstrapService } from '../../src/modules/public/bootstrap.js';

test('publishes the latest saved office address and map consistently from either admin tab, including clearing', async () => {
  const platform = { namespace: 'platform', updatedAt: new Date('2026-10-22T10:00:00Z'), values: { office_address: { en: 'Old office' }, map_url: 'https://maps.google.com/?q=Old' } };
  const contact = { namespace: 'contact', updatedAt: new Date('2026-10-22T11:00:00Z'), values: { office_address: { en: 'New office' }, map_url: 'https://maps.google.com/?q=New' } };
  const connection = { collection() { return { find() { return { async toArray() { return [platform, contact]; } }; } }; } } as unknown as Connection;
  const reader = createMongoosePublicContactSettingsReader(connection);
  assert.deepEqual((await reader.read()).address, { en: 'New office' });
  assert.equal((await reader.read()).mapUrl, contact.values.map_url);
  platform.updatedAt = new Date('2026-10-22T12:00:00Z');
  assert.deepEqual((await reader.read()).address, { en: 'Old office' });
  platform.values.map_url = '';
  assert.equal((await reader.read()).mapUrl, undefined);
});

test('publishes configured contacts, normalizes Egyptian phone numbers and omits unsupported or unsafe social links', async () => {
  const contact = contactSettingsProjection({ whatsapp_number: '01012345678', primary_phone: '00201098765432', office_address: { ar: 'مدينة السادات' }, internal_note: 'hidden' }, { facebook_url: 'https://www.facebook.com/sadat', instagram_url: 'https://instagram.com/sadat', youtube_url: 'https://youtube.com/sadat' });
  assert.deepEqual(contact, { whatsappNumber: '+201012345678', phone: '+201098765432', facebookUrl: 'https://www.facebook.com/sadat', instagramUrl: 'https://instagram.com/sadat', address: { ar: 'مدينة السادات' } });
  assert.deepEqual(contactSettingsProjection({ whatsapp_number: 'invalid' }, { facebook_url: 'https://facebook.com.evil.test', instagram_url: 'javascript:alert(1)' }), {});
  const bootstrap = await createPublicBootstrapService({ async read() { return {}; } }, { async read() { return contact; } }).read();
  assert.deepEqual(bootstrap.contact, contact);
});
