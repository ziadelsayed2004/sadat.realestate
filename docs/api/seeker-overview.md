# Seeker overview

`GET /api/v1/seeker/overview` requires the authenticated seeker bearer token and returns real aggregate counts for requests, viewings, saved properties, notifications, and unread notifications.

The read model queries only seeker-owned records. Missing or empty request, viewing, favorite, or notification collections safely produce zero counts; no placeholder KPIs or fabricated activity are emitted. Internal IDs, message bodies, workflow metadata, and provider data are not returned.
