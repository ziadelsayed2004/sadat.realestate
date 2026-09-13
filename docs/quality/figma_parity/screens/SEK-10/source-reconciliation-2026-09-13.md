# SEK-10 direct source reconciliation — 2026-09-13

The official Figma node `6027:6531` was read directly. The account-settings route now uses the source title and description, the 672px stacked-card composition, and the supported account controls for password changes and active-session inventory and revocation. The existing language selector remains because locale switching is a real product contract.

The source also shows email update, phone update, notification preferences, and account deletion. The current application contracts do not expose those mutations, so the runtime keeps email and notification settings visibly unavailable and does not invent phone or deletion behavior. Session content remains backed by the real sessions contract.

The session layout now contains Arabic and English dates without card overflow. Focused AR/EN responsive checks passed 2/2 at 1551, 768, and 393 pixels. Both updated visual baselines were subsequently verified without snapshot-update mode. Translation sync, client build and bundle budget, typecheck, lint, and `git diff --check` passed.

SEK-10 remains `PARTIAL_EXTERNAL` because the approved `/me` projection lacks seeker avatar/media and the missing settings mutation contracts prevent full source behavior. Strict totals remain 91/119 with 28 screens open. No Production launch or Demo purge ran.
