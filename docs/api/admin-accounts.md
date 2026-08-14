# Administrator account foundation

`backend_016` preserves the existing Admin authentication contract: Admin users sign in through `POST /api/v1/auth/login` with a normalized email address and an Admin-only password. Passwords are stored only as Argon2id hashes in `admin_credentials`; successful authentication uses the shared access-token and rotating opaque-refresh session model.

## First Super Admin bootstrap

The first Super Admin is created only by the explicit internal `npm run admin:bootstrap --workspace apps/api` command. There is no public or unauthenticated HTTP bootstrap route.

The command requires `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_BOOTSTRAP_CONFIRMATION=CREATE_FIRST_SUPER_ADMIN`, and optional `ADMIN_BOOTSTRAP_LOCALE` (`ar`, `en`, or `zh-CN`) through the process environment. These values must be supplied by an approved secret-injection mechanism, must not be committed to `.env` examples, and are never printed. The password is 12–128 characters, rejects control characters, and is hashed with the existing Argon2id policy before persistence.

Bootstrap runs in a MongoDB transaction and refuses to write when either the one-time bootstrap guard or any Admin identity already exists. Unique indexes on the canonical guard and bootstrapped user make concurrent attempts fail closed. The transaction creates the verified Admin identity, Admin profile, Argon2id credential, and immutable first-Super-Admin guard together, so partial account creation is not accepted.

The command emits only the created Admin identifier on success and a stable redacted failure classification otherwise. It never emits the email, password, hash, MongoDB URI, or connection details.

## RBAC and scope boundary

Dynamic roles, strict capability selection, View Only enforcement, effective-permission resolution, and the internal administrator-role assignment boundary are implemented by `backend_017` and documented in `rbac.md`. Complete administrator list, detail, create, update, disable, assignment-route integration, self-lockout, and last-Super-Admin protections remain owned by `backend_121`; those planned administrator routes are not documented as active here.

Reason-bearing non-Admin account state transitions and Provider application review are implemented by `backend_019` and documented in `account-states.md`. The account transition endpoint rejects Admin targets and self-transitions, so it cannot bypass the administrator-lifecycle safeguards reserved for `backend_121`.
