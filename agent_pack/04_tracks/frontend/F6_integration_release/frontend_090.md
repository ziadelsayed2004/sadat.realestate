# frontend_090 — بوابة الإصدار النهائية

| Field | Value |
|---|---|
| Track | frontend |
| Phase | F6_integration_release |
| Area | release |
| Kind | release |
| Sequence | 188 / 188 |
| Depends on | `frontend_089` |

## Goal

شغّل كل quality/security/readiness gates وثبّت release manifest دون ادعاءات غير مدعومة.

## Screen IDs

- لا توجد شاشة مباشرة؛ المهمة تدعم العقود أو البنية.

## Source Refs

- PRD/architecture/related runtime contracts.

## Allowed Roots

- `apps/web/src/features/release/**`
- `apps/web/src/routes/**`
- `apps/web/tests/**`
- `packages/ui/**`
- `packages/contracts/**`
- `agent_pack/**`

أي ملف خارجها يحتاج سببًا صريحًا وتحديث task evidence؛ لا توسع scope صامتًا.

## Acceptance Criteria

- [ ] تم فحص Runtime الحالي ولم تُستبدل حقيقة قائمة بافتراض.
- [ ] النطاق المحدد فقط نُفذ، وكل dependency أو قرار غير محسوم موثق.
- [ ] لا توجد أسرار أو بيانات إنتاج أو claims غير مدعومة.
- [ ] تمت مطابقة Screen IDs بالـFrame الفعلي وتسجيل الرابط في Evidence.
- [ ] لا توجد mocks إنتاجية؛ البيانات من عقود Backend المنفذة.
- [ ] Loading/Empty/Error/Retry/Success وpermission variants مكتملة عند الحاجة.
- [ ] AR/EN/ZH-CN والاتجاه ونطاق الأجهزة واختبارات الواجهة مكتملة.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `targeted Playwright/visual/a11y checks`

الأمر غير الموجود أو prerequisite المفقود يسجل `Blocked — prerequisites unavailable` ولا يعتبر Passed.

## Finish

أنشئ `07_finish/frontend_090/completion.json`، ثم استخدم status tool وشغّل sync/audit/selector وتوقف.
