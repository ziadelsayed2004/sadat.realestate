import { getEditableCopyCatalog } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminMasterDataTab = 'categories' | 'locations' | 'features';
export type AdminMasterDataState = 'loading' | 'empty' | 'success' | 'error' | 'retry' | 'permission';
export type AdminMasterDataKind = 'category' | 'type' | 'location' | 'neighborhood' | 'feature' | 'service';

export interface AdminMasterDataCopy {
  readonly eyebrow: string;
  readonly titles: Readonly<Record<AdminMasterDataTab, string>>;
  readonly descriptions: Readonly<Record<AdminMasterDataTab, string>>;
  readonly tabs: Readonly<Record<AdminMasterDataTab, string>>;
  readonly navigationLabel: string;
  readonly add: string;
  readonly edit: string;
  readonly delete: string;
  readonly save: string;
  readonly cancel: string;
  readonly close: string;
  readonly retry: string;
  readonly confirmDelete: string;
  readonly count: (value: number) => string;
  readonly columns: Readonly<Record<'name' | 'kind' | 'parent' | 'order' | 'active' | 'updated' | 'actions', string>>;
  readonly kinds: Readonly<Record<AdminMasterDataKind, string>>;
  readonly labels: Readonly<Record<'nameAr' | 'nameEn' | 'slug' | 'kind' | 'parent' | 'category' | 'group' | 'order' | 'active' | 'reason' | 'latitude' | 'longitude', string>>;
  readonly placeholders: Readonly<Record<'nameAr' | 'nameEn' | 'slug' | 'parent' | 'category' | 'group' | 'reason' | 'latitude' | 'longitude', string>>;
  readonly states: Readonly<Record<AdminMasterDataState, { readonly title: string; readonly body: string }>>;
  readonly mutation: Readonly<Record<'created' | 'updated' | 'deleted' | 'validation' | 'failed', string>>;
  readonly unavailable: string;
  readonly noParent: string;
  readonly noGroup: string;
  readonly noActions: string;
  readonly active: string;
  readonly inactive: string;
  readonly directionNote: string;
}

export function getAdminMasterDataCopy(locale: SupportedLocale): AdminMasterDataCopy {
  const copy = getEditableCopyCatalog(locale)['admin_master_data/copy#getAdminMasterDataCopy'] as unknown as Omit<AdminMasterDataCopy, 'count'>;
  return { ...copy, count: value => `${value.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ${locale === 'ar' ? '\u0639\u0646\u0635\u0631' : 'items'}` };
}
