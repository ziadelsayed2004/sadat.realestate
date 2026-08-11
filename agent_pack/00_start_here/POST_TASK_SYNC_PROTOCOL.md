# Post Task Sync Protocol

بعد كل مهمة:

1. اكتب `07_finish/<task_id>/completion.json` وفيه summary وfilesChanged وverification وknownGaps.
2. شغّل:

```bash
node agent_pack/scripts/set_task_status.mjs <task_id> complete
node agent_pack/scripts/sync_pack.mjs
node agent_pack/scripts/audit_pack.mjs
node agent_pack/scripts/select_next_step.mjs
```

3. تأكد أن `TASK_BOARD.md` و`COUNT_SUMMARY.json` و`FINISH_INDEX.json` و`step_info.json` متزامنة.
4. لا تُعدّل الملفات المولدة يدويًا؛ عدّل `TASK_STATE.json` فقط عبر الأداة.
