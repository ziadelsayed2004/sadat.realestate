# Viewings API

Viewing creation requires only a published property ID. `requestedAt` is optional: an omitted appointment remains absent from storage, API responses and notifications, and is displayed as “To be arranged”. `timezone` defaults to `Africa/Cairo`. If supplied, the appointment must be in the future within 366 days and use a valid IANA timezone.

`contactPhone` is optional and accepts Egyptian mobile numbers or international numbers, normalized to E.164. `contactMethod` selects `phone` or `whatsapp`, defaulting to `phone` when a number is supplied. The explicit contact number overrides the account number for this request; the method and number are exposed only to the customer, authorized administrators and developers allowed by the current customer identity policy. Offices and individuals cannot access either field. No appointment is invented from the creation time.

An undated request can be cancelled or assigned an appointment through reschedule, but cannot be confirmed or completed until it has a date. The platform does not claim a guaranteed slot; eligible developers or authorized administrators confirm or reschedule explicitly. Seeker edits and cancellation are ownership-scoped and require the current optimistic version. An explicit reschedule still requires a valid future date and timezone.
