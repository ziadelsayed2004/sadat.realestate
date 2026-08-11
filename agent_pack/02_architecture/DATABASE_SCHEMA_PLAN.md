# Database Schema Plan

| Aggregate / Collection | الغرض | فهارس أساسية مبدئية |
|---|---|---|
| users | الهوية المشتركة والحالة | unique normalizedPhone/email، roleType، status |
| sessions | refresh rotation/reuse | unique tokenHash، userId، TTL expiresAt |
| otp_challenges | OTP hashed | target+purpose، TTL expiresAt، attempts |
| seeker_profiles | بيانات وتفضيلات الباحث | unique userId |
| provider_profiles / applications | نوع المقدم وonboarding | unique userId، status+updatedAt |
| provider_documents | metadata لمستند خاص | providerId+type، status |
| admin_profiles / roles | إدارة وRBAC | unique userId/name |
| audit_logs | سجل append-only | actorId+createdAt، targetType+targetId+createdAt |
| organizations | مطور/شركة/مكتب | unique slug، status+name search |
| locations / neighborhoods | نطاق جغرافي | unique slug، parent/order/active |
| property_categories / types | taxonomy | unique slug، active+order |
| features / services | خصائص | group+active+order |
| projects / project_revisions | المشروعات والمراجعة | providerId+status، slug، location |
| properties / property_revisions | listings/units | providerId+status، published search indexes، geo |
| assets | public/private media metadata | ownerType+ownerId، visibility+status |
| favorites | محفوظات الباحث | unique seekerId+propertyId |
| requests / request_events | كل أنواع الطلبات وتاريخها | type+status+updatedAt، seeker/provider/assignee، dueAt |
| notifications | inbox | recipientId+readAt+createdAt |
| outbox_events | أحداث موثوقة | status+availableAt، unique dedupeKey |
| article_categories / articles | المحتوى | slug+locale/status، publishAt |
| community_posts / comments | الكوميونيتي | status+createdAt، postId+createdAt |
| moderation_reports | البلاغات | targetType+targetId+status |
| ad_placements / ad_requests | الإعلان | placement+status+schedule، providerId |
| payment_proofs | إثبات خاص | adRequestId+status |
| banners | البانرات | placement+status+start/end |
| commission_policies | السياسات وإصداراتها | scope+effectiveFrom/effectiveTo |
| commission_exceptions | استثناءات الحساب | accountId+active dates |
| commission_confirmations | تأكيد النسخة | unique accountId+policyVersion |
| settings | إعدادات versioned | unique namespace+key |

الفهارس النهائية لا تعتمد من الجدول وحده؛ تُثبت من queries و`explain` في مهام الأداء. المحتوى المحلي يخزن كobject مضبوط المفاتيح أو subdocuments محددة، وليس حقولًا حرة غير قابلة للتحقق.
