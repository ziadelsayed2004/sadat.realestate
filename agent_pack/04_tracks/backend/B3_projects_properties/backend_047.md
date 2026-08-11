# backend_047 — وسائط العقار ومعالجتها

| Field | Value |
|---|---|
| Track | backend |
| Phase | B3_projects_properties |
| Area | media |
| Kind | security |
| Sequence | 39 / 188 |
| Depends on | `backend_046` |

## Goal

نفّذ رفع الصور والمخططات وترتيبها وصورة الغلاف وحالات processing والفشل وسياسة النشر.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- `PRV-08`

## Allowed Roots

- `apps/api/src/modules/media/**`
- `apps/api/tests/media/**`
- `packages/contracts/src/media/**`
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

أنشئ `07_finish/backend_047/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
