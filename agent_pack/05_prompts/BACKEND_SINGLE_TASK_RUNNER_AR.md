# Backend Runner

استخدم الـMaster Runner. في مهام Backend تحديدًا:

- API under `/api/v1`، validation/runtime schemas، explicit projections.
- كل route حساس يحتاج Auth/RBAC/Ownership/Validation/Rate limit المناسب.
- أضف positive + unauthenticated + unauthorized/IDOR + validation + invalid state tests.
- لا تبدأ Frontend حتى `backend_138` complete.
- لا توثّق endpoint planned كأنه active.
