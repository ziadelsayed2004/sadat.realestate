# Screen Coverage Matrix

| Screen | Surface | English | العربي | Devices | Route | Backend tasks | Frontend task |
|---|---|---|---|---|---|---|---|
| PUB-01 | public | Home | الرئيسية | desktop/tablet/mobile | `/` | `backend_060` | `frontend_010` |
| PUB-02 | public | Properties Listing | قائمة العقارات | desktop/tablet/mobile | `/properties` | `backend_061` | `frontend_011` |
| PUB-03 | public | Property Details | تفاصيل العقار | desktop/tablet/mobile | `/properties/:slug` | `backend_062` | `frontend_012` |
| PUB-04 | public | Unit Comparison | مقارنة الوحدات | desktop/tablet/mobile | `/compare` | `backend_063` | `frontend_013` |
| PUB-05 | public | Developers & Companies | المطورون والشركات العقارية | desktop/tablet/mobile | `/developers` | `backend_064` | `frontend_014` |
| PUB-06 | public | Developer Profile | ملف المطور العقاري | desktop/tablet/mobile | `/developers/:slug` | `backend_064` | `frontend_014` |
| PUB-07 | public | Articles Listing | قائمة المقالات | desktop/tablet/mobile | `/articles` | `backend_092` | `frontend_015` |
| PUB-08 | public | Article Details | تفاصيل المقال | desktop/tablet/mobile | `/articles/:slug` | `backend_092` | `frontend_015` |
| PUB-09 | public | Community Feed | الكوميونيتي | desktop/tablet/mobile | `/community` | `backend_093`<br>`backend_096` | `frontend_016` |
| PUB-10 | public | Create Post — Modal | إنشاء منشور — نافذة منبثقة | desktop/tablet/mobile | `/community?create=1` | `backend_093`<br>`backend_096` | `frontend_016` |
| PUB-11 | public | About Platform | عن المنصة | desktop/tablet/mobile | `/about` | `backend_036` | `frontend_017` |
| PUB-12 | public | Team | فريق العمل | desktop/tablet/mobile | `/team` | `backend_036` | `frontend_017` |
| AUTH-01 | auth | Login | تسجيل الدخول | desktop/tablet/mobile | `/auth/login` | `backend_011`<br>`backend_012` | `frontend_020` |
| AUTH-02 | auth | Seeker Registration — Default | إنشاء حساب باحث — افتراضي | desktop/tablet/mobile | `/auth/register/seeker` | `backend_013` | `frontend_021` |
| AUTH-03 | auth | Seeker Registration — Default | إنشاء حساب باحث — افتراضي | desktop/tablet/mobile | `/auth/register/seeker` | `backend_013` | `frontend_021` |
| AUTH-04 | auth | Phone Verification — OTP | تأكيد رقم الهاتف — رمز التحقق | desktop/tablet/mobile | `/auth/verify-phone` | `backend_011`<br>`backend_012` | `frontend_020` |
| AUTH-05 | auth | Phone Verification — OTP | تأكيد رقم الهاتف — رمز التحقق | desktop/tablet/mobile | `/auth/verify-phone` | `backend_011`<br>`backend_012` | `frontend_020` |
| AUTH-06 | auth | Seeker Registration — Success | تم إنشاء حساب الباحث | desktop/tablet/mobile | `/auth/register/seeker/success` | `backend_013` | `frontend_021` |
| AUTH-07 | auth | Provider Type Selection — Default | اختيار نوع مقدم العقار — افتراضي | desktop/tablet/mobile | `/auth/register/provider/type` | `backend_014` | `frontend_022` |
| AUTH-08 | auth | Provider Type Selection — Selected | اختيار نوع مقدم العقار — محدد | desktop/tablet/mobile | `/auth/register/provider/type` | `backend_014` | `frontend_022` |
| AUTH-09 | auth | Provider Registration — Account Details | تسجيل مقدم العقار — بيانات الحساب | desktop/tablet/mobile | `/auth/register/provider/account` | `backend_014` | `frontend_023` |
| AUTH-09+ | auth | Provider Registration — Account Details | تسجيل مقدم العقار — بيانات الحساب | desktop/tablet/mobile | `/auth/register/provider/account` | `backend_014` | `frontend_023` |
| AUTH-10 | auth | Provider Registration — Business Details | تسجيل مقدم العقار — بيانات النشاط | desktop/tablet/mobile | `/auth/register/provider/business` | `backend_014` | `frontend_024` |
| AUTH-10+ | auth | Provider Registration — Business Details | تسجيل مقدم العقار — بيانات النشاط | desktop/tablet/mobile | `/auth/register/provider/business` | `backend_014` | `frontend_024` |
| AUTH-11 | auth | Provider Registration — Developer Company Details | تسجيل مقدم العقار — بيانات شركة التطوير | desktop/tablet/mobile | `/auth/register/provider/company` | `backend_014` | `frontend_024` |
| AUTH-12 | auth | Provider Registration — Documents | تسجيل مقدم العقار — المستندات | desktop/tablet/mobile | `/auth/register/provider/documents` | `backend_015` | `frontend_024` |
| AUTH-13 | auth | Provider Registration — Review & Submit | تسجيل مقدم العقار — المراجعة والإرسال | desktop/tablet/mobile | `/auth/register/provider/review` | `backend_014` | `frontend_025` |
| AUTH-14 | auth | Provider Application — Under Review | طلب مقدم العقار — قيد المراجعة | desktop/tablet/mobile | `/provider-application/status` | `backend_014` | `frontend_025` |
| AUTH-15 | auth | Provider Application — Tracking | متابعة طلب مقدم العقار | desktop/tablet/mobile | `/provider-application/status` | `backend_014` | `frontend_025` |
| AUTH-16 | auth | Provider Application — Needs Information | طلب مقدم العقار — يحتاج استكمال | desktop/tablet/mobile | `/provider-application/needs-information` | `backend_014` | `frontend_025` |
| AUTH-17 | auth | Provider Application — Approved | طلب مقدم العقار — تم الاعتماد | desktop/tablet/mobile | `/provider-application/approved` | `backend_014` | `frontend_025` |
| SEK-01 | seeker | Seeker Overview | نظرة عامة | desktop | `/seeker` | `backend_066` | `frontend_030` |
| SEK-02 | seeker | My Requests | طلباتي | desktop | `/seeker/requests` | `backend_075` | `frontend_031` |
| SEK-03 | seeker | Request Details — Under Review | تفاصيل الطلب — قيد المراجعة | desktop | `/seeker/requests/:id` | `backend_075` | `frontend_031` |
| SEK-04 | seeker | Request Details — Contacted | تفاصيل الطلب — تم التواصل | desktop | `/seeker/requests/:id` | `backend_075` | `frontend_031` |
| SEK-05 | seeker | Viewing Requests | طلبات المعاينة | desktop | `/seeker/viewings` | `backend_072` | `frontend_032` |
| SEK-06 | seeker | Saved Properties | العقارات المحفوظة | desktop | `/seeker/saved` | `backend_065` | `frontend_033` |
| SEK-07 | seeker | Notifications | الإشعارات | desktop | `/seeker/notifications` | `backend_068` | `frontend_034` |
| SEK-08 | seeker | Profile & Preferences — Search Preferences | الملف الشخصي والتفضيلات — تفضيلات البحث | desktop | `/seeker/profile?tab=preferences` | `backend_067` | `frontend_035` |
| SEK-09 | seeker | Profile & Preferences — Personal Information | الملف الشخصي والتفضيلات — المعلومات الشخصية | desktop | `/seeker/profile?tab=personal` | `backend_067` | `frontend_035` |
| SEK-10 | seeker | Account Settings | إعدادات الحساب | desktop | `/seeker/settings` | `backend_067` | `frontend_035` |
| PRV-01 | provider | Dashboard Overview | نظرة عامة | desktop | `/provider` | `backend_051`<br>`backend_066` | `frontend_040` |
| PRV-02 | provider | My Properties | عقاراتي | desktop | `/provider/properties` | `backend_051` | `frontend_041` |
| PRV-03 | provider | Add Property — 01 Basic Information | إضافة عقار — 01 البيانات الأساسية | desktop | `/provider/properties/new/basic` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_042` |
| PRV-04 | provider | Add Property — 02 Location | إضافة عقار — 02 الموقع | desktop | `/provider/properties/:id/location` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_042` |
| PRV-05 | provider | Add Property — 03 Property Details | إضافة عقار — 03 تفاصيل العقار | desktop | `/provider/properties/:id/details` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_043` |
| PRV-06 | provider | Add Property — 04 Price & Payment | إضافة عقار — 04 السعر والسداد | desktop | `/provider/properties/:id/price-payment` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_043` |
| PRV-07 | provider | Add Property — 05 Features & Services | إضافة عقار — 05 المميزات والخدمات | desktop | `/provider/properties/:id/features` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_043` |
| PRV-08 | provider | Add Property — 06 Media | إضافة عقار — 06 الصور والوسائط | desktop | `/provider/properties/:id/media` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_044` |
| PRV-09 | provider | Add Property — 07 Contact | إضافة عقار — 07 التواصل | desktop | `/provider/properties/:id/contact` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_044` |
| PRV-10 | provider | Add Property — 08 Review & Submit | إضافة عقار — 08 المراجعة والإرسال | desktop | `/provider/properties/:id/review` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_044` |
| PRV-11 | provider | Add Property — Validation Errors | إضافة عقار — بيانات تحتاج استكمال | desktop | `/provider/properties/:id/review` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_045` |
| PRV-12 | provider | Property Submitted | تم إرسال العقار للمراجعة | desktop | `/provider/properties/:id/submitted` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_045` |
| PRV-13 | provider | Property Rejected | تعذر اعتماد العقار | desktop | `/provider/properties/:id/rejected` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_045` |
| PRV-14 | provider | Property Published | تم نشر العقار | desktop | `/provider/properties/:id/published` | `backend_043`<br>`backend_044`<br>`backend_045`<br>`backend_046`<br>`backend_047`<br>`backend_048`<br>`backend_049` | `frontend_045` |
| PRV-15 | provider | Projects Listing | المشاريع | desktop | `/provider/projects` | `backend_040` | `frontend_046` |
| PRV-16 | provider | Customer Requests | طلبات العملاء | desktop | `/provider/customer-requests` | `backend_074`<br>`backend_076` | `frontend_047` |
| PRV-17 | provider | Add Customer Request — Modal | إضافة طلب عميل — نافذة منبثقة | desktop | `/provider/customer-requests?create=1` | `backend_074`<br>`backend_076` | `frontend_047` |
| PRV-18 | provider | Viewing Appointments | مواعيد المعاينات | desktop | `/provider/viewings` | `backend_072` | `frontend_048` |
| PRV-19 | provider | Ad Requests | طلبات الإعلانات | desktop | `/provider/ads` | `backend_101`<br>`backend_107` | `frontend_049` |
| PRV-20 | provider | Commission | العمولة | desktop | `/provider/commission` | `backend_116` | `frontend_049` |
| PRV-21 | provider | Notifications | الإشعارات | desktop | `/provider/notifications` | `backend_068` | `frontend_050` |
| PRV-22-1 | provider | Settings | الإعدادات | desktop | `/provider/settings` | `backend_123` | `frontend_050` |
| PRV-22-2 | provider | Settings | الإعدادات | desktop | `/provider/settings` | `backend_123` | `frontend_050` |
| PRV-22-3 | provider | Settings | الإعدادات | desktop | `/provider/settings` | `backend_123` | `frontend_050` |
| ADM-01 | admin | Admin Overview | نظرة عامة | desktop | `/admin` | `backend_120` | `frontend_060` |
| ADM-02 | admin | Users Management | إدارة المستخدمين | desktop | `/admin/users` | `backend_016`<br>`backend_017`<br>`backend_019`<br>`backend_121` | `frontend_061` |
| ADM-03 | admin | Property Seekers | الباحثون عن عقار | desktop | `/admin/property-seekers` | `backend_016`<br>`backend_017`<br>`backend_019`<br>`backend_121` | `frontend_061` |
| ADM-04 | admin | Property Providers | مقدمو العقارات | desktop | `/admin/providers` | `backend_016`<br>`backend_017`<br>`backend_019`<br>`backend_121` | `frontend_061` |
| ADM-05 | admin | Provider Documents Review | مراجعة مستندات مقدمي العقارات | desktop | `/admin/verification` | `backend_016`<br>`backend_017`<br>`backend_019`<br>`backend_121` | `frontend_061` |
| ADM-06 | admin | Account Reports | بلاغات الحسابات | desktop | `/admin/account-reports` | `backend_016`<br>`backend_017`<br>`backend_019`<br>`backend_121` | `frontend_062` |
| ADM-07 | admin | Account Report Details | تفاصيل بلاغ الحساب | desktop | `/admin/account-reports/:id` | `backend_016`<br>`backend_017`<br>`backend_019`<br>`backend_121` | `frontend_062` |
| ADM-08 | admin | Account Restrictions | قيود الحسابات | desktop | `/admin/account-restrictions` | `backend_016`<br>`backend_017`<br>`backend_019`<br>`backend_121` | `frontend_062` |
| ADM-09 | admin | Property Categories & Types | التصنيفات وأنواع العقارات | desktop | `/admin/property-categories` | `backend_031`<br>`backend_032`<br>`backend_033` | `frontend_063` |
| ADM-10 | admin | Locations & Neighborhoods | المناطق والأحياء | desktop | `/admin/locations` | `backend_031`<br>`backend_032`<br>`backend_033` | `frontend_063` |
| ADM-11 | admin | Features & Services | المميزات والخدمات | desktop | `/admin/features` | `backend_031`<br>`backend_032`<br>`backend_033` | `frontend_063` |
| ADM-12 | admin | Projects Management | إدارة المشروعات | desktop | `/admin/projects` | `backend_040`<br>`backend_041`<br>`backend_049`<br>`backend_052`<br>`backend_053`<br>`backend_054` | `frontend_064` |
| ADM-13 | admin | Projects Review | مراجعة المشروعات | desktop | `/admin/projects/review` | `backend_040`<br>`backend_041`<br>`backend_049`<br>`backend_052`<br>`backend_053`<br>`backend_054` | `frontend_064` |
| ADM-14 | admin | Properties Management | إدارة العقارات | desktop | `/admin/properties` | `backend_040`<br>`backend_041`<br>`backend_049`<br>`backend_052`<br>`backend_053`<br>`backend_054` | `frontend_065` |
| ADM-15 | admin | Properties Review | مراجعة العقارات | desktop | `/admin/properties/review` | `backend_040`<br>`backend_041`<br>`backend_049`<br>`backend_052`<br>`backend_053`<br>`backend_054` | `frontend_065` |
| ADM-16 | admin | Suspected Duplicate Properties | عقارات يشتبه بتكرارها | desktop | `/admin/properties/possible-duplicates` | `backend_040`<br>`backend_041`<br>`backend_049`<br>`backend_052`<br>`backend_053`<br>`backend_054` | `frontend_065` |
| ADM-17 | admin | Property Reports | بلاغات العقارات | desktop | `/admin/property-reports` | `backend_040`<br>`backend_041`<br>`backend_049`<br>`backend_052`<br>`backend_053`<br>`backend_054` | `frontend_065` |
| ADM-18 | admin | Requests Management | إدارة الطلبات | desktop | `/admin/requests` | `backend_070`<br>`backend_077`<br>`backend_078`<br>`backend_079` | `frontend_066` |
| ADM-19 | admin | Customer Requests | طلبات العملاء | desktop | `/admin/customer-requests` | `backend_070`<br>`backend_077`<br>`backend_078`<br>`backend_079` | `frontend_066` |
| ADM-20 | admin | Overdue Requests | الطلبات المتأخرة | desktop | `/admin/overdue-requests` | `backend_070`<br>`backend_077`<br>`backend_078`<br>`backend_079` | `frontend_066` |
| ADM-21 | admin | Contact Requests | طلبات التواصل | desktop | `/admin/contact-requests` | `backend_070`<br>`backend_077`<br>`backend_078`<br>`backend_079` | `frontend_066` |
| ADM-22 | admin | Viewing Requests | طلبات المعاينة | desktop | `/admin/viewing-requests` | `backend_070`<br>`backend_077`<br>`backend_078`<br>`backend_079` | `frontend_066` |
| ADM-23 | admin | Property Search Requests | طلبات البحث عن عقار | desktop | `/admin/search-requests` | `backend_070`<br>`backend_077`<br>`backend_078`<br>`backend_079` | `frontend_066` |
| ADM-24 | admin | Request Issues & Reports | بلاغات ومشكلات الطلبات | desktop | `/admin/request-issues` | `backend_070`<br>`backend_077`<br>`backend_078`<br>`backend_079` | `frontend_066` |
| ADM-25 | admin | Articles Management | إدارة المقالات | desktop | `/admin/articles` | `backend_090`<br>`backend_091`<br>`backend_095`<br>`backend_035`<br>`backend_036`<br>`backend_037` | `frontend_067` |
| ADM-26 | admin | Article Categories | تصنيفات المقالات | desktop | `/admin/article-categories` | `backend_090`<br>`backend_091`<br>`backend_095`<br>`backend_035`<br>`backend_036`<br>`backend_037` | `frontend_067` |
| ADM-27 | admin | Community Management | إدارة الكوميونيتي | desktop | `/admin/community` | `backend_090`<br>`backend_091`<br>`backend_095`<br>`backend_035`<br>`backend_036`<br>`backend_037` | `frontend_068` |
| ADM-28 | admin | Comments | التعليقات | desktop | `/admin/community/comments` | `backend_090`<br>`backend_091`<br>`backend_095`<br>`backend_035`<br>`backend_036`<br>`backend_037` | `frontend_068` |
| ADM-29 | admin | Reports & Moderation | البلاغات والإشراف | desktop | `/admin/community/moderation` | `backend_090`<br>`backend_091`<br>`backend_095`<br>`backend_035`<br>`backend_036`<br>`backend_037` | `frontend_068` |
| ADM-30 | admin | About Platform | النبذة عن المنصة | desktop | `/admin/content/about` | `backend_090`<br>`backend_091`<br>`backend_095`<br>`backend_035`<br>`backend_036`<br>`backend_037` | `frontend_069` |
| ADM-31 | admin | Team Management | إدارة فريق العمل | desktop | `/admin/content/team` | `backend_090`<br>`backend_091`<br>`backend_095`<br>`backend_035`<br>`backend_036`<br>`backend_037` | `frontend_069` |
| ADM-32 | admin | Sadat Population Counter | عداد سكان مدينة السادات | desktop | `/admin/content/population-counter` | `backend_090`<br>`backend_091`<br>`backend_095`<br>`backend_035`<br>`backend_036`<br>`backend_037` | `frontend_069` |
| ADM-33 | admin | Ad Requests | طلبات الإعلانات | desktop | `/admin/ads/requests` | `backend_100`<br>`backend_101`<br>`backend_102`<br>`backend_103`<br>`backend_104`<br>`backend_105`<br>`backend_108` | `frontend_070` |
| ADM-34 | admin | Pending Payment Proofs | الإثباتات المعلقة | desktop | `/admin/ads/payment-proofs/pending` | `backend_100`<br>`backend_101`<br>`backend_102`<br>`backend_103`<br>`backend_104`<br>`backend_105`<br>`backend_108` | `frontend_070` |
| ADM-35 | admin | Approved Payment Proofs | الإثباتات المقبولة | desktop | `/admin/ads/payment-proofs/approved` | `backend_100`<br>`backend_101`<br>`backend_102`<br>`backend_103`<br>`backend_104`<br>`backend_105`<br>`backend_108` | `frontend_070` |
| ADM-36 | admin | Ad Calendar | تقويم الإعلانات | desktop | `/admin/ads/calendar` | `backend_100`<br>`backend_101`<br>`backend_102`<br>`backend_103`<br>`backend_104`<br>`backend_105`<br>`backend_108` | `frontend_070` |
| ADM-37 | admin | Pending Payments Review | مراجعة المدفوعات المعلقة | desktop | `/admin/ads/payments/pending-review` | `backend_100`<br>`backend_101`<br>`backend_102`<br>`backend_103`<br>`backend_104`<br>`backend_105`<br>`backend_108` | `frontend_070` |
| ADM-38 | admin | Financial Review | الفحص المالي | desktop | `/admin/ads/financial-review` | `backend_100`<br>`backend_101`<br>`backend_102`<br>`backend_103`<br>`backend_104`<br>`backend_105`<br>`backend_108` | `frontend_070` |
| ADM-39 | admin | Commissions Management | إدارة العمولات | desktop | `/admin/commissions` | `backend_110`<br>`backend_111`<br>`backend_112`<br>`backend_114`<br>`backend_115` | `frontend_071` |
| ADM-40 | admin | Create Commission Policy | إنشاء سياسة عمولة | desktop | `/admin/commissions/policies/new` | `backend_110`<br>`backend_111`<br>`backend_112`<br>`backend_114`<br>`backend_115` | `frontend_071` |
| ADM-41 | admin | Commission Change Log | سجل قرارات وتغييرات العمولات | desktop | `/admin/commissions/change-log` | `backend_110`<br>`backend_111`<br>`backend_112`<br>`backend_114`<br>`backend_115` | `frontend_071` |
| ADM-42 | admin | Account Commission | عمولة الحساب | desktop | `/admin/commissions/accounts/:id` | `backend_110`<br>`backend_111`<br>`backend_112`<br>`backend_114`<br>`backend_115` | `frontend_071` |
| ADM-43 | admin | Commission Exceptions | استثناءات العمولات | desktop | `/admin/commissions/exceptions` | `backend_110`<br>`backend_111`<br>`backend_112`<br>`backend_114`<br>`backend_115` | `frontend_071` |
| ADM-44 | admin | Create Commission Exception | إنشاء استثناء عمولة | desktop | `/admin/commissions/exceptions/new` | `backend_110`<br>`backend_111`<br>`backend_112`<br>`backend_114`<br>`backend_115` | `frontend_071` |
| ADM-45 | admin | Commission Policy Confirmations | تأكيد سياسات العمولات | desktop | `/admin/commissions/confirmations` | `backend_110`<br>`backend_111`<br>`backend_112`<br>`backend_114`<br>`backend_115` | `frontend_071` |
| ADM-46 | admin | Ad Banners | البانرات الإعلانية | desktop | `/admin/banners` | `backend_035`<br>`backend_037`<br>`backend_038`<br>`backend_106` | `frontend_072` |
| ADM-47 | admin | Add New Banner | إضافة بانر جديد | desktop | `/admin/banners/new` | `backend_035`<br>`backend_037`<br>`backend_038`<br>`backend_106` | `frontend_072` |
| ADM-48 | admin | Sadat Real Estate Tips | نصائح عقارات السادات | desktop | `/admin/content/tips` | `backend_035`<br>`backend_037`<br>`backend_038`<br>`backend_106` | `frontend_072` |
| ADM-49 | admin | Homepage Management | إدارة الصفحة الرئيسية | desktop | `/admin/content/homepage` | `backend_035`<br>`backend_037`<br>`backend_038`<br>`backend_106` | `frontend_072` |
| ADM-50 | admin | Platform Information | بيانات المنصة | desktop | `/admin/settings/platform` | `backend_035`<br>`backend_037`<br>`backend_038`<br>`backend_106` | `frontend_073` |
| ADM-51 | admin | Contact Information | بيانات التواصل | desktop | `/admin/settings/contact` | `backend_035`<br>`backend_037`<br>`backend_038`<br>`backend_106` | `frontend_073` |
| ADM-52 | admin | Social Media Accounts | حسابات التواصل الاجتماعي | desktop | `/admin/settings/social` | `backend_035`<br>`backend_037`<br>`backend_038`<br>`backend_106` | `frontend_073` |
| ADM-53 | admin | Property Settings | إعدادات العقارات | desktop | `/admin/settings/properties` | `backend_039`<br>`backend_123` | `frontend_074` |
| ADM-54 | admin | Request Settings | إعدادات الطلبات | desktop | `/admin/settings/requests` | `backend_039`<br>`backend_123` | `frontend_074` |
| ADM-55 | admin | Advertising Settings | إعدادات الإعلانات | desktop | `/admin/settings/advertising` | `backend_039`<br>`backend_123` | `frontend_074` |
| ADM-56 | admin | General SEO | SEO عام | desktop | `/admin/settings/seo` | `backend_039`<br>`backend_123` | `frontend_074` |
| ADM-57 | admin | Privacy & Security | الخصوصية والأمان | desktop | `/admin/settings/privacy-security` | `backend_039`<br>`backend_123` | `frontend_074` |
| ADM-58 | admin | Display Settings | إعدادات العرض | desktop | `/admin/settings/display` | `backend_039`<br>`backend_123` | `frontend_074` |
| ADM-59 | admin | Admin Users | المستخدمون الإداريون | desktop | `/admin/admin-users` | `backend_016`<br>`backend_017`<br>`backend_121` | `frontend_075` |
| ADM-60 | admin | Add Admin User | إضافة مستخدم إداري | desktop | `/admin/admin-users/new` | `backend_016`<br>`backend_017`<br>`backend_121` | `frontend_075` |
| ADM-61 | admin | Admin User Details — Super Admin | تفاصيل المستخدم الإداري — مدير النظام | desktop | `/admin/admin-users/:id` | `backend_016`<br>`backend_017`<br>`backend_121` | `frontend_075` |
| ADM-62 | admin | Admin User Details — Standard Role | تفاصيل المستخدم الإداري — دور مخصص | desktop | `/admin/admin-users/:id` | `backend_016`<br>`backend_017`<br>`backend_121` | `frontend_075` |
| ADM-63 | admin | Roles & Permissions | الأدوار والصلاحيات | desktop | `/admin/roles` | `backend_016`<br>`backend_017`<br>`backend_121` | `frontend_075` |
| ADM-64 | admin | Role Details & Permissions | تفاصيل الدور والصلاحيات | desktop | `/admin/roles/:id` | `backend_016`<br>`backend_017`<br>`backend_121` | `frontend_075` |
| ADM-65 | admin | Admin Notifications | إشعارات الإدارة | desktop | `/admin/notifications` | `backend_122` | `frontend_076` |
| ADM-66 | admin | Audit Log | سجل الإجراءات | desktop | `/admin/audit-log` | `backend_020` | `frontend_076` |
