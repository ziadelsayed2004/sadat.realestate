import { getEditableCopyCatalog } from '../localization/copy-catalog.ts';
import type { ProjectReviewAction, ProjectStatus, SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminProjectsState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminProjectsCopy {
  readonly eyebrow: string;
  readonly listTitle: string;
  readonly listDescription: string;
  readonly reviewTitle: string;
  readonly reviewDescription: string;
  readonly navigationLabel: string;
  readonly allProjects: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly review: string;
  readonly back: string;
  readonly retry: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, total: number) => string;
  readonly count: (count: number) => string;
  readonly columns: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly status: string;
    readonly version: string;
    readonly updated: string;
    readonly actions: string;
  };
  readonly status: Readonly<Record<ProjectStatus, string>>;
  readonly action: Readonly<Record<ProjectReviewAction, string>>;
  readonly reasonLabel: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly submitReview: string;
  readonly reviewing: string;
  readonly reviewSaved: string;
  readonly states: Readonly<Record<AdminProjectsState, { readonly title: string; readonly body: string }>>;
  readonly unavailable: string;
  readonly noActions: string;
  readonly directionNote: string;
  readonly metrics: { readonly ariaLabel: string; readonly total: string; readonly loaded: string };
  readonly statusTabsLabel: string;
  readonly allTab: string;
}

// Project copy has one source in the committed locale catalogs; formatters
// stay in code because JSON cannot represent functions.
export function getAdminProjectsCopy(locale: SupportedLocale): AdminProjectsCopy {
  const copy = getEditableCopyCatalog(locale)['admin_projects/copy#getAdminProjectsCopy'] as unknown as Omit<AdminProjectsCopy, 'page' | 'count'>;
  return { ...copy, page: (page, total) => locale === 'ar' ? `\u0627\u0644\u0635\u0641\u062d\u0629 ${page} \u0645\u0646 ${total}` : `Page ${page} of ${total}`, count: count => `${count.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')} ${locale === 'ar' ? '\u0645\u0634\u0631\u0648\u0639' : 'projects'}` };
}
