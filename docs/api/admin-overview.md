# Admin overview

The planned `GET /api/v1/admin/overview` projection accepts an explicit ISO-8601 `from`/`to` range (maximum 366 days) and requires a verified administrator with `admin:overview.view`. The response contains only the documented aggregation fields: users, seekers, providers, verified providers, published properties, open requests, and pending reviews, plus the requested range and generation timestamp.

The service consumes an aggregation adapter and validates its output strictly. It does not seed, estimate, or fabricate KPI values, financial totals, population numbers, or operational claims. The current runtime has no persistent overview repository or HTTP composition, so the service is an adapter boundary and the planned route remains uncomposed until those dependencies are wired.
