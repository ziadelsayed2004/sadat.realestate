import type { AdLedgerListData, SupportedLocale } from '@sadat-real-estate/contracts';
import { getAdminAdsCopy } from './copy.ts';
import { getAdLedgerCopy } from './ledger-copy.ts';
import { EGYPT_TIME_ZONE } from '../public/egypt-time.ts';

export function AdLedgerTable({ data, locale }: { readonly data: AdLedgerListData; readonly locale: SupportedLocale }) {
  const copy = getAdminAdsCopy(locale);
  const ledger = getAdLedgerCopy(locale);
  return <>
    <p className="admin-ads__notice">{ledger.help}</p>
    <a href={`/admin/user-guide?lang=${locale}#guide-ad-payments`}>{ledger.guide}</a>
    <div className="admin-ads__table-wrap"><table className="admin-ads__table">
      <thead><tr><th scope="col">{copy.columns.request}</th><th scope="col">{copy.columns.source}</th><th scope="col">{ledger.action}</th><th scope="col">{copy.columns.occurred}</th><th scope="col">{copy.columns.amount}</th><th scope="col">{ledger.meaning}</th></tr></thead>
      <tbody>{data.items.map(item => <tr key={item.id} data-testid={`admin-ledger-${item.id}`}>
        <td><a href={`/admin/ads/requests?requestId=${item.requestId}&lang=${locale}`}>{ledger.request} #{item.requestId.slice(-6).toUpperCase()}</a><details><summary>{ledger.record}</summary><code>{item.id}</code><br /><code>{item.requestId}</code></details></td>
        <td>{ledger.sources[item.source]}</td>
        <td>{ledger.kinds[item.kind]}</td>
        <td>{new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: EGYPT_TIME_ZONE }).format(new Date(item.occurredAt))}</td>
        <td>{item.amountMinor === undefined || item.currency === undefined ? ledger.noAmount : new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: item.currency }).format(item.amountMinor / 100)}</td>
        <td>{ledger.treatment}</td>
      </tr>)}</tbody>
    </table></div>
  </>;
}
