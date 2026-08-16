# Frontend Architecture

## Rendering Strategy

- Public routes use Vite SSR and hydration because property, article, and developer pages require SEO and real HTML.
- Auth routes use responsive client behavior within the SSR shell as needed.
- Seeker, Provider, and Admin use protected SPA route groups and are desktop-only in the current approved design scope.

## Organization

- Route modules lazy-load feature boundaries.
- Server state uses a query client; form state stays local. Do not add a global store without a concrete need.
- API client and generated types come from `packages/contracts`.
- Permission gates consume backend `availableActions`; they never infer authorization from colors or labels.
- Keep route shapes stable where possible; localize content and metadata by locale.

## Design System

The approved foundation uses Cairo, Deep Green `#0F4A3B`, Deep Navy `#17233D`, Premium Gold `#D1A044`, Warm Off-White `#FAF8F2`, Soft Sand `#F3E8D0`, and the semantic status colors recorded in `09_sources/DESIGN_SOURCE_MANIFEST.json`. Runtime variables live in `apps/web/src/features/design_system/tokens.css` and their typed mirror lives in `tokens.ts`; parity is tested.

The approved logo is a same-origin public asset. DOT Studio artwork is supplier identity and must never be used as the product logo. Components must be direction-safe and keep business logic outside presentation primitives. Each applicable component supports loading, disabled, error, focus, RTL, and LTR variants.

Every screen implementation must resolve its local final export from the design-source manifest before relying on external Figma or Drive availability.

## SEO

Use SSR, canonical links, locale-specific hreflang, truthful JSON-LD, sitemaps for published properties/developers/articles, and real 404 responses for unavailable resources.
