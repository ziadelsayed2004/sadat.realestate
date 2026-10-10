import { getEditableCopyCatalog, localizeCopy } from '../localization/copy-catalog.ts';
import type { AdminSettingsNamespace, SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminSettingsState } from './views.tsx';
import type { settingsHelp } from './help.ts';

export interface AdminSettingsCopy {
  readonly eyebrow: string;
  readonly platform: string;
  readonly contact: string;
  readonly social: string;
  readonly labels: Readonly<Record<AdminSettingsNamespace, string>>;
  readonly descriptions: Readonly<Record<AdminSettingsNamespace, string>>;
  readonly fields: Readonly<Record<string, string>>;
  readonly selectPlaceholder: string;
  readonly locales: Readonly<Record<'ar' | 'en', string>>;
  readonly save: string;
  readonly saving: string;
  readonly retry: string;
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly saved: string;
  readonly validation: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly preservedValues: string;
  readonly unavailableAction: string;
  readonly states: Readonly<Record<AdminSettingsState, { readonly title: string; readonly body: string }>>;
  readonly directionNote: string;
}

export function getAdminSettingsCopy(locale: SupportedLocale): AdminSettingsCopy & ReturnType<typeof settingsHelp> {
  return localizeCopy('admin_settings/copy#getAdminSettingsCopy', locale, getEditableCopyCatalog(locale)['admin_settings/copy#getAdminSettingsCopy'] as unknown as AdminSettingsCopy & ReturnType<typeof settingsHelp>);
}
