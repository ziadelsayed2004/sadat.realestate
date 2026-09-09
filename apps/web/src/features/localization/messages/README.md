# Editable interface copy

`ar.json` and `en.json` are the runtime source for static interface text across public, authentication, seeker, provider, and Admin screens.

- Edit values only. Keep every key and namespace in both files.
- Run `npm run translations:check --workspace @sadat-real-estate/web` after editing.
- Run `npm run translations:sync --workspace @sadat-real-estate/web` only after a developer adds or removes copy fields in TypeScript, then review both generated files before committing.
- Parameterized labels that format counts, pages, currency, or plural forms remain typed formatter functions beside their screen copy so numeric and plural rules are preserved.

Namespaces use `<feature>/<copy-file>#<getter>` so a text can be traced directly to its screen module.
