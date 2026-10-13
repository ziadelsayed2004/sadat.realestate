# Featured advertiser eligibility

The user authorized featured advertisements for every approved provider type on 2026-10-14. Eligible individual brokers, offices and developers are now available in the advertiser selector. Advertising eligibility requires a verified provider user, an approved application, a matching approved profile and a public display/business name. Directory subscriptions and commission acknowledgments are independent of this advertisement workflow. Private account-owner names are not substituted for a public display name.

Account discovery scans application batches until it has up to 100 distinct eligible accounts, rather than filtering only the first 100 applications. Published destinations remain scoped to the selected provider; draft, expired and foreign properties are not selectable. Restricted/deleted users, wrong-role accounts and unapproved or mismatched provider records cannot advertise.

Local browser verification created three synthetic providers, one per type, with published properties and no directory subscription or commission acknowledgment. Each account appeared in the selector, only its own property was offered, and the real UI saved a draft with an uploaded, decoded image. Arabic and English were exercised. Restricting the individual account removed it from choices and rejected its destination lookup. No responses were mocked; synthetic records, files, audit entries and sessions were removed.

The in-app explanation and exported administrator user guides were updated. Production account states were not changed and production deployment remains separate.
