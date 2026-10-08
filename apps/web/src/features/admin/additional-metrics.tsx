import type { AdminOverviewMetrics, SupportedLocale } from '@sadat-real-estate/contracts';

export function AdditionalMetrics({ metrics, locale }: { metrics: AdminOverviewMetrics; locale: SupportedLocale }) {
  const ar = locale === 'ar';
  const groups = [
    { title: ar ? 'المحتوى والمجتمع' : 'Content and community', items: [
      { key: 'publishedArticles', label: ar ? 'المقالات المنشورة' : 'Published articles', value: metrics.publishedArticles },
      { key: 'communityPosts', label: ar ? 'المنشورات المجتمعية' : 'Community posts', value: metrics.communityPosts },
      { key: 'communityComments', label: ar ? 'التعليقات' : 'Comments', value: metrics.communityComments },
      { key: 'contentReports', label: ar ? 'بلاغات المحتوى' : 'Content reports', value: metrics.contentReports }
    ] },
    { title: ar ? 'الإعلانات والمدفوعات' : 'Advertising and payments', items: [
      { key: 'adRequests', label: ar ? 'طلبات الإعلانات' : 'Advertising requests', value: metrics.adRequests },
      { key: 'paymentProofs', label: ar ? 'إيصالات الدفع المرفوعة' : 'Submitted payment receipts', value: metrics.paymentProofs },
      { key: 'activeAds', label: ar ? 'الإعلانات داخل فترة العرض الآن' : 'Advertisements in their display window now', value: metrics.activeAds },
      { key: 'approvedAdPaymentsMinor', label: ar ? 'المبالغ المعتمدة للإعلانات' : 'Approved advertising amounts', value: metrics.approvedAdPaymentsMinor, money: true }
    ] }
  ];
  return <>{groups.map(group => <section className="admin-dashboard__metric-section" key={group.title}><h2>{group.title}</h2><div className="admin-dashboard__metric-grid">{group.items.map(item => <article className="admin-dashboard__metric" key={item.key} data-testid={`admin-metric-${item.key}`}>
    <strong>{item.value === undefined ? '—' : 'money' in item ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP' }).format(item.value / 100) : new Intl.NumberFormat(locale).format(item.value)}</strong><span>{item.label}</span>
  </article>)}</div>{group.items.some(item => 'money' in item) ? <p>{ar ? 'المبالغ مرتبطة بتاريخ اعتماد الدفع خلال الفترة المعروضة، ويُحسب الطلب مرة واحدة. الإيصالات قيد المراجعة لا تدخل في الإجمالي.' : 'Amounts use payment approval dates within the displayed range; each request is counted once. Pending receipts are excluded.'}</p> : null}</section>)}</>;
}
