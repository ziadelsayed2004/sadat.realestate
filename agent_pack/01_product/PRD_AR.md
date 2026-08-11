# PRD — منصة عقارات السادات

## 1. الرؤية

منصة موثوقة لعرض واكتشاف عقارات مدينة السادات وربط الباحثين بمقدمي العقارات، مع تشغيل ومراجعة وإعلانات وعمولات ومحتوى تحت إدارة صلاحيات دقيقة.

## 2. المستخدمون

- زائر عام.
- باحث عن عقار.
- مقدم عقار: سمسار فرد، مكتب، أو شركة تطوير.
- مستخدم إداري ضمن دور وصلاحيات قابلة للتخصيص.

## 3. أهداف النجاح

- عقار منشور بمصدر واضح وحالة مراجعة حقيقية.
- بحث وتصفية ومقارنة عنصرين مع صفحات قابلة للفهرسة.
- تحويل الزيارة إلى طلب تواصل/معاينة/بحث قابل للمتابعة.
- Onboarding موثق لمقدم العقار وإدارة موحدة لعقاراته ومشروعاته.
- تشغيل إداري قابل للتدقيق دون تجاوز الصلاحيات.

## 4. الموقع العام

- الرئيسية، قائمة العقارات، التفاصيل، مقارنة عنصرين.
- دليل المطورين والشركات وملفاتهم.
- مقالات وكوميونيتي وإنشاء منشور للمستخدم المؤهل.
- نبذة المنصة والفريق.
- لا يظهر إلا المحتوى المنشور والجهات/العقارات المعتمدة.

## 5. التسجيل وOnboarding

- Login، OTP، تسجيل باحث.
- اختيار نوع مقدم العقار، بيانات حساب ونشاط/شركة، مستندات، مراجعة وإرسال وتتبع.
- حالات مقدم العقار: Draft → Pending Review → Needs Information → Approved/Rejected/Suspended.

## 6. الباحث

- Overview، طلباتي وتفاصيلها، المعاينات، المحفوظات، الإشعارات، التفضيلات والبيانات والإعدادات.
- لا تظهر ملاحظات داخلية أو إسناد أو Audit data.

## 7. مقدم العقار

- Dashboard وعقاراتي وProperty wizard من 8 خطوات.
- Projects، Customer Requests، Viewing Appointments.
- Ad Requests ورفع إثبات الدفع عند الطلب.
- Commission read-only، Notifications، Settings.

## 8. الإدارة

- Users/seekers/providers/doc review/account reports/restrictions.
- Taxonomy/locations/features/projects/properties/reviews/duplicates/reports.
- Requests operations وSLA ومشكلات الطلبات.
- Articles/community/about/team/counter/home/CMS.
- Ads/quotes/proofs/calendar/banners/financial review.
- Commissions policies/accounts/exceptions/confirmations/change log.
- Settings/SEO/privacy/display/admin users/RBAC/notifications/audit.

## 9. قواعد النشر والمقارنة

- كل listing منشور له Provider/Organization source واضح.
- Verified Badge لا يظهر إلا عند اعتماد حقيقي.
- المقارنة بحد أقصى عنصرين وتشمل السعر والسداد والمساحة والتقسيم والموقع والمميزات والوسائط والمصدر والمشروع/المطور.

## 10. الطلبات والمعاينات

- الأنواع: contact، viewing، property search، provider-added customer request.
- الحالات المرجعية: New → Contacted → Follow-up → Viewing → Interested/Negotiation → Completed/Closed مع تخصيص مسموح لكل نوع.
- الإسناد والملاحظات الداخلية للإدارة/المقدم المؤهل فقط.

## 11. الإعلانات والمدفوعات

- لا يوجد سعر ثابت عام مفترض؛ الإدارة ترسل Quote.
- إثبات الدفع يراجع يدويًا؛ Uploaded لا يساوي Approved أو bank verified.
- دورة الإعلان: Draft → Review → Waiting Pricing → Quote Sent → Waiting Payment → Scheduled → Active → Ended.

## 12. العمولات

- نسبة أو مبلغ ثابت أو إعفاء وفق Policy.
- يمكن وجود Account override وException بتاريخ فعالية.
- لا توجد قيمة Universal hardcoded.
- مقدم العقار يعرض السياسة الفعالة ولا يعدلها.

## 13. اللغات والأجهزة

- ar RTL هو المرجع البصري الأساسي؛ en وzh-CN LTR بنفس routes/components/permissions.
- Public/Auth responsive عبر Desktop/Tablet/Mobile.
- Seeker/Provider/Admin desktop-only ضمن التسليم الحالي.

## 14. الخصوصية والأمان

- المستندات وإثباتات الدفع private، الوصول مفوض ومؤقت.
- Auth + RBAC + ownership + validation + rate limit لكل endpoint حساس.
- Audit append-only للإجراءات الحساسة مع reason وbefore/after عند الحاجة.
- منع IDOR وNoSQL injection وmass assignment وupload abuse وتسريب PII.

## 15. الحالات العامة

كل رحلة واجهة تشمل Loading/Empty/Error/Retry/Success، وصورة مفقودة، نص طويل، وحالة منتهية/غير متاحة عند الحاجة.

## 16. خارج النطاق ما لم يعتمد لاحقًا

- AI matching أو تقييمات آلية وهمية.
- تحقق حكومي أو بنكي أو ملكية آلي.
- Payment Gateway غير مذكور.
- Responsive للوحات الثلاث خارج Frames المعتمدة.
- أرقام تشغيلية ثابتة بلا مصدر بيانات.

## 17. Definition of Done

- عقد API موثق ومختبر، permissions/availableActions صحيحة.
- Frame مطابق، اللغات والاتجاه والحالات مكتملة.
- positive/negative/validation/state tests ناجحة.
- لا أسرار أو mocks إنتاجية أو claims بلا evidence.
