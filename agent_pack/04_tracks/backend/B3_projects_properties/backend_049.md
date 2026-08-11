# backend_049 — مراجعة العقار والنشر

| Field | Value |
|---|---|
| Track | backend |
| Phase | B3_projects_properties |
| Area | properties |
| Kind | api |
| Sequence | 41 / 188 |
| Depends on | `backend_048` |

## Goal

نفّذ مراجعة الإدارة Needs Changes/Approve/Reject/Publish/Hide/Archive مع سبب إلزامي.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- `PRV-13`
- `PRV-14`
- `ADM-15`

## Allowed Roots

- `apps/api/src/modules/properties/**`
- `apps/api/tests/properties/**`
- `packages/contracts/src/properties/**`
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

أنشئ `07_finish/backend_049/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
