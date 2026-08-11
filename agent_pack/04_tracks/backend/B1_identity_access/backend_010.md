# backend_010 — نماذج الهوية والحسابات

| Field | Value |
|---|---|
| Track | backend |
| Phase | B1_identity_access |
| Area | identity |
| Kind | model |
| Sequence | 11 / 188 |
| Depends on | `backend_009` |

## Goal

صمّم User وSeekerProfile وProviderProfile وAdminProfile وSession مع فهارس uniqueness وحالات الحساب.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- PRD/architecture/related runtime contracts.

## Allowed Roots

- `apps/api/src/modules/identity/**`
- `apps/api/tests/identity/**`
- `packages/contracts/src/identity/**`
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

أنشئ `07_finish/backend_010/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
