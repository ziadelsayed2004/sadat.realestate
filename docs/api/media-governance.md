# File and asset governance

Media metadata is governed independently from binary storage. Public assets use the `public` namespace; private assets use `private`, and new uploads use the private `quarantine` namespace until validation and scanning complete. A storage key is server-generated and opaque (`<namespace>/<32-hex-token>`). User filenames are display metadata only: path components and control characters are removed and the result is capped at 120 characters.

Property media remains owner-scoped while a property is editable. Public projections include only active, ready media attached to a published and active property. Provider documents, payment proofs, and other private assets never receive a permanent public URL or public namespace. Missing storage or scanner configuration fails closed.

The shared cleanup planner applies the approved binary retention schedule:

- unattached incomplete and infected uploads: 24 hours;
- abandoned drafts: 90 days after the reference activity;
- superseded versions: 30 days;
- rejected or withdrawn applications: 180 days;
- approved application assets after account closure: 365 days.

An explicit legal/compliance hold (actor, reason, and start time) always suppresses cleanup. A candidate without an attachment and without a reason is treated as an incomplete orphan; an attached candidate without a reason is retained until its owning workflow supplies one. Cleanup is deterministic by asset ID, revokes access by writing a deleted tombstone before deleting bytes, and can be retried safely. The planner is adapter-driven; no production storage or database operation is implied by local tests.
