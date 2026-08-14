# Locations and neighborhoods

The Admin location API is mounted under `/api/v1/admin/locations`. Every route requires a verified Admin access token and returns `Cache-Control: no-store`.

| Route | Permission | Behavior |
|---|---|---|
| `GET /api/v1/admin/locations` | `admin:locations.view` | Bounded list with allowlisted kind, parent, activation, text-search, sort, direction, page, and limit controls. |
| `POST /api/v1/admin/locations` | `admin:locations.manage` | Creates a top-level location or child neighborhood with localized name, stable unique slug, optional coordinates, order, and activation state. |
| `PATCH /api/v1/admin/locations/:locationId` | `admin:locations.manage` | Optimistically updates name, slug, neighborhood parent, coordinates, order, or activation. |
| `DELETE /api/v1/admin/locations/:locationId` | `admin:locations.manage` | Optimistically deletes only when no child neighborhood or Provider application references the resource. |

Top-level locations cannot have a parent. Neighborhoods require an existing top-level location and may be moved only to another existing top-level location. Slugs use lowercase ASCII segments separated by single hyphens. Coordinates are optional latitude/longitude values and are stored internally as a GeoJSON point in longitude/latitude order.

All mutations require a reason and append an audit record in the same MongoDB transaction. Duplicate slugs, stale versions, invalid hierarchy, missing records, and referenced deletion return stable errors. View-only administrators receive no mutation actions in projections.

The collection has a unique slug index, a hierarchy/activation/order index with slug tie-breaking, a localized-name text index, and a sparse 2dsphere coordinate index. No production locations or coordinates are seeded by this task; empty and synthetic test states remain valid.
