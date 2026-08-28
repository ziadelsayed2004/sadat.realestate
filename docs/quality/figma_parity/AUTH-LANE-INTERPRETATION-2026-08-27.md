# Auth lane interpretation and verification

Date: 2026-08-27  
Closure: `REPAIRED_VERIFIED` for the email-only migration and alias behavior; `VERIFIED_NO_CHANGE` for unchanged Admin login and provider-type selection states.

## Evidence authority

The active visual authority is the canonical Figma clone recorded by the local queue:

- file key: `Odl1Epn2u6lIEuIMmABT7o`
- page: `6017:4353`
- forbidden historical file key: `0HBdTNGROmmpC6S7OYa3iJ`
- local canonical exports: `docs/quality/figma_parity/screens/AUTH-*/figma.png`

Each screen was captured with a deterministic non-production browser fixture. The fixture intercepts API responses; it does not write production data. Runtime evidence includes before/after captures, image diffs, metrics, deterministic state, accessibility checks, interaction/API request evidence, and review JSON in the screen directory.

## Active interpretation of conflicting evidence

`AUTH-04` and `AUTH-05` are labeled as email verification in the local screen registry, but the canonical export and the queue's historical runtime route still show the retired phone-verification presentation (`/auth/verify-phone`). The supplementary local phone image is also historical evidence. Neither is treated as the active identity contract.

The active contract is:

1. `/auth/verify-email` is the only verification form.
2. Seeker and Provider registration is email-only and passwordless.
3. OTP send accepts exactly `email`, `roleType`, and `purpose`; OTP verify adds exactly `challengeId` and `code`.
4. `/auth/verify-phone` is a browser-only redirect to `/auth/verify-email`. It preserves approved registration parameters, strips phone identity data, renders no phone control, and never accepts phone OTP.
5. Provider WhatsApp and secondary phone fields remain contact/business data only. They are not identity or OTP inputs.
6. `AUTH-01` Admin email/password behavior remains outside this email-only registration goal.

This interpretation preserves provenance for the historical assets without allowing a stale screenshot, export, route label, or phone field to reintroduce a phone identity contract.

## Screen coverage

| Screen | Canonical node | Queue route | Active route/state | Closure |
| --- | --- | --- | --- | --- |
| AUTH-01 | 6017:16212 | `/auth/login` | Admin email/password login (out of migration scope) | VERIFIED_NO_CHANGE |
| AUTH-02 | 6017:15835 | `/auth/register/seeker` | Seeker registration default | REPAIRED_VERIFIED |
| AUTH-03 | 6017:15890 | `/auth/register/seeker` | Seeker details after verified email | REPAIRED_VERIFIED |
| AUTH-04 | 6017:15993 | `/auth/verify-phone` (historical queue label) | `/auth/verify-email`, email OTP form | REPAIRED_VERIFIED |
| AUTH-05 | 6017:16113 | `/auth/verify-phone` (historical queue label) | `/auth/verify-email`, OTP entry state | REPAIRED_VERIFIED |
| AUTH-06 | 6017:16158 | `/auth/register/seeker/success` | Seeker registration success | REPAIRED_VERIFIED |
| AUTH-07 | 6017:16275 | `/auth/register/provider/type` | Provider type default | VERIFIED_NO_CHANGE |
| AUTH-08 | 6017:16352 | `/auth/register/provider/type` | Provider type selected | VERIFIED_NO_CHANGE |
| AUTH-09 | 6017:16432 | `/auth/register/provider/account` | Provider account default | REPAIRED_VERIFIED |
| AUTH-09+ | 6017:16630 | `/auth/register/provider/account` | Provider account filled/contact state | REPAIRED_VERIFIED |
| AUTH-10 | 6017:16843 | `/auth/register/provider/business` | Provider business default | REPAIRED_VERIFIED |
| AUTH-10+ | 6017:17120 | `/auth/register/provider/business` | Provider business filled state | REPAIRED_VERIFIED |
| AUTH-11 | 6017:17441 | `/auth/register/provider/company` | Provider company details | REPAIRED_VERIFIED |
| AUTH-12 | 6017:17706 | `/auth/register/provider/documents` | Provider documents | REPAIRED_VERIFIED |
| AUTH-13 | 6017:17975 | `/auth/register/provider/review` | Review draft | REPAIRED_VERIFIED |
| AUTH-14 | 6017:18418 | `/provider-application/status` | Pending review | REPAIRED_VERIFIED |
| AUTH-15 | 6017:18529 | `/provider-application/status` | Application tracking | REPAIRED_VERIFIED |
| AUTH-16 | 6017:18651 | `/provider-application/needs-information` | Needs information | REPAIRED_VERIFIED |
| AUTH-17 | 6017:18822 | `/provider-application/approved` | Approved | REPAIRED_VERIFIED |

## Responsive and locale verification

The final `v2` matrix was captured for all 19 screen IDs in English and Arabic at the Playwright Desktop Chrome, Galaxy Tab S4, and Pixel 5 presets: 114 responsive captures. Every matrix record reports the expected screen, locale direction (`ltr`/`rtl`), language, no horizontal overflow, responsive tablet/mobile viewport, and an active URL without phone identity data.

The standard final captures cover both English and Arabic at the deterministic desktop viewport. Arabic output uses RTL document direction and English output uses LTR document direction. The canonical exports that contain retired phone/password fields or richer historical provider data remain useful as provenance and visual diagnostics; they are not evidence for restoring those fields to the active contract.

## Alias evidence

`docs/quality/figma_parity/auth_lane/legacy-verify-phone-en.json` and `legacy-verify-phone-ar.json` verify the browser-only alias. Both records confirm:

- final pathname `/auth/verify-email`
- approved `lang`, `purpose`, and `roleType` parameters preserved
- phone query data removed
- no phone control or phone identity text rendered
- `AUTH-04` email OTP form rendered
- locale direction matches the requested locale

## Verification command

The Auth-only capture utility is `scripts/capture-auth-lane.mjs`. The final evidence was generated against `http://127.0.0.1:4180` with the app's source-backed development server and the following phases:

```text
node scripts/capture-auth-lane.mjs --all --phase before --locale en --base-url http://127.0.0.1:4180
node scripts/capture-auth-lane.mjs --all --phase before --locale ar --base-url http://127.0.0.1:4180
node scripts/capture-auth-lane.mjs --all --phase after --revision v2 --locale en --base-url http://127.0.0.1:4180
node scripts/capture-auth-lane.mjs --all --phase after --revision v2 --locale ar --base-url http://127.0.0.1:4180
node scripts/capture-auth-lane.mjs --matrix --phase after --revision v2 --locale en --base-url http://127.0.0.1:4180
node scripts/capture-auth-lane.mjs --matrix --phase after --revision v2 --locale ar --base-url http://127.0.0.1:4180
node scripts/capture-auth-lane.mjs --alias --locale en --base-url http://127.0.0.1:4180
node scripts/capture-auth-lane.mjs --alias --locale ar --base-url http://127.0.0.1:4180
```

