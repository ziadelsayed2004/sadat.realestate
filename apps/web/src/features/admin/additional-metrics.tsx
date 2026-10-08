import type { AdminOverviewMetrics, SupportedLocale } from '@sadat-real-estate/contracts';

export interface OverviewCard {
  readonly key?: keyof AdminOverviewMetrics;
  readonly label: string;
  readonly value?: number | undefined;
  readonly path: string;
  readonly icon: 'content' | 'advertising' | 'commissions' | 'properties' | 'providers' | 'requests' | 'notifications' | 'audit' | 'settings';
  readonly money?: boolean;
}

export interface OverviewGroup {
  readonly title: string;
  readonly cards: readonly OverviewCard[];
  readonly note?: string;
}

export function getAdditionalMetricGroups(metrics: AdminOverviewMetrics, locale: SupportedLocale): readonly OverviewGroup[] {
  const ar = locale === 'ar';
  return [
    { title: ar ? 'المحتوى والمجتمع' : 'Content and community', cards: [
      { key: 'publishedArticles', label: ar ? 'المقالات المنشورة' : 'Published articles', value: metrics.publishedArticles, path: '/admin/articles', icon: 'content' },
      { key: 'communityPosts', label: ar ? 'المنشورات المجتمعية' : 'Community posts', value: metrics.communityPosts, path: '/admin/community', icon: 'content' },
      { key: 'communityComments', label: ar ? 'التعليقات' : 'Comments', value: metrics.communityComments, path: '/admin/community/comments', icon: 'content' },
      { key: 'contentReports', label: ar ? 'بلاغات المحتوى' : 'Content reports', value: metrics.contentReports, path: '/admin/community/moderation', icon: 'requests' }
    ] },
    { title: ar ? 'الإعلانات والمدفوعات' : 'Advertising and payments', cards: [
      { key: 'adRequests', label: ar ? 'طلبات الإعلانات' : 'Advertising requests', value: metrics.adRequests, path: '/admin/ads/requests', icon: 'advertising' },
      { key: 'paymentProofs', label: ar ? 'إيصالات الدفع المرفوعة' : 'Submitted payment receipts', value: metrics.paymentProofs, path: '/admin/ads/payment-proofs/pending', icon: 'advertising' },
      { key: 'activeAds', label: ar ? 'الإعلانات داخل فترة العرض الآن' : 'Advertisements in their display window now', value: metrics.activeAds, path: '/admin/ads/calendar', icon: 'advertising' },
      { key: 'approvedAdPaymentsMinor', label: ar ? 'المبالغ المعتمدة للإعلانات' : 'Approved advertising amounts', value: metrics.approvedAdPaymentsMinor, money: true, path: '/admin/ads/financial-review', icon: 'commissions' }
    ], note: ar ? 'المبالغ مرتبطة بتاريخ اعتماد الدفع خلال الفترة المعروضة، ويُحسب الطلب مرة واحدة. الإيصالات قيد المراجعة لا تدخل في الإجمالي.' : 'Amounts use payment approval dates within the displayed range; each request is counted once. Pending receipts are excluded.' }
  ];
}
