# CMS platform, contact, and social data

`cms_settings` stores the platform, contact, and social namespaces as strict localized values. Supported content locales are `ar`, `en`, and `zh-CN`; interface translation keys remain separate. Social links are optional, bounded, ordered, and URL-validated. CMS values cannot contain credentials, passwords, tokens, private keys, or API keys.

Every mutation carries a bounded reason and optimistic version. `cms_setting_history` records actor, before/after values, status transitions, and timestamps. Only an explicitly `published` setting is eligible for a later public projection; draft and inactive values remain administrative.
