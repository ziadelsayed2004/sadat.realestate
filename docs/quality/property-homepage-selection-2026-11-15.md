# Homepage property selection save

The review-page selection control copied `AuthClient.getAuthorizationHeader` and `AuthClient.refresh` into another object. These methods require the original AuthClient receiver. The first credentials read therefore threw before the PUT request reached the API, causing both selecting and removing a property to show the same generic failure.

The control now delegates both methods through closures on the original session object and lets the existing session client attach the current authorization header and renew once on 401. Successful saves still replace the parent property with the version returned by the API. Failed saves preserve the requested checkbox value, report an alert, and distinguish forbidden access, stale property versions and session failures. No property publication, expiry, permission or homepage-selection rules were changed.

Verification:

- Reproduced the failure against the previous build with the actual browser AuthClient: no selection PUT completed.
- 31 focused interface tests passed, including receiver-dependent credential reads/refresh, current version payloads, and failure paths without false success or replay.
- Four browser workflows passed on desktop/mobile, Arabic/English: unselect an existing featured property, renew an expired session during the save, reload to verify removal, select again, and reload to verify the saved selection.
- Web type checking, lint for changed TypeScript files, production client/server build and existing bundle budgets passed. Full unrelated suites were not rerun.

Browser/API responses in these tests are isolated fixtures. No live property records were changed from this workspace. Activate the fix with the regular production update command.
