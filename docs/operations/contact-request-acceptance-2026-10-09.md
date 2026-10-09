# Accepting contact requests under review

Administrators with `admin:requests.manage` can accept a contact request directly from `under_review` using the existing `start_progress` transition. Its resulting state is `in_progress` (قيد التنفيذ). Other request types retain their existing transition rules.

The detail dialog includes **قبول طلب التواصل وبدء المتابعة**. Clicking without a reason selects the acceptance action and focuses the required reason field. Enter the reason and submit **قبول الطلب وبدء المتابعة**. The response replaces the displayed request and current available actions. Version conflicts and permission/session failures retain entered text.

Acceptance uses the existing transactional write, audit and customer status notification. It does not mark the customer as having been called. Optional customer messages remain explicitly entered by the administrator.

Verified with 18 web unit tests, 25 API tests, and six browser projects covering the deep link, required reason, acceptance and reopening in Arabic/English on desktop, tablet and mobile. Real MongoDB verification checks persistence, audit, notification and rollback on audit failure. Changed-file lint, API/web type checks and the web production build passed.

The requested production record was not changed: no browser connection was available in this session. Apply the release on the server, then accept it from its detail dialog.
