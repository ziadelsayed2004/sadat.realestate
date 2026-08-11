# backend_014 — أنواع مقدم العقار وطلب التسجيل

| Field | Value |
|---|---|
| Track | backend |
| Phase | B1_identity_access |
| Area | provider |
| Kind | api |
| Sequence | 15 / 188 |
| Depends on | `backend_013` |

## Goal

نفّذ provider type selection وonboarding draft متعدد الخطوات وحالات Pending/Needs Information/Approved/Rejected.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- `AUTH-07`
- `AUTH-08`
- `AUTH-09`
- `AUTH-10`
- `AUTH-11`
- `AUTH-13`
- `AUTH-14`
- `AUTH-15`
- `AUTH-16`
- `AUTH-17`

## Allowed Roots

- `apps/api/src/modules/provider/**`
- `apps/api/tests/provider/**`
- `packages/contracts/src/provider/**`
- `docs/api/**`
- `apps/api/openapi/**`
- `apps/api/postman/**`
- `agent_pack/**`

أي ملف خارجها يحتاج سببًا صريحًا وتحديث task evidence؛ لا توسع scope صامتًا.

## Acceptance Criteria

- [ ] تم فحص Runtime الحالي ولم تُستبدل حقيقة قائمة بافتراض.
- [ ] النطاق المحدد فقط نُفذ، وكل dependency أو قرار غير محسوم موثق.
- [ ] لا توجد أسرار أو بيانات إنتاج أو claims غير مدعومة.
- [ ] Contracts وvalidation وerror codes وpermissions/ownership متزامنة مع التنفيذ.
- [ ] أضيفت اختبارات إيجابية وسلبية وvalidation/state حسب طبيعة المهمة.
- [ ] OpenAPI/Postman/API inventory حُدثت إذا تغيرت routes أو DTOs.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test -- --runInBand`
- `npm run build`
- `npm audit --audit-level=high`
- `route/OpenAPI/Postman checks when applicable`

الأمر غير الموجود أو prerequisite المفقود يسجل `Blocked — prerequisites unavailable` ولا يعتبر Passed.

## Finish

أنشئ `07_finish/backend_014/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
