import { getEditableCopyCatalog, localizeCopy } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminCommissionsState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission' | 'not_found';
export type AdminCommissionsView = 'policies' | 'newPolicy' | 'history' | 'account' | 'exceptions' | 'newException' | 'confirmations';

export interface AdminCommissionsCopy {
  readonly eyebrow: string;
  readonly navLabel: string;
  readonly titles: Readonly<Record<AdminCommissionsView, string>>;
  readonly descriptions: Readonly<Record<AdminCommissionsView, string>>;
  readonly tabs: ReadonlyArray<readonly [string, string]>;
  readonly actions: Readonly<{
    retry: string;
    create: string;
    save: string;
    apply: string;
    previous: string;
    next: string;
    back: string;
  }>;
  readonly labels: Readonly<Record<string, string>>;
  readonly states: Readonly<Record<Exclude<AdminCommissionsState, 'success'>, { title: string; body: string }>>;
  readonly kinds: Readonly<Record<'percentage' | 'fixed' | 'exempt', string>>;
  readonly statuses: Readonly<Record<'draft' | 'active' | 'inactive' | 'archived', string>>;
  readonly scopes: Readonly<Record<'default' | 'provider_type' | 'transaction_type' | 'property_kind' | 'organization' | 'account', string>>;
  readonly sources: Readonly<Record<'exception' | 'account_override' | 'policy' | 'none', string>>;
  readonly targetTypes: Readonly<Record<'commission_policy' | 'commission_exception' | 'commission_account_override' | 'commission_confirmation', string>>;
  readonly noAccount: string;
  readonly autoKey: string;
  readonly validation: string;
  readonly saved: string;
  readonly mutation: Readonly<{ duplicateAccount: string; conflict: string; network: string; failed: string; savedDraft: string }>;
  readonly count: (total: number) => string;
  readonly page: (page: number, pages: number) => string;
  readonly value: (kind: 'percentage' | 'fixed' | 'exempt', percentageBps?: number, fixedAmountMinor?: number, currency?: string) => string;
}

function valueLabel(kind: 'percentage' | 'fixed' | 'exempt', percentageBps?: number, fixedAmountMinor?: number, currency?: string): string {
  if (kind === 'exempt') return 'No commission';
  if (kind === 'percentage' && percentageBps !== undefined) return `${(percentageBps / 100).toFixed(2)}%`;
  if (kind === 'fixed' && fixedAmountMinor !== undefined && currency !== undefined) return `${(fixedAmountMinor / 100).toFixed(2)} ${currency}`;
  return 'Not specified';
}

export function getAdminCommissionsCopy(locale: SupportedLocale): AdminCommissionsCopy {
  const namespace = 'admin_commissions/copy#getAdminCommissionsCopy';
  const catalog = getEditableCopyCatalog(locale)[namespace] as unknown as AdminCommissionsCopy;
  return localizeCopy(namespace, locale, { ...catalog, count: (total: number) => locale === 'ar' ? `${total} \u0633\u062c\u0644` : `${total} records`, page: (page: number, pages: number) => locale === 'ar' ? `\u0635\u0641\u062d\u0629 ${page} \u0645\u0646 ${pages}` : `Page ${page} of ${pages}`, value: valueLabel });
}
