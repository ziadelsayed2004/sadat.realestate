# Target Monorepo Structure

```text
repo/
├─ apps/
│  ├─ api/                  # Express 5 + TypeScript + Mongoose
│  │  ├─ src/app.ts
│  │  ├─ src/server.ts
│  │  ├─ src/config/
│  │  ├─ src/database/
│  │  ├─ src/modules/       # domain modules
│  │  ├─ src/shared/        # middleware/errors/logging/storage/events
│  │  └─ tests/
│  └─ web/                  # React + TS + Vite SSR
│     ├─ src/app/
│     ├─ src/routes/
│     ├─ src/features/
│     ├─ src/components/
│     ├─ src/i18n/
│     ├─ src/styles/
│     ├─ server/            # SSR entry/runtime
│     └─ tests/
├─ packages/
│  ├─ contracts/            # schemas/DTO/client types
│  ├─ ui/                   # shared design-system components
│  └─ config/               # ts/eslint/test shared config
├─ docs/
│  ├─ api/
│  ├─ architecture/
│  ├─ security/
│  └─ runbooks/
├─ infra/
│  ├─ docker/
│  └─ deployment/
├─ agent_pack/
├─ package.json
└─ README.md
```

## Boundaries

- module يملك model/repository/service/controller/routes/policies/tests الخاصة به.
- controllers لا تحمل business logic، وmodels لا تستدعي HTTP providers.
- contracts لا تستورد runtime من api/web.
- web لا يستورد Mongoose models؛ يستهلك DTOs فقط.
- لا `utils` عامة مبهمة؛ استخدم shared capability محددة الاسم.
