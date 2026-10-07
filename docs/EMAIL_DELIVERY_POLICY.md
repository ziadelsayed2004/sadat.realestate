# Email delivery scope

Owner decision confirmed on 2026-10-07 (Africa/Cairo): application email is limited to OTP verification codes.

- Keep the existing OTP email delivery and its SMTP configuration.
- Account activation, suspension, rejection and requests for more information use in-app notifications only.
- Viewing, customer request and advertising updates use in-app notifications only.
- Do not add email automation or an email subscription for these updates. The previous $75 / $200 proposals are cancelled.

The application mail transport is in `apps/api/src/modules/auth/otp-provider.ts`. Account, viewing, request and advertising modules persist notifications without invoking it. Status email automation was not implemented before this decision.

`scripts/smtp-smoke.mjs` is an explicit operator diagnostic, not a customer notification workflow. No diagnostic email was sent while applying this decision.
