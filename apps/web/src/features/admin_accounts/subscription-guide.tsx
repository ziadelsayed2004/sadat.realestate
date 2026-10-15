import type { ProviderType, SupportedLocale } from '@sadat-real-estate/contracts';

export function ProviderSubscriptionGuide({ locale, providerType, providerId }: { locale: SupportedLocale; providerType?: ProviderType | undefined; providerId?: string | undefined }) {
  const ar = locale === 'ar';
  const cycles = ar ? [
    ['individual_broker', 'وسيط فردي', 'استكمال الحساب وصورتي البطاقة ← مراجعة الإدارة ← اعتماد الحساب وإضافة العقارات. لا يوجد اشتراك ظهور اسم وصورة للوسيط الفردي حاليًا؛ التواصل وطلبات العملاء تديرها الإدارة.'],
    ['brokerage_office', 'مكتب وساطة', 'استكمال المكتب وصورتي البطاقة ← اعتماد الحساب ← الاتفاق على اشتراك الظهور وسداد المبلغ خارج المنصة ← الإدارة تؤكد الدفع وتحدد البداية والنهاية. يظهر اسم وصورة المكتب أثناء المدة فقط؛ عند انتهائها يتوقف ظهور الهوية حتى التجديد.'],
    ['developer_company', 'شركة مطورة', 'استكمال بيانات الشركة ومستنداتها ← اعتماد الحساب ← تخصيص العمولة من الإدارة ← موافقة المطوّر عليها. الدليل يعرض الشركة المعتمدة ومشروعاتها المنشورة؛ إظهار التواصل وبيانات العملاء مرتبط بتأكيد العمولة. تغيير العمولة يحتاج تأكيدًا جديدًا، وليس تجديد اشتراك مكتب.']
  ] : [
    ['individual_broker', 'Individual broker', 'Complete the account and both ID images → administrative review → approval and property listings. No paid name/photo display subscription currently applies; customer requests and communication are managed by administration.'],
    ['brokerage_office', 'Brokerage office', 'Complete the office and both ID images → approval → agree and pay externally for identity display → administration confirms payment and sets start/end dates. The office name/photo appears only during that period; renew to restore identity display after expiry.'],
    ['developer_company', 'Developer company', 'Complete company details/documents → approval → administration assigns commission → developer acknowledges it. Approved companies and published projects appear in the directory; contact and customer identity depend on commission acknowledgement. Changed commission requires acknowledgement again, rather than office subscription renewal.']
  ];
  return <details className="admin-provider-subscription-guide" id="provider-subscription-cycle" open={providerType !== undefined}>
    <summary>{ar ? 'الاشتراكات ودورة عرض العقار — كل أنواع الحسابات' : 'Subscriptions and property display — all account types'}</summary>
    <div>{cycles.map(([type, title, description]) => <article key={type} data-current={type === providerType}><h3>{title}</h3><p>{description}</p>{type === providerType && type === 'brokerage_office' ? <a href="#provider-subscription-form">{ar ? 'إدارة مدة اشتراك المكتب أسفل الصفحة' : 'Manage the office subscription below'}</a> : type === providerType && type === 'developer_company' && providerId ? <a href={`/admin/commissions/account?accountId=${providerId}&lang=${locale}`}>{ar ? 'إدارة عمولة هذا الحساب' : 'Manage this account’s commission'}</a> : null}</article>)}</div>
    <p>{ar ? 'الإعلانات المدفوعة خدمة منفصلة لكل أنواع الحسابات: طلب إعلان ← عرض سعر ← موافقة العميل ← إثبات دفع ومراجعته ← تصميم الإعلان وجدولته ونشره. لا يوجد خصم أو تجديد مالي تلقائي.' : 'Paid advertisements are separate for every account type: request → quote → customer acceptance → payment proof and review → creative, scheduling and publication. Payments and renewals are not automatically charged.'} <a href={`/admin/ads/requests?lang=${locale}`}>{ar ? 'إدارة طلبات الإعلانات' : 'Manage advertising requests'}</a></p>
  </details>;
}
