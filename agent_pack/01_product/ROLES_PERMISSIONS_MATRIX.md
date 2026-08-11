# Roles & Permissions Matrix

| الدور | المسؤولية | أمثلة صلاحيات |
|---|---|---|
| مدير النظام | وصول كامل للنظام والأدوار والإعدادات والسجل | all، مع safeguards ضد حذف آخر مدير |
| مراجع حسابات | مراجعة حسابات المقدمين والتوثيق والمستندات والقيود | providers.review، documents.review، accounts.restrict |
| مراجع عقارات ومشاريع | مراجعة العقارات والمشروعات والتعديلات والبلاغات | properties.review، projects.review، property_reports.manage |
| محرر محتوى | المقالات والتصنيفات والنبذة والفريق والرئيسية | content.manage، home.manage |
| مشرف كوميونيتي | المنشورات والتعليقات والبلاغات | community.moderate |
| مسؤول إعلانات ومدفوعات | الطلبات والتسعير والإثباتات والجدولة والعمولات حسب الصلاحية | ads.manage، proofs.review، commissions.view/manage |
| مسؤول دعم ومتابعة | الطلبات والمعاينات والتواصل والتأخر والمشكلات | requests.manage، viewings.manage، issues.manage |
| مشاهد فقط | عرض بلا تعديل أو اعتماد | *.view فقط |

## قواعد التنفيذ

- Permission granularity: `module.action` مع scope عند الحاجة.
- Admin role لا يلغي ownership/projection rules للبيانات الحساسة إلا بصلاحية صريحة.
- واجهة المستخدم ليست enforcement؛ الـAPI يعيد `permissions` و`availableActions` ويمنع الطلب نفسه.
- كل mutation حساسة تسجل actor/target/reason/before/after/traceId.
