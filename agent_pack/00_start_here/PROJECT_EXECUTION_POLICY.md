# Project Execution Policy

## الترتيب الإلزامي

1. Discovery وقرار المعمارية.
2. Backend foundation/security/contracts.
3. الهوية وRBAC.
4. Master data وCMS.
5. المشروعات والعقارات والوسائط والمراجعات.
6. البحث والباحث والطلبات والمعاينات.
7. المحتوى والكوميونيتي.
8. الإعلانات وإثباتات الدفع.
9. العمولات والإدارة والتقارير.
10. Backend security/readiness/handoff gate.
11. Frontend foundation وVite SSR.
12. Public/Auth/Seeker/Provider/Admin بالترتيب.
13. E2E/visual/i18n/accessibility/performance/release.

## قاعدة المهمة الواحدة

- الـselector يختار أول مهمة Open أو Partial انتهت كل Dependencies الخاصة بها.
- يُسمح بمهمة واحدة In Progress.
- لا يبدأ المنفذ المهمة التالية في نفس التشغيل.
- أي prerequisite خارجي مفقود يسجل Blocked مع السبب؛ لا يُختلق بديل يغير المنتج.

## Backend Gate

لا يبدأ `frontend_000` قبل إغلاق `backend_138` بأدلة build/lint/typecheck/tests/security/inventory/handoff.

## Statuses

| الحالة | المعنى |
|---|---|
| open | لم تبدأ |
| in_progress | المهمة الوحيدة الجاري تنفيذها |
| partial | تنفيذ موجود لكن Acceptance غير مكتملة |
| blocked | مانع محدد موثق |
| complete | الكود والاختبارات والدليل مكتملة |
