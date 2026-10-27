import type { ProviderType, SupportedLocale } from '@sadat-real-estate/contracts';

export function ProviderSubscriptionGuide({ locale, providerType, providerId }: { locale: SupportedLocale; providerType?: ProviderType | undefined; providerId?: string | undefined }) {
  const ar = locale === 'ar';
  const cycles = ar ? [
    ['individual_broker', 'مالك عقار', 'استكمال الحساب وصورتي البطاقة ← اعتماد الحساب ← سداد اشتراك ظهور الاسم والصورة خارج المنصة ← الإدارة تؤكد الدفع وتحدد المدة. الاشتراك لا يتيح بيانات العملاء أو وسائل التواصل.'],
    ['brokerage_office', 'مكتب وساطة', 'استكمال المكتب وصورتي البطاقة ← اعتماد الحساب ← الاتفاق على اشتراك الظهور وسداد المبلغ خارج المنصة ← الإدارة تؤكد الدفع وتحدد البداية والنهاية. يظهر اسم وصورة المكتب أثناء المدة فقط؛ عند انتهائها يتوقف ظهور الهوية حتى التجديد.'],
    ['developer_company', 'شركة مطورة', 'الشركة المعتمدة ومشروعاتها المنشورة تظهر في الدليل. اشتراك ظهور الاسم والصورة متاح من النموذج أدناه، ويظل اتفاق العمولة وتأكيده مستقلًا؛ إظهار التواصل وبيانات العملاء مرتبط بتأكيد العمولة.']
  ] : [
    ['individual_broker', 'Property owner', 'Complete the account and ID images → approval → pay externally for name/photo display → administration confirms payment and dates. This subscription never grants access to customer data or contact details.'],
    ['brokerage_office', 'Brokerage office', 'Complete the office and both ID images → approval → agree and pay externally for identity display → administration confirms payment and sets start/end dates. The office name/photo appears only during that period; renew to restore identity display after expiry.'],
    ['developer_company', 'Developer company', 'Approved companies and published projects appear in the directory. Name/photo display subscriptions can be managed below. Commission agreement and acknowledgement remain independent; customer identity and contact require acknowledgement.']
  ];
  return <details className="admin-provider-subscription-guide" id="provider-subscription-cycle" open={providerType !== undefined}>
    <summary>{ar ? 'الاشتراكات ودورة عرض العقار — كل أنواع الحسابات' : 'Subscriptions and property display — all account types'}</summary>
    <div>{cycles.map(([type, title, description]) => <article key={type} data-current={type === providerType}><h3>{title}</h3><p>{description}</p>{type === providerType ? <a href="#provider-subscription-form">{ar ? 'إدارة مدة اشتراك الظهور أسفل الصفحة' : 'Manage the display subscription below'}</a> : null}{type === providerType && type === 'developer_company' && providerId ? <a href={`/admin/commissions/account?accountId=${providerId}&lang=${locale}`}>{ar ? 'إدارة عمولة هذا الحساب' : 'Manage this account’s commission'}</a> : null}</article>)}</div>
    <p>{ar ? 'الإعلانات المدفوعة خدمة منفصلة لكل أنواع الحسابات: طلب إعلان ← عرض سعر ← موافقة العميل ← إثبات دفع ومراجعته ← تصميم الإعلان وجدولته ونشره. لا يوجد خصم أو تجديد مالي تلقائي.' : 'Paid advertisements are separate for every account type: request → quote → customer acceptance → payment proof and review → creative, scheduling and publication. Payments and renewals are not automatically charged.'} <a href={`/admin/ads/requests?lang=${locale}`}>{ar ? 'إدارة طلبات الإعلانات' : 'Manage advertising requests'}</a></p>
  </details>;
}
