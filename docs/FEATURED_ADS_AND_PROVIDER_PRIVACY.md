# Featured homepage ads and provider privacy

## Operation

Open **Advertising → Featured homepage ads** (`/admin/ads/featured`). This is separate from **Homepage hero banners** (`/admin/banners`). Enable display and set up the placement once if it is missing or globally disabled. Import legacy cards explicitly; imports are drafts with no inferred advertiser account. Select the real account before publication.

Choose an eligible advertiser and one of its published properties, projects or organization pages. Names, images and verification come from the current account. Complete the Arabic/English title, description, highlight, installment line and button text, upload an image and review desktop/mobile previews. Dates use Egypt time; storage uses UTC. New cards go last and default to six seconds. Reorder with the arrows. Multiple cards may share a display window.

**Save draft** keeps the card unpublished. **Save and publish** first saves the creative, uploads and attaches the image, then publishes or schedules it. An upload failure preserves the typed values and selected file. Linked advertiser requests retain approved-payment/waiver and schedule checks. Stopping a card or reaching its end hides it without demo replacements.

The calendar links each request to its editor/preview and its location on the homepage. It also offers separate links for adding a featured card and a hero banner.

## Public identity and customer requests

- Individual brokers and unknown/unapproved accounts have no public identity subscription and cannot view incoming customer identity or manage those requests.
- Offices start hidden. An administrator with **Manage office identity subscription** (`admin:providers.visibility.manage`) confirms external payment and sets an active interval. The name and image are visible from the start, up to but excluding the end. Phone, email, address, biography and customer identity remain hidden. Reading requires the existing provider-view permission. Renew/stop operations require the current version and are audited with before/after values and the employee identity.
- Approved developers may view their own customer name, phone and an already stored image after acknowledging the current effective commission policy/version. Changing that policy immediately hides incoming customer identity and disables management until the new version is accepted. No customer email or account identifiers are disclosed.
- Offices/individuals receive request number, type, property/project, time, status and dates. Customer free text, updates, account identifiers and management actions are removed on the server. Their own sent contact inquiries retain requester permissions. Customers retain their own cancellation/update actions; authorized administrators retain the original data.
- Incoming provider notifications use generic copy and safe request numbers. Public listings, related cards, organization pages, SEO and initial page data use the same current policy. Relevant responses use `no-store`, and expiry is checked at read time.

## API and compatibility

Existing banner CRUD/media/config/reorder endpoints and permissions are reused. Featured creative is optional for existing hero banners and required for production featured publication. Placement: `homepage.featured`; display type: `featured_card`.

New endpoints:

- `GET /api/v1/admin/banners/featured-options?providerId=…`: permitted advertisers and owned published internal destinations; includes current management capability.
- `POST /api/v1/admin/banners/featured-import`: idempotently import legacy CMS cards as reviewable drafts.
- `GET /api/v1/admin/providers/:providerId/public-identity-subscription`: current office subscription and display state.
- `PUT /api/v1/admin/providers/:providerId/public-identity-subscription`: `status`, `startAt`, `endAt`, `paymentConfirmed`, `expectedVersion`.

OpenAPI and Postman contain the matching contracts and routes. Office subscriptions do not create electronic payments, change commissions or affect property publication.

## Articles

Changing language reloads the saved article translation instead of reusing another language's initial page data. Content supports up to **300,000 characters per language**, including articles exceeding 20,000 words within that bound. Titles retain their existing limit. The JSON request limit is bounded at 2 MB. Save the English body/title in article management; the site does not automatically translate missing editorial content.

## دليل مختصر

من إدارة الإعلانات افتح **إعلانات الرئيسية المميزة**، واختر حساب المعلن وصفحة منشورة تخصه، ثم أضف الصورة والنصوص والمواعيد. راجع معاينة الكمبيوتر والموبايل واضغط **حفظ مسودة** أو **حفظ ونشر**. الكروت القديمة تنتقل كمسودات للمراجعة دون افتراض شركة. تقويم الإعلانات يفتح المعاينة ومكان الإعلان ويوفر إضافة الكارت أو البانر.

من مراجعة المكتب افتح **ظهور المكتب للزوار**. الموظف صاحب صلاحية إدارة اشتراك الظهور يسجل استلام الدفع خارج المنصة ويحدد البداية والنهاية، ثم يفعّل أو يجدّد أو يوقف. يظهر الاسم والصورة فقط؛ بيانات العملاء ووسائل التواصل تظل محجوبة. الفردي لا يحصل على اشتراك. شركة التطوير المعتمدة تكشف بيانات طلباتها المسموحة بعد الموافقة على نسخة العمولة الحالية، وتُحجب عند تغييرها حتى القبول من جديد.

التغييرات تحتاج تحديث السيرفر؛ الحسابات الحالية للمكاتب تبدأ مخفية، ولا يتم افتراض دفع سابق.
