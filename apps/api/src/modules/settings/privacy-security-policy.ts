import type { Connection } from 'mongoose';

export interface PrivacySecurityRuntimeSettings {
  hideCustomerContact: boolean;
  hideInternalNotes: boolean;
  hidePrivateDocuments: boolean;
  adminSessionTimeoutMinutes?: number;
  twoFactorAuthentication: boolean;
}

export interface PrivacySecuritySettingsReader {
  read(): Promise<PrivacySecurityRuntimeSettings>;
}

export const DEFAULT_PRIVACY_SECURITY_RUNTIME_SETTINGS: PrivacySecurityRuntimeSettings = Object.freeze({
  hideCustomerContact: true,
  hideInternalNotes: true,
  hidePrivateDocuments: true,
  twoFactorAuthentication: false
});

export function privacySecurityRuntimeSettings(values: Record<string, unknown> | undefined): PrivacySecurityRuntimeSettings {
  if (!values) return DEFAULT_PRIVACY_SECURITY_RUNTIME_SETTINGS;
  const timeout = values.admin_session_timeout_minutes;
  return {
    hideCustomerContact: values.hide_customer_contact !== false,
    hideInternalNotes: values.hide_internal_notes !== false,
    hidePrivateDocuments: values.hide_private_documents !== false,
    ...(typeof timeout === 'number' && Number.isSafeInteger(timeout) && timeout >= 1 && timeout <= 1_440
      ? { adminSessionTimeoutMinutes: timeout }
      : {}),
    twoFactorAuthentication: values.two_factor_authentication === true
  };
}

export function createMongoosePrivacySecuritySettingsReader(connection: Connection): PrivacySecuritySettingsReader {
  return {
    async read() {
      const record = await connection.collection('admin_settings').findOne(
        { namespace: 'privacy-security' },
        { projection: { values: 1 } }
      );
      const values = record?.values;
      return privacySecurityRuntimeSettings(
        values && typeof values === 'object' && !Array.isArray(values)
          ? values as Record<string, unknown>
          : undefined
      );
    }
  };
}
