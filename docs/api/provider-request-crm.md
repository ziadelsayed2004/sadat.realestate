# Provider Request CRM

Provider request list, detail, and lifecycle actions are scoped to requests owned by the authenticated provider. A provider cannot read or transition another provider's request, and lifecycle changes use optimistic versions and the same strict transition rules as administrative operations.
