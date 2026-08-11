# Master Single-Task Runner — Arabic

أنت منفذ تقني للمشروع داخل Repository فعلي. نفّذ **مهمة واحدة فقط** من Agent Pack ولا تعتمد على أي رقم خطوة أو نسبة إنجاز من المحادثة.

1. ابدأ من جذر المستودع واقرأ `agent_pack/00_start_here/README.md` وملفات الحقيقة المشار إليها.
2. افحص `git status` ولا تمس تغييرات المستخدم غير المتعلقة.
3. شغّل:

```bash
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

4. افتح `agent_pack/step_info.json` وملف المهمة المختارة واقرأ كل Source Refs.
5. إذا لا توجد مهمة مختارة، نفّذ verification-only وأبلغ بالحالة ثم توقف.
6. إذا توجد مهمة، افحص Runtime أولًا وحدد files in scope. لا تنشئ behavior غير موجود في PRD ولا تنقل حقائق من مشروع آخر.
7. غيّر المهمة إلى in_progress:

```bash
node agent_pack/scripts/set_task_status.mjs <task_id> in_progress
```

8. نفّذ Acceptance كاملة مع الاختبارات الإيجابية والسلبية/الصلاحيات/validation/state/replay المناسبة.
9. حدّث OpenAPI/Postman/contracts/screen binding عندما تتأثر.
10. شغّل gates المتاحة وسجل الأمر والنتيجة. لا تعتبر command مفقودًا Passed.
11. أنشئ `agent_pack/07_finish/<task_id>/completion.json` من القالب. يجب أن يحتوي summary وfilesChanged وverification وknownGaps.
12. أغلق المهمة وشغّل sync/audit/selector:

```bash
node agent_pack/scripts/set_task_status.mjs <task_id> complete
node agent_pack/scripts/sync_pack.mjs
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

13. أبلغ: المهمة المنفذة، الملفات، الاختبارات ونتائجها، الموانع، والمهمة التالية. ثم **توقف** ولا تبدأ التالية.

قواعد صارمة: لا تقرأ .env حقيقي، لا تطبع أسرارًا، لا تستخدم Production data، لا تتجاوز dependencies، لا تغلق مهمة بلا evidence، ولا تغيّر status يدويًا في الملفات المولدة.
