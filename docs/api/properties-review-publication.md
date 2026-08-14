# Property review and publication

Verified administrators use the review endpoint to move a submitted property to `needs_changes`, `approved`, `rejected`, or (after approval) `published`:

`POST /api/v1/admin/properties/:propertyId/review`

The strict body contains the current `version`, an `action`, and a mandatory human-readable `reason`. Review actions are permission checked (`admin:properties.review`), optimistic-concurrency guarded, and written to the audit log.

Visibility is managed independently through:

`POST /api/v1/admin/properties/:propertyId/visibility`

The action is `hide`, `restore`, or `archive` and requires `admin:properties.manage` plus the current version and a reason. Hidden and archived records are inactive and therefore excluded from public projections; restore returns a hidden record to published visibility.

Property writes also append immutable before/after snapshots to the shared audit log in the same transaction. Provider edits are accepted only for `draft` and `needs_changes` records, so an already published public version cannot be silently overwritten; its reviewable history remains available through the audit projection.

Potential duplicate review is explicit and deterministic at `GET /api/v1/admin/properties/possible-duplicates?propertyId=...`. It reports only exact slug, same location/transaction, or normalized localized-name signals with explanations. The endpoint is a review aid, not an AI or automatic merge decision.
