# SEO and public privacy settings

SEO settings are strict localized values for title and description, a validated canonical URL, and an explicit robots directive. They use draft, published, and inactive states; only published settings are projected publicly. No default domain or fabricated copy is inserted.

Privacy policies are localized, versioned records keyed by a stable logical key. A policy is public only when published and effective; drafts, inactive records, and published records without an effective timestamp remain unavailable. These settings contain editorial policy text only and reject unknown fields. Credentials, tokens, private keys, and other secrets are not part of the contract.

No HTTP routes are added because the current runtime has no settings router; later route tasks own transport wiring. Empty and draft states are safe while final legal/SEO copy is unavailable.
