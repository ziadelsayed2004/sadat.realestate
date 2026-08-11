# Frontend Architecture

## Rendering Strategy

- Public routes: Vite SSR + hydration لأن property/article/developer pages تحتاج SEO وHTML فعلي.
- Auth: responsive CSR داخل SSR shell حسب الحاجة.
- Seeker/Provider/Admin: protected SPA route groups، Desktop فقط حسب التصميم الحالي.

## Organization

- route modules تحمّل feature boundaries lazy.
- server state عبر Query client؛ form state محلي؛ لا global store شامل بلا داعٍ.
- API client/generated types من `packages/contracts`.
- permission gate يعتمد على backend `availableActions` ولا يفترض الدور من اللون أو النص.
- localized routes ثابتة قدر الإمكان، والمحتوى/metadata بحسب locale.

## Design System

Tokens من Figma، primitives direction-safe، components لا تحتوي business logic. كل component له loading/disabled/error/focus/RTL/LTR variants عند الحاجة.

## SEO

SSR، canonical، hreflang للغات، JSON-LD مناسب دون بيانات مخترعة، sitemap للعقارات/المطورين/المقالات المنشورة، و404 حقيقي للعناصر غير المتاحة.
