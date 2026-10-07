import type { Connection } from 'mongoose';
import { normalizedPhoneSchema, type PublicBootstrapData } from '@sadat-real-estate/contracts';

type Contact = NonNullable<PublicBootstrapData['contact']>;
export interface PublicContactSettingsReader { read(): Promise<Contact> }

export function contactSettingsProjection(contact: Record<string, unknown> = {}, social: Record<string, unknown> = {}): Contact {
  const result: Contact = {};
  for (const [key, field] of [['primary_phone', 'phone'], ['whatsapp_number', 'whatsappNumber']] as const) {
    const raw = contact[key];
    if (typeof raw !== 'string') continue;
    const compact = raw.trim().replace(/[\s().-]/gu, '');
    const parsed = normalizedPhoneSchema.safeParse(/^01\d{9}$/u.test(compact) ? `+2${compact}` : compact.startsWith('+') || compact.startsWith('00') ? compact : `+${compact}`);
    if (parsed.success) result[field] = parsed.data;
  }
  for (const [key, field, domain] of [['facebook_url', 'facebookUrl', 'facebook.com'], ['instagram_url', 'instagramUrl', 'instagram.com']] as const) {
    const raw = social[key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    try {
      const url = new URL(raw.trim());
      if (url.protocol === 'https:' && !url.username && !url.password && (url.hostname === domain || url.hostname.endsWith(`.${domain}`))) result[field] = url.href;
    } catch { /* Unconfigured links stay hidden. */ }
  }
  const address = contact.office_address;
  if (address && typeof address === 'object' && !Array.isArray(address)) {
    const entries = Object.entries(address).filter(([key, value]) => ['ar', 'en'].includes(key) && typeof value === 'string' && value.trim());
    if (entries.length) result.address = Object.fromEntries(entries);
  }
  return result;
}

export function createMongoosePublicContactSettingsReader(connection: Connection): PublicContactSettingsReader {
  return { async read() {
    const rows = await connection.collection('admin_settings').find({ namespace: { $in: ['contact', 'social', 'platform'] } }, { projection: { namespace: 1, values: 1 } }).toArray();
    const values = (namespace: string): Record<string, unknown> => rows.find(row => row.namespace === namespace)?.values ?? {};
    return contactSettingsProjection({ ...values('platform'), ...values('contact') }, values('social'));
  } };
}
