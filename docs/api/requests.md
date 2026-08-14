# Requests API

Request creation uses a discriminated `type` and strict payload schemas for contact, property-search, viewing, and provider-customer requests. State, assignee, SLA, internal notes, and audit metadata are server-owned.

Seeker routes return only the current seeker's requests. Provider customer routes are provider-owned, and administrative routes require an authenticated administrator. State changes require the current optimistic `expectedVersion`; sensitive transitions require a reason. Empty collections are returned with bounded pagination rather than fabricated metrics.
