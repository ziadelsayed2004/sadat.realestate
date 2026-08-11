# تحليل المشروع — منصة عقارات السادات

## الخلاصة التنفيذية

المشروع منصة عقارية متعددة الأسطح، وليس موقع عرض بسيط. يتكوّن من موقع عام قابل للفهرسة، تسجيل وOnboarding، لوحة باحث، لوحة مقدم عقار، ولوحة إدارة تشغيلية ومالية ومحتوى. الهاند أوفر يعرّف 131 شاشة/حالة: Public 12، Auth 19، Seeker 10، Provider 24، Admin 66.

## ما تم تسليمه فعليًا

- Developer Handoff HTML بتاريخ 09 Aug 2026 وروابط Figma/Drive/Design System.
- Registry كامل للشاشات والأدوار والحالات ونطاق responsive.
- Agent Pack قديم لمشروع آخر كمرجع تنظيمي فقط.
- لا يوجد Backend أو Frontend source code مرفق؛ نسبة التنفيذ المثبتة حاليًا 0%.

## حدود المنتج

- Public: عقارات، تفاصيل، مقارنة، مطورون، مقالات، كوميونيتي، نبذة وفريق.
- Seeker: طلبات، معاينات، محفوظات، إشعارات، تفضيلات وحساب.
- Provider: Onboarding وتوثيق، عقارات ومشروعات، CRM، معاينات، إعلانات، عمولة، إشعارات وإعدادات.
- Admin: users/RBAC، taxonomy، moderation، requests operations، CMS، ads/payment proofs، commissions، settings، audit.
- اللغات: عربي RTL، إنجليزي LTR، صيني مبسط LTR.
- Responsive: Public/Auth على Desktop/Tablet/Mobile؛ اللوحات الثلاث Desktop فقط ضمن التصميم الحالي.

## قرارات المعمارية

- Monorepo باستخدام npm workspaces لتوحيد العقود والـUI دون خلط runtime.
- API: Node Active LTS + Express 5 + TypeScript strict + MongoDB/Mongoose.
- Web: React + TypeScript + Vite. الموقع العام SSR لأن العقارات والمقالات تحتاج HTML قابلًا للفهرسة؛ dashboards تعمل كتطبيقات محمية داخل نفس الواجهة.
- REST versioned تحت `/api/v1`، وOpenAPI هو عقد التسليم.
- Validation في boundary والعقود المشتركة، وليس الاعتماد على TypeScript وقت التشغيل.
- MongoDB replica set مطلوب للعمليات التي تعتمد على transactions/outbox؛ التطوير يجب أن يحاكي ذلك.
- وسائط خاصة وعامة منفصلة عبر Storage Adapter؛ المزوّد النهائي قرار بيئي لا يُحرق في الدومين.

## أخطر مناطق التعقيد

1. RBAC الإداري الديناميكي مع View Only وobject-level access.
2. دورة مراجعة مقدم العقار والمستندات الخاصة.
3. Property wizard متعدد الخطوات مع revisions والمراجعة والنشر.
4. توحيد أنواع الطلبات مع الحفاظ على فروقها والـSLA والملاحظات الداخلية.
5. الإعلانات: تسعير يدوي، إثبات دفع يدوي، وجدولة دون Gateway مفترض.
6. العمولات: policy/override/exception/effective date/confirmation/snapshot.
7. SEO + ثلاث لغات + RTL/LTR + SSR.

## فجوات لا يجب اختراعها

- مزوّد OTP وقناة login النهائية وسياسة كلمات المرور لكل نوع مستخدم.
- قائمة مستندات كل Provider Type وحقول Figma الدقيقة.
- تعريف حدث استحقاق العمولة وطريقة التسوية والتحصيل.
- مزوّد media/storage والخرائط والإشعارات.
- عملة/ضرائب/صلاحية عرض سعر الإعلان وحدود الملفات والاحتفاظ.
- SLA الدقيق لكل request type وسياسة الإسناد.

هذه الفجوات موجودة في `OPEN_QUESTIONS.md` وتُحسم في `backend_000` قبل تنفيذ الدومين المتأثر.
