# Target Monorepo Structure

```text
repo/
|- apps/
|  |- api/                  # Express 5 + TypeScript + Mongoose
|  |  |- src/app.ts
|  |  |- src/server.ts
|  |  |- src/config/
|  |  |- src/database/
|  |  |- src/modules/       # Domain modules
|  |  |- src/shared/        # Middleware, errors, logging, storage, events
|  |  `- tests/
|  `- web/                  # React + TypeScript + Vite SSR
|     |- src/app/
|     |- src/routes/
|     |- src/features/
|     |- src/components/
|     |- src/i18n/
|     |- src/styles/
|     |- server/            # SSR entry and runtime
|     `- tests/
|- packages/
|  |- contracts/            # Schemas, DTOs, client types
|  |- ui/                   # Shared design-system components
|  `- config/               # Shared TypeScript, lint, and test config
|- docs/
|  |- api/
|  |- architecture/
|  |- security/
|  `- runbooks/
|- infra/
|  |- native/
|  |- nginx/
|  |- systemd/
|  |- mongodb/
|  `- clamav/
|  `- deployment/
|- agent_pack/
|- package.json
`- README.md
```

## Boundaries

- Each module owns its models, repositories, services, controllers, routes, policies, and tests.
- Controllers do not contain business logic, and models do not call HTTP providers.
- Contracts do not import runtime code from API or web packages.
- The web app does not import Mongoose models; it consumes DTOs only.
- Avoid ambiguous global `utils`; use explicitly named shared capabilities.
