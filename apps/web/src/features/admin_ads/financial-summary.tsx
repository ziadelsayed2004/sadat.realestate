import type { AdFinancialReviewListData, SupportedLocale } from '@sadat-real-estate/contracts';

export function FinancialSummary({ summary, locale }: { summary: AdFinancialReviewListData['summary']; locale: SupportedLocale }) {
  if (!summary) return null;
  const ar = locale === 'ar';
  return <section className="admin-ads__review-card" data-testid="admin-approved-payment-summary">
    <h2>{ar ? 'ملخص المدفوعات المعتمدة' : 'Approved payment summary'}</h2>
    <p>{ar ? 'قيمة عروض الأسعار المقبولة التي لها إيصال دفع اعتمدته الإدارة. يحسب كل طلب مرة واحدة؛ رفع الإيصال وحده لا يدخل في الإجمالي.' : 'Accepted quote amounts backed by administrator-approved receipts. Each request is counted once; submission alone is excluded.'}</p>
    <dl className="admin-ads__detail-list"><div><dt>{ar ? 'طلبات بدفع معتمد' : 'Requests with approved payment'}</dt><dd>{summary.approvedRequests}</dd></div><div><dt>{ar ? 'طلبات تنتظر مراجعة الإيصال' : 'Requests awaiting receipt review'}</dt><dd>{summary.pendingRequests}</dd></div>{summary.totals.length ? summary.totals.map(total => <div key={total.currency}><dt>{ar ? 'إجمالي المبالغ المعتمدة' : 'Approved amount total'} ({total.currency})</dt><dd>{new Intl.NumberFormat(locale, { style: 'currency', currency: total.currency }).format(total.amountMinor / 100)}</dd></div>) : <div><dt>{ar ? 'إجمالي المبالغ المعتمدة' : 'Approved amount total'}</dt><dd>{ar ? 'لا توجد مبالغ معتمدة' : 'No approved amounts'}</dd></div>}</dl>
    <p>{ar ? 'هذا ملخص مراجعة الإدارة، وليس تأكيدًا آليًا من البنك أو تقرير أرباح.' : 'This summarizes administrator reviews, not automatic bank confirmation or profit.'}</p>
  </section>;
}
