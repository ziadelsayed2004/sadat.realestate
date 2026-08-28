# Property drafts and wizard steps

Verified providers can create a property draft, read only their own draft, and save the `basic` or `location` wizard step. The provider subject is the ownership boundary; a different provider, a pending provider, or an unauthenticated caller cannot read or mutate the record.

Every step includes the current nonnegative `version` and a bounded reason. Updates use a compare-and-set on that version, so stale or concurrent writes return a conflict without overwriting the winner. Drafts may remain incomplete while the provider resumes the wizard. Basic data uses strict localized content, stable slugs, transaction type, and project/unit relationships. Location data may use an active location reference, bounded latitude/longitude values, or an absolute HTTPS `mapUrl` up to 2048 characters; at least one location source must remain available. The server never fetches, geocodes, or synthesizes a map URL. Unknown fields, unsupported steps, invalid coordinates, unsafe URLs, and malformed IDs are rejected.

The API artifacts document only the three routes implemented by this task. Public listing, submission, review, publication, media, and later provider/admin management remain owned by their dependency-ready B3 tasks.
