import type { Connection } from 'mongoose';
import { normalizedPhoneSchema, type PublicBootstrapData } from '@sadat-real-estate/contracts';

type Contact = NonNullable<PublicBootstrapData['contact']>;
export interface PublicContactSettingsReader { read(): Promise<Contact> }
export const DEMO_CONTACT_SETTINGS = {
  primary_phone: '+201001234567', whatsapp_number: '+201001234567',
  facebook_url: 'https://www.facebook.com/', instagram_url: 'https://www.instagram.com/',
  map_url: 'https://www.google.com/maps/search/?api=1&query=Sadat+City+Egypt',
  office_address: { ar: 'مدينة السادات، مصر', en: 'Sadat City, Egypt' }
};

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
    const raw = contact[key] ?? social[key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    try {
      const url = new URL(raw.trim());
      if (url.protocol === 'https:' && !url.username && !url.password && (url.hostname === domain || url.hostname.endsWith(`.${domain}`))) result[field] = url.href;
    } catch { /* Unconfigured links stay hidden. */ }
  }
  const address = contact.office_address;
  if (typeof contact.map_url === 'string' && contact.map_url.trim()) {
    try { const url = new URL(contact.map_url); if (url.protocol === 'https:' && !url.username && !url.password && ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(url.hostname)) result.mapUrl = url.href; }
    catch { /* Invalid map links stay hidden. */ }
  }
  if (address && typeof address === 'object' && !Array.isArray(address)) {
    const entries = Object.entries(address).filter(([key, value]) => ['ar', 'en'].includes(key) && typeof value === 'string' && value.trim());
    if (entries.length) result.address = Object.fromEntries(entries);
  }
  const hours = contact.working_hours;
  if (hours && typeof hours === "object" && !Array.isArray(hours)) {
    const entries = Object.entries(hours).filter(([key, value]) => ["ar", "en"].includes(key) && typeof value === "string" && value.trim());
    if (entries.length) result.workingHours = Object.fromEntries(entries);
  }
  return result;
}

export function createMongoosePublicContactSettingsReader(connection: Connection): PublicContactSettingsReader {
  return { async read() {
    const rows = await connection.collection('admin_settings').find({ namespace: { $in: ['contact', 'social', 'platform'] } }, { projection: { namespace: 1, values: 1, updatedAt: 1 } }).toArray();
    const values = (namespace: string): Record<string, unknown> => rows.find(row => row.namespace === namespace)?.values ?? {};
    const platform = values('platform');
    const stamp = (value: unknown) => value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) || 0 : 0;
    const latestMap = rows.filter(row => ['platform', 'contact'].includes(row.namespace) && row.values?.map_url !== undefined).sort((a, b) => stamp(a.updatedAt) - stamp(b.updatedAt)).at(-1);
    const contact: Record<string, unknown> = { ...platform, ...values('contact'), ...(latestMap ? { map_url: latestMap.values.map_url } : {}) };
    const social = values('social');
    const configured = contact.contact_configured === true || ['primary_phone', 'whatsapp_number', 'map_url', 'facebook_url', 'instagram_url'].some(key => typeof (contact[key] ?? social[key]) === 'string' && String(contact[key] ?? social[key]).trim());
    const projected = contactSettingsProjection(contact, social);
    return configured || projected.workingHours || projected.address ? projected : { ...contactSettingsProjection(DEMO_CONTACT_SETTINGS), isDemo: true };
  } };
}
