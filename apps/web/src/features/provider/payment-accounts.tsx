import type { PaymentAccount, SupportedLocale } from '@sadat-real-estate/contracts';
import { getProviderAdvertisingCopy } from './advertising-copy.ts';

export function PaymentAccounts({ sender, recipient, locale }: { readonly sender?: PaymentAccount | undefined; readonly recipient?: PaymentAccount | undefined; readonly locale: SupportedLocale }) {
  const copy = getProviderAdvertisingCopy(locale);
  if (!sender && !recipient) return null;
  return <dl className="provider-advertising__definition-list admin-ads__detail-list">{[{ account: recipient, label: copy.paymentRecipient }, { account: sender, label: copy.senderAccount }].map(({ account, label }) => account ? <div key={label}><dt>{label}</dt><dd>{account.name}<br /><bdi dir="ltr">{account.account}</bdi></dd></div> : null)}</dl>;
}
