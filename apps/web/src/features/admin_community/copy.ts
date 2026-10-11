import { getEditableCopyCatalog, localizeCopy } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminCommunityView = 'posts' | 'comments' | 'reports';
export type AdminCommunityState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'success';

export interface AdminCommunityCopy {
  readonly eyebrow: string;
  readonly title: Record<AdminCommunityView, string>;
  readonly description: Record<AdminCommunityView, string>;
  readonly tab: Record<AdminCommunityView, string>;
  readonly search: string;
  readonly searchPlaceholder: string;
  readonly status: string;
  readonly postId: string;
  readonly all: string;
  readonly apply: string;
  readonly clear: string;
  readonly retry: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, totalPages: number) => string;
  readonly columns: {
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly post: string;
    readonly author: string;
    readonly reporter: string;
    readonly reason: string;
    readonly details: string;
    readonly status: string;
    readonly comments: string;
    readonly created: string;
    readonly updated: string;
    readonly actions: string;
  };
  readonly postStatus: Record<'draft' | 'published' | 'hidden' | 'rejected' | 'removed', string>;
  readonly commentStatus: Record<'visible' | 'hidden' | 'removed', string>;
  readonly reportStatus: Record<'open' | 'in_review' | 'resolved' | 'dismissed', string>;
  readonly reportReason: Record<'spam' | 'abuse' | 'misinformation' | 'other', string>;
  readonly action: { readonly review: string; readonly resolve: string; readonly dismiss: string; readonly close: string; readonly publishPost: string; readonly hidePost: string; readonly rejectPost: string; readonly removePost: string };
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly confirm: string;
  readonly records: string;
  readonly visible: string;
  readonly pageLabel: string;
  readonly pageSize: string;
  readonly noActions: string;
  readonly idPrefix: string;
  readonly totalPosts: string;
  readonly totalReports: string;
  readonly statusSummary: string;
  readonly reportSummaryNote: string;
  readonly summaryUnavailable: string;
  readonly stalePost: string;
  readonly states: Record<Exclude<AdminCommunityState, 'success' | 'empty'>, { readonly title: string; readonly body: string }>;
  readonly empty: { readonly title: string; readonly body: string };
  readonly directionNote: string;
}

export function getAdminCommunityCopy(locale: SupportedLocale): AdminCommunityCopy {
  const copy = getEditableCopyCatalog(locale)['admin_community/copy#getAdminCommunityCopy'] as unknown as AdminCommunityCopy;
  return localizeCopy('admin_community/copy#getAdminCommunityCopy', locale, { ...copy,
    page: (page: number, totalPages: number) => locale === 'ar' ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`
  });
}
