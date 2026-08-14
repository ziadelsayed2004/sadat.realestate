# Property categories and types

The permission-gated Admin API at `/api/v1/admin/property-categories` manages localized `category` and `type` records. Types require an existing category; categories cannot have parents. Stable lowercase slugs are globally unique, ordering is deterministic with slug tie-breaking, activation is explicit, lists are bounded, and updates/deletes require the current optimistic version and an audit reason.

`admin:taxonomy.view` permits lists. `admin:taxonomy.manage` permits create, update, reorder, activation, relationship changes, and guarded deletion. Categories with child types and taxonomy referenced by properties cannot be deleted. No production taxonomy is seeded; empty state and synthetic fixtures are supported.
