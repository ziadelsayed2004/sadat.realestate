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

Extract tokens from Figma, make primitives direction-safe, and keep business logic out of components. Each applicable component supports loading, disabled, error, focus, RTL, and LTR variants.

## SEO

Use SSR, canonical links, locale-specific hreflang, truthful JSON-LD, sitemaps for published properties/developers/articles, and real 404 responses for unavailable resources.
