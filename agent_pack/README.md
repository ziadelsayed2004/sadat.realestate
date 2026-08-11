# Sadat Real Estate — Agent Pack

حزمة تنفيذ لمشروع **منصة عقارات السادات** مبنية على Developer Handoff بتاريخ 09 Aug 2026. الحزمة لا تدّعي وجود كود منفذ؛ هي تحول التسليم التصميمي إلى Graph تنفيذي قابل للتتبع، Backend أولًا ثم Frontend.

## Snapshot

| البند | القيمة |
|---|---:|
| الشاشات/الحالات المرجعية | 131 |
| مهام Backend | 113 |
| مهام Frontend | 75 |
| إجمالي المهام | 188 |
| Blueprint لمسارات الـAPI | 160 route |
| المهمة المختارة أولًا | `backend_000` |
| حالة Runtime عند إنشاء الحزمة | غير مرفق / غير منفذ |

## ابدأ من هنا

1. اقرأ `00_start_here/README.md`.
2. من جذر المشروع شغّل:

```bash
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

إذا كانت الحزمة نفسها موجودة باسم مختلف، شغّل الأوامر من داخل مجلدها.

3. افتح `step_info.json` واقرأ ملف المهمة المحدد.
4. استخدم `05_prompts/MASTER_SINGLE_TASK_RUNNER_AR.md`.
5. نفّذ مهمة واحدة فقط، اختبرها، ثم حدّث الحالة بالدليل.

## قواعد حاكمة

- الحقيقة في الكود والاختبارات أعلى من أي محادثة أو checkbox.
- لا يبدأ Frontend قبل اكتمال `backend_138` وتجميد عقود v1.
- كل Screen ID من الهاند أوفر مرتبط بمهمة Frontend واحدة فقط.
- لا تُستخدم mocks في Production، ولا تُغلق مهمة بدون evidence.
- Figma وDrive يحددان الـvisual truth؛ هذا الـPack يحدد التنفيذ والعقود والتغطية.
