import type { Connection } from 'mongoose';
import type { AdminSettingsValues } from '@sadat-real-estate/contracts';

export type PropertyImageMime = 'image/jpeg' | 'image/png';
export type PropertyAutomaticExpiry = 'never' | '30_days' | '60_days' | '90_days';
export type PropertyContactVisibility = 'authenticated' | 'public' | 'after_request';

export interface PropertyRuntimeSettings {
  requiresAdminReview: boolean;
  publicationAfterApproval: 'automatic' | 'manual';
  automaticExpiry: PropertyAutomaticExpiry;
  maxImages: number;
  acceptedImageMimes: readonly PropertyImageMime[];
  maxImageBytes: number;
  hideProviderContact: boolean;
  contactVisibility: PropertyContactVisibility;
}

export interface PropertySettingsReader {
  read(): Promise<PropertyRuntimeSettings>;
}

export const DEFAULT_PROPERTY_RUNTIME_SETTINGS: PropertyRuntimeSettings = Object.freeze({
  requiresAdminReview: true,
  publicationAfterApproval: 'manual',
  automaticExpiry: 'never',
  maxImages: 50,
  acceptedImageMimes: ['image/jpeg', 'image/png'] as const,
  maxImageBytes: 10 * 1024 * 1024,
  hideProviderContact: true,
  contactVisibility: 'authenticated'
});

function selected<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function boundedInteger(value: unknown, minimum: number, maximum: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
}

function imageMimes(value: unknown): readonly PropertyImageMime[] {
  if (!Array.isArray(value)) return DEFAULT_PROPERTY_RUNTIME_SETTINGS.acceptedImageMimes;
  const normalized = value.flatMap(item => {
    if (typeof item !== 'string') return [];
    const format = item.trim().toLowerCase().replace(/^\./, '');
    if (format === 'jpg' || format === 'jpeg' || format === 'image/jpeg') return ['image/jpeg' as const];
    if (format === 'png' || format === 'image/png') return ['image/png' as const];
    return [];
  });
  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : DEFAULT_PROPERTY_RUNTIME_SETTINGS.acceptedImageMimes;
}

export function propertyRuntimeSettings(values: AdminSettingsValues | undefined): PropertyRuntimeSettings {
  if (!values) return DEFAULT_PROPERTY_RUNTIME_SETTINGS;
  const maxImageSizeMb = boundedInteger(values.max_image_size_mb, 1, 10, 10);
  return {
    requiresAdminReview: typeof values.requires_admin_review === 'boolean' ? values.requires_admin_review : true,
    publicationAfterApproval: selected(values.publication_after_approval, ['automatic', 'manual'], 'manual'),
    automaticExpiry: selected(values.automatic_expiry, ['never', '30_days', '60_days', '90_days'], 'never'),
    maxImages: boundedInteger(values.max_images, 1, 50, 50),
    acceptedImageMimes: imageMimes(values.accepted_image_formats),
    maxImageBytes: maxImageSizeMb * 1024 * 1024,
    hideProviderContact: typeof values.hide_provider_contact === 'boolean' ? values.hide_provider_contact : true,
    contactVisibility: selected(values.contact_visibility, ['authenticated', 'public', 'after_request'], 'authenticated')
  };
}

export function propertyExpiryDays(value: PropertyAutomaticExpiry): number | undefined {
  if (value === 'never') return undefined;
  return Number(value.slice(0, value.indexOf('_')));
}

export function unexpiredPropertyFilter(now = new Date()): { expiresAt: { $not: { $lte: Date } } } {
  return { expiresAt: { $not: { $lte: now } } };
}

export function createMongoosePropertySettingsReader(connection: Connection): PropertySettingsReader {
  return {
    async read() {
      const row = await connection.collection('admin_settings').findOne(
        { namespace: 'properties' },
        { projection: { _id: 0, values: 1 } }
      );
      return propertyRuntimeSettings(row?.values as AdminSettingsValues | undefined);
    }
  };
}
