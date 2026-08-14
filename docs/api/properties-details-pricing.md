# Property details, pricing, and payment plans

The property wizard accepts strict `details` and `price-payment` steps. Details support an optional localized description, a stable property-type reference, square-metre area, and bounded layout fields. Floor cannot exceed total floors, and all numeric values are finite and bounded.

Pricing stores a positive amount with an uppercase ISO-style three-letter currency code. Payment plans are structured schedules with localized names, bounded installment counts, an allowlisted frequency, and installment/down-payment money values. When plans are supplied, a price is required and every plan currency must match it. No exchange rates, financing approval, affordability, or financial performance is inferred. Drafts may leave these fields empty until completion; malformed or contradictory values are rejected.

Both steps use the existing provider ownership and optimistic-version boundary. Unknown fields and stale writes fail closed, and payment plans never contain credentials or secrets.
