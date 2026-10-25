# Rounded labels and floating public menu — 2026-10-25

The homepage question/article labels and featured advertising badge referenced an undefined `--radius-pill` token. They now use the existing `--radius-full` design token, including the comparison control that shared that reference. Article category overlays on the article listing also use the same rounded treatment. Existing shared badges and community category labels were already rounded.

The public mobile navigation is now an inset, rounded panel with a translucent white surface, backdrop blur, a soft shadow and a lighter menu heading. Its height follows its content and is capped by the available viewport, including safe-area spacing. Short screens scroll within the panel. Existing routes, locale/account actions, scroll locking, Escape/backdrop closing, desktop breakpoint behavior and reduced-motion support are retained.

Validation: 68 focused homepage/article/community component tests passed. Read-only native Chromium/WebKit verification passed 20 Arabic/English viewport/interaction groups, including 320/390/700 px menus, a 360 px tall viewport, desktop resizing, rounded homepage/listing labels, a computed advertising-badge CSS probe, safe panel bounds, internal scrolling, Escape/backdrop closing and reduced motion. No API responses were mocked, no database records were written and no browser page errors were captured. See [local results](guide-runs/rounded-menu-local-latest.json). The production build and existing bundle limits also passed.

Only public navigation presentation and rounded label styles changed; administrative/provider sidebar layouts and production data were not modified.
