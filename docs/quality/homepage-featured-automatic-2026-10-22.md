# Automatic homepage property selection

The previous control required a numeric order while the homepage displayed only three properties. Saving a property with a larger order could succeed without putting it in those three slots. The homepage also re-sorted equally ranked properties by slug, losing the repository's recency order.

The control now omits numeric order. Saving a selection records a server timestamp and puts the latest eligible selection first. Unfilled slots use the most recently updated published properties. Legacy order remains accepted as metadata for older clients, but no longer determines homepage placement. Existing selections remain selected. Publication, activation and expiry requirements remain enforced; selecting a property does not publish or renew it.

Save feedback distinguishes an eligible selection, a saved selection awaiting publication/renewal, and removal of a selection. Eligible selected properties have a direct homepage link.

Validation:

- API homepage suite: 13 passing tests, including more than three older selected properties and automatic fallback ordering.
- Admin property UI suite: 23 passing tests, including saving without an order and truthful draft/expired feedback.
- `node scripts/verify-homepage-featured-local.mjs`: real local MongoDB and HTTP requests; Chromium Arabic at 390px and WebKit English at 1440px. Reproduces the original missing-slot scenario, verifies newest selection first in the real homepage, stale-write rejection, expiry exclusion, and no horizontal overflow. Fixtures and their audits are removed.
- Result: `docs/quality/guide-runs/homepage-featured-local-latest.json`.

No production data was changed by these checks.
