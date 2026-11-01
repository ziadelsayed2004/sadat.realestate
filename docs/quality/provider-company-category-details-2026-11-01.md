# Provider company editing, category selection and detail links

User goal: edit company names and descriptions from administrator provider
details; choose a residential/commercial or other administrator-managed property
category; open a published property from its dashboard detail link.

Company profile editing now exposes Arabic and English names and descriptions
together. A meaningful editable audit reason is prefilled so the save action is
usable immediately. Version checks, server authorization and audit recording
remain in force; legal registration fields and provider approval are unchanged.
Saving text does not resubmit or clear company images.

The location step explains where to choose category/type and links to the exact
property details step. The public type catalog retains its immutable category ID;
the provider selector displays category names from the same catalog, filters types
by that category, and clears an incompatible type when the category changes.
Saving retains the existing propertyTypeId contract: the category is derived from
the administrator-managed type, without duplicating category state on properties.
Empty inventory does not remove taxonomy choices.

The existing bare `/provider/properties/:id` URL now renders the authenticated
published-state screen and its public slug link. Reads still use the private
owner-scoped endpoint with the published view. A missing or unauthorized property
does not become a public listing through this alias.

Focused verification: 71 web tests and five API search tests pass, including edits
to both company descriptions, text-only saves, type/category preservation with no
inventory, location guidance, category switching and the bare published route in
both languages. Web type checking and the production build pass. Four browser
scenarios pass on desktop/mobile in Arabic/English, covering the bare published
URL, location-to-details navigation, category filtering and saving its child type.
Full release checks are required before push. Aggregate JavaScript grows by 1,882 bytes; a bounded two KiB
allowance covers the added category UI and guidance, with route CSS and per-chunk
caps unchanged.
