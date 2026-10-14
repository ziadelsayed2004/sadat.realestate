import type { PaymentAccount, SupportedLocale } from '@sadat-real-estate/contracts';
import { getProviderAdvertisingCopy } from './advertising-copy.ts';
import './payment-accounts.css';

export function PaymentAccounts({ sender, recipient, locale }: { readonly sender?: PaymentAccount | undefined; readonly recipient?: PaymentAccount | undefined; readonly locale: SupportedLocale }) {
  const copy = getProviderAdvertisingCopy(locale);
  if (!sender && !recipient) return null;
  return <dl className="payment-accounts">{[{ account: recipient, label: copy.paymentRecipient }, { account: sender, label: copy.senderAccount }].map(({ account, label }) => account ? <div className="payment-accounts__card" key={label}><dt>{label}</dt><dd><bdi dir="auto">{account.name}</bdi><bdi dir="ltr">{account.account}</bdi></dd></div> : null)}</dl>;
}
