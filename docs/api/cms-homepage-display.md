# CMS homepage and display management

Homepage sections use stable logical keys, localized titles/bodies for `ar`, `en`, and `zh-CN`, deterministic non-negative ordering, explicit visibility, and draft/published/inactive state. The public projection includes only published and visible sections and sorts by `order`, then key. `previewHomepageSections` is an explicit administrative preview projection that includes drafts and visible/hidden state but excludes inactive records; it is not a public feed.

Display settings use a strict typed value (`boolean`, non-negative `number`, or short `text`) with independent publication state. Only published settings are returned by the public projection. Persistence schemas reject unknown fields and provide unique logical-key indexes plus publication indexes.

No production homepage content or display values are seeded here. Empty and draft states are safe until editorial content is supplied. Public homepage aggregation remains owned by the later homepage read-model task.
