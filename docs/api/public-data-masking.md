# Public and seeker data masking

Public and seeker routes project from explicit contracts rather than returning persisted documents. Homepage, property details/search/compare, organization directory, saved properties, seeker profile/preferences/overview, and notifications each build an allowlisted response; unknown source fields are never spread into the response.

The security regression matrix asserts that internal notes, assignments, provider documents, audit records, credentials, password material, storage keys, signed URLs, and access tokens do not appear in these projections. Public reads additionally require published and active state where the owning contract defines it. Seeker reads and mutations derive ownership from the authenticated subject, so another recipient's private notification or saved property cannot be selected by caller-supplied ownership fields.

Property media metadata remains limited to the approved public media contract. Private provider-application documents and their storage/download internals remain outside all public and seeker projections.

Public articles use an explicit projection and require both `article.status = published` and an active category. They expose localized content, safe SEO values, optional governed cover-asset identity, publication time, and public category metadata only. Author IDs, workflow state, optimistic versions, available actions, audit snapshots, and administrator mutation reasons remain private.
