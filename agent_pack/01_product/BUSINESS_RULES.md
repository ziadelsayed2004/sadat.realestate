# Business Rules

| ID | القاعدة | Enforcement |
|---|---|---|
| BR-001 | مصدر كل عقار منشور واضح | Model + publish validation + projections |
| BR-002 | Verified Badge لاعتماد حقيقي فقط | Backend-derived flag |
| BR-003 | المقارنة عنصران فقط | API validation + UI guard |
| BR-004 | الباحث لا يرى internal notes/assignment/audit | Projection + negative tests |
| BR-005 | إجراءات الرفض/الاستكمال/الإيقاف الحساسة تحتاج سببًا | Validation + audit |
| BR-006 | الإجراء غير المسموح لا يظهر أو يكون View Only | RBAC + availableActions + UI |
| BR-007 | إثبات الدفع مراجعة يدوية ولا يعني تحققًا بنكيًا | State machine + copy |
| BR-008 | لا سعر إعلان ثابت عام | Quote workflow |
| BR-009 | العمولة ليست Universal hardcode | Policy resolver |
| BR-010 | المحتوى العام Published فقط | Query scopes |
| BR-011 | المستندات وإثباتات الدفع لا تستخدم public permanent URLs | Private storage gateway |
| BR-012 | AR RTL وEN/ZH-CN LTR بنفس العقود | i18n contracts |
| BR-013 | لا AI/حكومة/بنك/ملكية تلقائي دون Integration حقيقي | Product guardrail |
| BR-014 | لا أرقام تشغيلية وهمية في Production | Data source + tests |
| BR-015 | Screen ID مرجع QA وليس اسم route إلزاميًا | Coverage matrix |
