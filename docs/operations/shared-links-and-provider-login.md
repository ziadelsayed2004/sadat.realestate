# Shared links, developer login, and optional property amenities

## Verified locally

- Three isolated browser contexts per account role (seeker, provider, administrator): a sender, a signed-in recipient, and an anonymous recipient. Sharing the homepage or account URL never replaced the recipient's identity. Query/hash credentials and a forged browser session hint did not authenticate an anonymous recipient.
- The verifier uses real browser cookies, real API and SSR servers, Argon2 passwords, and an isolated MongoDB database. No mocked endpoints or production records are used. See `scripts/verify-shared-link-session-isolation-local.mjs` and its report under `docs/quality/guide-runs/`.
- Provider registration, pending review, approval, registered-password login after approval, and OTP password recovery for legacy providers missing a credential pass against isolated MongoDB. See `scripts/verify-provider-registration-guarantees-local.mjs`.
- Named property amenities save and remain optional in the Arabic mobile/desktop and English desktop browser checks. Real API requests also persisted selected choices and empty selections in MongoDB. The real catalog projection excludes inactive choices and private fields.

## Changes to deploy

API responses now default to `no-store`, including early errors; public projection routes keep their explicit public TTLs. Responses vary by Cookie and Authorization. Browser API fetches use `cache: no-store`. HTML carries CDN cache prevention and varies by locale/cookie. Both Nginx templates explicitly disable inherited proxy caching for application/API routes. Static assets retain their immutable caching.

OTP-verified password recovery now creates a credential when a legacy account has none, rather than permanently failing with an unmatched update. It still rejects unknown, rejected, and suspended accounts; no password is inferred or assigned automatically. Existing sessions are revoked on password recovery. Automated notification emails remain disabled; OTP delivery is unchanged.

## Production boundary

Read-only anonymous production probes on 2026-10-07 found no account token in homepage/account HTML, no session cookie issued by either link, and `/api/v1/me` returned 401. The current public amenity catalog returned 29 features and 12 services, and the public JavaScript includes the named-choice UI. These probes do not reproduce the customer's particular session or establish why the reported incident occurred. The referenced developer's database and password were not inspected or changed.

Deploy the reviewed code with the normal update command; do not seed or reset data. If an external CDN caches dynamic HTML/API responses, disable that rule and purge its existing cached dynamic pages. An already cached response is not invalidated just by adding new origin headers.

After deployment, diagnose the reported developer without printing credentials:

```bash
cd /opt/elsadatrealestate/current
node scripts/check-provider-login.mjs --env-file /etc/elsadatrealestate/production.env --provider-id 6ac666f2a727c0cd80a6e493
```

This command only reads account/application state and credential presence. If the credential is absent or the password is unknown, the account owner uses **Forgot password**, selects the provider role, verifies their own email OTP, and sets their own password. Do not store plaintext passwords or copy another user's browser cookies.

Final acceptance on production requires two separate browser profiles/devices: share the homepage and account URL; an anonymous recipient must be prompted to sign in, and an authenticated recipient must keep their own account. Then the developer verifies login after approval, and saves the referenced property's amenity choices (including no selections). These authenticated production checks remain pending operator/account-owner access.
