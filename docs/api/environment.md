# API environment configuration

The API validates `APP_ENV`, `API_HOST`, `API_PORT`, `MONGODB_URI`, authentication secrets, email OTP, and private-upload settings. The process manager supplies values; the application never searches for or prints a secret file.

Local uses `.env.local` through the native supervisor and requires an installed MongoDB service or isolated non-production Atlas `MONGODB_URI`; the supervisor never downloads MongoDB or starts Docker. Explicit process-environment overrides are supported for CI and one-off diagnostics without rewriting `.env.local`. Production system services read `/etc/elsadatrealestate/production.env`. Example files are templates, never credential stores.

Production bindings are loopback-only. The MongoDB URI must use authenticated `rs0` topology. Hostinger email uses `smtp.hostinger.com`, port 465 implicit TLS, full username `info@elsadatrealestate.com`, and a mailbox password supplied only on the VPS. Port 587 with STARTTLS is the approved fallback.

Local OTP is delivered into the native catcher at `http://localhost:8025`. Preview/UAT/Production require authenticated SMTP and fail readiness when verification fails.

Protected environments require private filesystem configuration, a distinct download-signing secret, and native ClamAV on loopback. Diagnostics expose readiness modes only; they never expose MongoDB URI, passwords, tokens, OTP values, or signing material.
