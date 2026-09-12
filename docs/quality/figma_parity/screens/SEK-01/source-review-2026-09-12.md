# SEK-01 direct reference review — 2026-09-12

Source: canonical clone `Odl1Epn2u6lIEuIMmABT7o`, node `6027:3579`. Retrieved through Figma screenshot tool and visually inspected. Artifact: `figma-refresh-2026-09-12.png`, export 1024x682 from original 1551x1033.

The reference contains four summary cards; active request rows include property title, location, physical features, price and request reference; viewing rows show property identity, date/time and location; notification rows include status icons; a named profile/avatar appears in navigation and header.

Current source inspection (`apps/web/src/features/seeker/overview.tsx`) shows request type/status, abbreviated property/request identifier and update timestamp, not the reference's full property price/location/features. Viewing rows show abbreviated property identifier, timezone and date. The safe overview API projection does not provide the richer property object. This is a concrete source-level parity gap, separate from the avatar/name prerequisite recorded historically.

Do not fabricate reference sample identity, prices or addresses. Next: obtain Figma design context using the required design-to-code skill, inspect available request/property projection contracts, then capture current runtime at reference dimensions before implementing scoped changes. This source refresh is not runtime parity approval; the 90/119 count is unchanged. No styles changed in this review.
