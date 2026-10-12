import { getEditableCopyCatalog, localizeCopy } from '../localization/copy-catalog.ts';
import type { ProjectStatus, SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderProjectsCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly helpTitle: string;
  readonly helpBody: string;
  readonly helpPublication: string;
  readonly helpLink: string;
  readonly add: string;
  readonly countSuffix: string;
  readonly filtersLabel: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly noResultsTitle: string;
  readonly noResultsBody: string;
  readonly columns: Readonly<Record<'project' | 'slug' | 'status' | 'reason' | 'updated' | 'actions', string>>;
  readonly statuses: Readonly<Record<ProjectStatus, string>>;
  readonly viewUnavailable: string;
  readonly details: string;
  readonly linkIdentifier: string;
  readonly linkHelp: string;
  readonly statusDescriptions: Readonly<Record<ProjectStatus, string>>;
  readonly edit: string;
  readonly submit: string;
  readonly noActions: string;
  readonly reason: string;
  readonly form: {
    readonly createTitle: string;
    readonly editTitle: string;
    readonly createDescription: string;
    readonly editDescription: string;
    readonly name: string;
    readonly description: string;
    readonly slug: string;
    readonly locationId: string;
    readonly organizationId: string;
    readonly website: string;
    readonly reason: string;
    readonly reasonHelp: string;
    readonly save: string;
    readonly cancel: string;
    readonly close: string;
    readonly required: string;
    readonly localeLabels: Readonly<Record<SupportedLocale, string>>;
    readonly placeholders: Readonly<Record<'slug' | 'locationId' | 'organizationId' | 'website', string>>;
  };
  readonly submitDialog: {
    readonly title: string;
    readonly description: string;
    readonly reason: string;
    readonly reasonHelp: string;
    readonly confirm: string;
    readonly cancel: string;
  };
  readonly feedback: Readonly<Record<'created' | 'updated' | 'submitted', string>>;
  readonly errors: Readonly<Record<'validation' | 'generic' | 'conflict', string>>;
  readonly pagination: string;
  readonly previous: string;
  readonly next: string;
}

export function getProviderProjectsCopy(locale: SupportedLocale): ProviderProjectsCopy {
  return localizeCopy('provider/projects-copy#getProviderProjectsCopy', locale, getEditableCopyCatalog(locale)['provider/projects-copy#getProviderProjectsCopy'] as unknown as ProviderProjectsCopy);
}
