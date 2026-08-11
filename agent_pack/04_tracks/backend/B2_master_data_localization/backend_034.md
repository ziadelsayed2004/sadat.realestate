# backend_034 — المطورون والشركات وهوية المصدر

| Field | Value |
|---|---|
| Track | backend |
| Phase | B2_master_data_localization |
| Area | organizations |
| Kind | api |
| Sequence | 26 / 188 |
| Depends on | `backend_033` |

## Goal

نمذج Organization/Developer/Office والربط بمقدم العقار وهوية المصدر المعتمدة والشارة الموثقة.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- `PUB-05`
- `PUB-06`

## Allowed Roots

- `apps/api/src/modules/organizations/**`
- `apps/api/tests/organizations/**`
- `packages/contracts/src/organizations/**`
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

أنشئ `07_finish/backend_034/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
