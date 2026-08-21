export {
  ADMIN_SETTINGS_CONTACT_ROUTE,
  ADMIN_SETTINGS_PLATFORM_ROUTE,
  ADMIN_SETTINGS_ROUTE,
  ADMIN_SETTINGS_SOCIAL_ROUTE,
  createAdminSettingsSource,
  loadAdminSettings,
  updateAdminSettings
} from './data.ts';
export type { AdminSettingsAuthorizationSource, AdminSettingsLoader, AdminSettingsMutation, AdminSettingsSource } from './data.ts';
export { AdminSettings } from './views.tsx';
export type { AdminSettingsProps, AdminSettingsState } from './views.tsx';
export { getAdminSettingsCopy } from './copy.ts';
export type { AdminSettingsCopy } from './copy.ts';
