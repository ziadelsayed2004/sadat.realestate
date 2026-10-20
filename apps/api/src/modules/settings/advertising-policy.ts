import type { Connection } from 'mongoose';
import { paymentAccountSchema, walletPaymentAccountSchema, providerAdRequestProjectionSchema, type ProviderAdRequestProjection } from '@sadat-real-estate/contracts';

export type AdvertisingMime = 'image/jpeg' | 'image/png' | 'image/webp';
export interface AdvertisingDimensions { width: number; height: number }
export interface AdvertisingRuntimeSettings {
  supportedPlacements: string[];
  supportedAdTypes: string[];
  acceptedFileFormats: AdvertisingMime[];
  dimensions: AdvertisingDimensions[];
  quoteValidityDays?: number;
  paymentProofMethods: string[];
  paymentInstructions?: ProviderAdRequestProjection['paymentInstructions'];
}
export interface AdvertisingSettingsReader { read(): Promise<AdvertisingRuntimeSettings> }

export const DEFAULT_ADVERTISING_RUNTIME_SETTINGS: AdvertisingRuntimeSettings = Object.freeze({
  supportedPlacements: [], supportedAdTypes: [], acceptedFileFormats: [], dimensions: [], paymentProofMethods: []
});

function identifiers(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.flatMap((item) => typeof item === 'string' && /^[a-z][a-z0-9_.-]{1,79}$/u.test(item.trim()) ? [item.trim()] : []))].slice(0, 100) : [];
}
function dimensions(value: unknown): AdvertisingDimensions[] {
  if (typeof value !== 'string') return [];
  return value.split(/[\s,;]+/u).flatMap((item) => {
    const match = /^(\d{2,5})[x×](\d{2,5})$/iu.exec(item.trim());
    if (!match) return [];
    const width = Number(match[1]); const height = Number(match[2]);
    return width <= 20_000 && height <= 20_000 ? [{ width, height }] : [];
  });
}
function formats(value: unknown): AdvertisingMime[] {
  const map: Record<string, AdvertisingMime> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', 'image/jpeg': 'image/jpeg', 'image/png': 'image/png', 'image/webp': 'image/webp' };
  return Array.isArray(value) ? [...new Set(value.flatMap((item) => typeof item === 'string' && map[item.trim().toLocaleLowerCase('en-US')] ? [map[item.trim().toLocaleLowerCase('en-US')]!] : []))] : [];
}

export function advertisingRuntimeSettings(values: Record<string, unknown> | undefined): AdvertisingRuntimeSettings {
  if (!values) return DEFAULT_ADVERTISING_RUNTIME_SETTINGS;
  const quoteValidityDays = values.quote_validity_days;
  const instructions = Object.fromEntries(['vodafone_cash', 'instapay', 'bank_transfer', 'cash'].flatMap(method => {
    if (method === 'vodafone_cash' || method === 'instapay') {
      const legacy = Array.isArray(values[`${method}_payment_details`]) ? values[`${method}_payment_details`] as unknown[] : [];
      const account = (method === 'vodafone_cash' ? walletPaymentAccountSchema : paymentAccountSchema).safeParse({ name: values[`${method}_recipient_name`] ?? (legacy.length >= 2 ? legacy[0] : undefined), account: values[`${method}_recipient_account`] ?? (legacy.length >= 2 ? legacy[1] : undefined) });
      return account.success ? [[method, [account.data.name, account.data.account]]] : [];
    }
    const parsed = providerAdRequestProjectionSchema.shape.paymentInstructions.safeParse({ [method]: values[`${method}_payment_details`] });
    return parsed.success && parsed.data ? Object.entries(parsed.data) : [];
  }));
  return {
    supportedPlacements: [...new Set([...identifiers(values.supported_placements), 'homepage.hero', 'homepage.featured'])],
    supportedAdTypes: [...new Set([...identifiers(values.supported_ad_types), 'banner', 'featured_card'])],
    acceptedFileFormats: formats(values.accepted_file_formats),
    dimensions: [...dimensions(values.desktop_dimensions), ...dimensions(values.mobile_dimensions)].filter((item, index, all) => all.findIndex((candidate) => candidate.width === item.width && candidate.height === item.height) === index),
    ...(typeof quoteValidityDays === 'number' && Number.isSafeInteger(quoteValidityDays) && quoteValidityDays >= 1 && quoteValidityDays <= 90 ? { quoteValidityDays } : {}),
    paymentProofMethods: identifiers(values.payment_proof_methods).filter(method => ['vodafone_cash', 'instapay', 'bank_transfer', 'cash'].includes(method)),
    ...(Object.keys(instructions).length ? { paymentInstructions: instructions } : {})
  };
}

export function createMongooseAdvertisingSettingsReader(connection: Connection): AdvertisingSettingsReader {
  return { async read() { const record = await connection.collection('admin_settings').findOne({ namespace: 'advertising' }, { projection: { values: 1 } }); return advertisingRuntimeSettings(record?.values && typeof record.values === 'object' && !Array.isArray(record.values) ? record.values as Record<string, unknown> : undefined); } };
}
