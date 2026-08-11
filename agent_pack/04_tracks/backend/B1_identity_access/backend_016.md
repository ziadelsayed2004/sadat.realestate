# backend_016 — دخول الإدارة وحسابات المسؤولين

| Field | Value |
|---|---|
| Track | backend |
| Phase | B1_identity_access |
| Area | admin |
| Kind | security |
| Sequence | 17 / 188 |
| Depends on | `backend_015` |

## Goal

نفّذ admin login وإدارة الحساب الإداري وحماية bootstrap لأول Super Admin.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- `ADM-59`
- `ADM-60`
- `ADM-61`
- `ADM-62`

## Allowed Roots

- `apps/api/src/modules/admin/**`
- `apps/api/tests/admin/**`
- `packages/contracts/src/admin/**`
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

أنشئ `07_finish/backend_016/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
