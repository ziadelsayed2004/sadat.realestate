# Unit cards and project affiliation in administrative review

Owner scope: improve the unit card pictured in the company/project profile and make the parent compound, developer and project links clear before accepting a submitted unit.

Implemented:

- White, compact unit cards with a fixed 4:3 media frame, sale/rental and kind badges, provider name, readable title, project affiliation and a clear details affordance. The project link remains clickable above the stretched property link.
- The review summary shows translated listing types and a named project/compound with its current status, plus the provider name and authorized navigation. Technical record identifiers remain available in a collapsed section.
- Review context is read by the server for administrative detail/action responses, including draft projects. Ownership is checked against account/profile/application aliases and the matching organization. A missing or foreign relationship produces an unavailable-association notice, never another organization's names.
- Administrative project/provider links require their corresponding view permissions. Public project links require a published project and publicly eligible organization. Provider reads do not receive administrative context; writes do not accept it.
- Review summaries retain the full portrait image inside their frame. Public-card photos fill their frame without changing its dimensions.

Verification:

- 31 focused API tests and 44 focused component tests passed, including Arabic/English review presentation, unpublished project links, foreign ownership rejection and legacy aliases.
- `node --import tsx scripts/verify-production-followup-local.mjs --unit-review` passed all 21 check groups on real local Mongo/API/media storage with Chromium and WebKit at 390/820/1440 px. Zero captured page errors; fixture cleanup completed. Evidence: [latest native result](guide-runs/unit-review-local-latest.json).
- The native variant repeats the previous goal's 19 regression groups, including office units, project association, delivery, PDFs, reporting, subscriptions/identity eligibility and multi-tab authenticated requests, logout and refresh replay revocation.
- The previous delivery at `63fc26bf` had passed its protected push and is present on GitHub. This follow-up retains its behavior and updates the requested card presentation.
- The normal protected push checks lint, types, the complete test suites and emitted bundle budgets on the committed snapshot. Final delivery is identified in git history and the final response.

The admin/developer operating guide and API response documentation have been updated. No production content, account type, subscription or approval state was changed. Production deployment remains a separate server update; these are local functional/browser results, not a claim that the private production review record was modified or inspected while signed in.
