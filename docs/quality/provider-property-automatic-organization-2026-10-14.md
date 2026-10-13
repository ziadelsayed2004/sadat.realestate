# Automatic organization binding for property drafts

The basic property form no longer asks the provider to choose a source type or enter an internal organization ID. It explains that the organization is the office or company registered to the approved account, and displays the stored provider type after saving. Individual accounts require no organization.

The create API accepts omission of `source` and resolves the verified account, approved application and matching approved profile on the server. An office or developer is bound to its own approved organization through account/profile/application aliases. A missing organization is created from the approved business identity. Existing suspension or incompatible ownership is preserved and prevents creation. Supplied legacy source values must match the resolved identity; foreign organizations and source-type overrides are rejected. Persisted/public source contracts remain strict.

OpenAPI, Postman, endpoint blueprint, Arabic/English copy and the user catalog/account guides were updated.

Validation:

- Targeted property API tests cover automatic binding, all three provider types, legacy matching input, forged ownership, restricted/deleted accounts, missing approval, mismatched profiles and organization suspension.
- Basic wizard tests pass in Arabic and English without a source selector or organization ID field; a second save updates the existing draft.
- Real local MongoDB/API/browser run with no mocked responses created and updated drafts for individual, office and developer accounts. Stored source relationships matched each account; the office was tested on a 390px viewport with no horizontal overflow.
- Real API requests rejected a foreign organization and preserved a suspended office while blocking creation. The approved offices/developers required no manually entered organization IDs, directory subscription or commission acknowledgement to save a property draft.
- Synthetic accounts, credentials, sessions, organizations, properties and mutation audit records were removed after the run.
- Type checking, build/bundle budget, OpenAPI/Postman validation and API inventory audit passed. Full pre-push checks run against the committed change.

Local evidence: `.tmp/provider-source-real/result.json`, screenshots in `.tmp/provider-source-real/`, and targeted logs under `.tmp/provider-source-*`. No production deployment or production data changes were performed.
