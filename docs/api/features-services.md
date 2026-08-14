# Features and services

The Admin `/api/v1/admin/features` API manages localized `feature` and `service` records. Each record has a stable logical `groupKey`, unique slug, deterministic order, activation state, and optimistic version. Lists are bounded and filter by kind, group, activation, or localized search. View and mutation permissions are `admin:features.view` and `admin:features.manage`.

Mutations require a reason and append audit evidence. Deletion fails closed when a property or project references the record. The runtime provides the stable IDs later property/project tasks will link to; it does not create those future aggregates or fabricate production master data.
