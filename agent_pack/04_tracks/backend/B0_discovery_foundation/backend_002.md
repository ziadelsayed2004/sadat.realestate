# backend_002 — Bootstrap لـExpress وTypeScript

| Field | Value |
|---|---|
| Track | backend |
| Phase | B0_discovery_foundation |
| Area | foundation |
| Kind | infrastructure |
| Sequence | 3 / 188 |
| Depends on | `backend_001` |

## Goal

جهّز تطبيق API بطبقات واضحة، تشغيل وتوقيف سليم، TypeScript strict، وأوامر build/dev/start.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- PRD/architecture/related runtime contracts.

## Allowed Roots

- `package.json`
- `package-lock.json`
- `apps/api/**`
- `packages/contracts/**`
- `packages/config/**`
- `docs/**`
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

أنشئ `07_finish/backend_002/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
