import { getEditableCopyCatalog } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminHomeState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface AdminHomeCopy {
  readonly mutation: { readonly placementNotFound: string; readonly notFound: string; readonly conflict: string; readonly failed: string };
  readonly eyebrow: string;
  readonly banners: string;
  readonly newBanner: string;
  readonly tips: string;
  readonly homepage: string;
  readonly bannerDescription: string;
  readonly tipsDescription: string;
  readonly homepageDescription: string;
  readonly add: string;
  readonly save: string;
  readonly saving: string;
  readonly cancel: string;
  readonly retry: string;
  readonly preview: string;
  readonly moveUp: string;
  readonly moveDown: string;
  readonly key: string;
  readonly placement: string;
  readonly title: string;
  readonly altText: string;
  readonly targetUrl: string;
  readonly start: string;
  readonly end: string;
  readonly schedule: Readonly<{ startDate: string; startTime: string; endDate: string; endTime: string; hint: string; invalidRange: string }>;
  readonly order: string;
  readonly status: string;
  readonly visible: string;
  readonly active: string;
  readonly version: string;
  readonly updated: string;
  readonly actions: string;
  readonly body: string;
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly localizedHint: string;
  readonly mediaNote: string;
  readonly saved: string;
  readonly validation: string;
  readonly statuses: Readonly<Record<string, string>>;
  readonly actionsByKey: Readonly<Record<string, string>>;
  readonly states: Readonly<Record<AdminHomeState, { readonly title: string; readonly body: string }>>;
  readonly directionNote: string;
}

export function getAdminHomeCopy(locale: SupportedLocale): AdminHomeCopy {
  return getEditableCopyCatalog(locale)['admin_home/copy#getAdminHomeCopy'] as unknown as AdminHomeCopy;
}
