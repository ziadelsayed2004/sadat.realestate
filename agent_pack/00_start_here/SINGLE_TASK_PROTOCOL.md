# Single Task Protocol

1. اعمل من جذر الـRepository، وافحص `git status` واحفظ تغييرات المستخدم.
2. شغّل `node agent_pack/scripts/audit_pack.mjs` ثم `select_next_step.mjs`.
3. اقرأ `step_info.json` وملف المهمة وكل Source Refs المذكورة.
4. افحص Runtime الفعلي قبل تعديل أي ملف؛ لا تعتمد على أسماء متوقعة.
5. اكتب خطة صغيرة للمهمة وحدها وحدد الملفات المسموحة.
6. غيّر حالة المهمة إلى In Progress عبر أداة الحالة.
7. نفّذ أقل تغيير متماسك يحقق Acceptance كاملة.
8. أضف اختبارات إيجابية وسلبية/صلاحيات/validation/state حسب المهمة.
9. شغّل أوامر التحقق ذات الصلة ثم gates العامة التي ما زالت متاحة.
10. اكتب `07_finish/<task_id>/completion.json` وفق القالب.
11. غيّر الحالة إلى Complete؛ الأداة سترفض بدون Evidence صالح.
12. شغّل sync/audit/selector، أبلغ عن المهمة التالية، ثم توقف.

ممنوع: قراءة .env حقيقي، طباعة أسرار، لمس Production data، تخطي Dependency، أو تغيير Product Truth صامتًا.
