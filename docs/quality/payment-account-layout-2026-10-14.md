# Payment account layout — 2026-10-14

The provider advertising detail combined the provider definition grid with the administrator detail list. Each account inherited a horizontal label/value layout inside a narrow grid column, causing labels to collide with names and account numbers to wrap prematurely.

`PaymentAccounts` now owns its styles. Each card places its label above the account holder and transfer account, isolates mixed-direction names, and preserves left-to-right account numbers. Columns adapt to the available container width; narrow cards stack. The same component serves administrator payment review. Stored payment data and workflow remain unchanged.

Validation:

- Reproduced the original overlap with a synthetic approved transfer through the local browser, API and MongoDB, without mocked responses.
- Verified provider advertising detail and administrator proof detail at Arabic 1440, 768 and 390 pixels, and English 390 pixels. Checked full labels/names/accounts, label-above-value geometry and absence of card overflow; inspected desktop and mobile screenshots.
- Removed the synthetic user, request, proof, credentials, profiles and test sessions after verification.
- Existing provider advertising and administrator advertising suites: 60 tests passed.
- Production build and existing bundle budgets passed.

Local evidence: `.tmp/payment-accounts-real/result.json`, screenshots in the same directory, `.tmp/payment-accounts-tests.log`, and `.tmp/payment-accounts-local.log`. No production data was modified or deployed.
