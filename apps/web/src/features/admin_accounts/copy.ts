import { getEditableCopyCatalog, localizeCopy } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminAccountsView = 'users' | 'seekers' | 'providers' | 'verification';
export type AdminAccountsState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission' | 'not_found';

export interface AdminAccountsCopy {
  readonly users: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;
    readonly roleLabel: string;
    readonly statusLabel: string;
    readonly typeLabel: string;
    readonly all: string;
    readonly totalLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly columns: Readonly<Record<'name' | 'type' | 'phone' | 'email' | 'status' | 'locale' | 'updated' | 'actions', string>>;
  };
  readonly providers: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;
    readonly statusLabel: string;
    readonly typeLabel: string;
    readonly all: string;
    readonly totalLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly columns: Readonly<Record<'name' | 'type' | 'status' | 'accountStatus' | 'company' | 'updated' | 'actions', string>>;
  };
  readonly verification: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;
    readonly statusLabel: string;
    readonly typeLabel: string;
    readonly all: string;
    readonly totalLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly columns: Readonly<Record<'name' | 'type' | 'status' | 'submitted' | 'updated' | 'actions', string>>;
  };
  readonly states: Readonly<Record<AdminAccountsState, { readonly title: string; readonly body: string }>>;
  readonly statusLabels: Readonly<Record<string, string>>;
  readonly accountStatusLabels: Readonly<Record<string, string>>;
  readonly providerTypeLabels: Readonly<Record<string, string>>;
  readonly documentCategoryLabels: Readonly<Record<string, string>>;
  readonly securityStateLabels: Readonly<Record<string, string>>;
  readonly reviewStateLabels: Readonly<Record<string, string>>;
  readonly actions: {
    readonly retry: string;
    readonly view: string;
    readonly back: string;
    readonly openDocument: string;
    readonly unavailableDocument: string;
    readonly loadingDocument: string;
    readonly reviewHeading: string;
    readonly reviewReason: string;
    readonly reviewReasonPlaceholder: string;
    readonly reviewReasonRequired: string;
    readonly reviewSaved: string;
    readonly verify: string;
    readonly reject: string;
    readonly needsInformation: string;
    readonly suspend: string;
  };
  readonly roleLabels: Readonly<Record<'seeker' | 'provider', string>>;
  readonly common: {
    readonly apply: string;
    readonly clear: string;
    readonly previous: string;
    readonly next: string;
    readonly pagination: string;
    readonly metricsLabel: string;
    readonly providerTypeFilter: string;
    readonly recordStatusFilter: string;
    readonly headingActionsLabel: string;
    readonly addUser: string;
    readonly seekers: string;
    readonly propertyProviders: string;
  };
  readonly metricLabels: Readonly<Record<'totalAccounts' | 'totalSeekers' | 'loaded' | 'matched' | 'seekers' | 'providers' | 'verified' | 'pending' | 'restricted' | 'totalProviders' | 'approved' | 'rejected' | 'suspended' | 'totalRequests' | 'needsInformation', string>>;
  readonly documents: {
    readonly title: string;
    readonly empty: string;
    readonly document: string;
    readonly mime: string;
    readonly size: string;
    readonly securityState: string;
    readonly reviewState: string;
    readonly uploaded: string;
    readonly action: string;
  };
}

export function getAdminAccountsCopy(locale: SupportedLocale): AdminAccountsCopy {
  return localizeCopy('admin_accounts/copy#getAdminAccountsCopy', locale, getEditableCopyCatalog(locale)['admin_accounts/copy#getAdminAccountsCopy'] as unknown as AdminAccountsCopy);
}
