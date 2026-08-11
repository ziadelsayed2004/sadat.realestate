# backend_063 — مقارنة وحدتين فقط

| Field | Value |
|---|---|
| Track | backend |
| Phase | B4_public_seeker |
| Area | compare |
| Kind | api |
| Sequence | 51 / 188 |
| Depends on | `backend_062` |

## Goal

نفّذ comparison endpoint بحد أقصى عنصرين وحقول مقارنة ثابتة والتحقق من النشر والتوفر.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- `PUB-04`

## Allowed Roots

- `apps/api/src/modules/compare/**`
- `apps/api/tests/compare/**`
- `packages/contracts/src/compare/**`
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

أنشئ `07_finish/backend_063/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
