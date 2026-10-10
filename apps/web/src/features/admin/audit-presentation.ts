import { AUDIT_ACTION_GROUP_SUFFIXES, type SupportedLocale } from '@sadat-real-estate/contracts';

type Labels = Readonly<Record<string, readonly [string, string]>>;
const targets: Labels = {
  provider: ['مقدّمو العقارات', 'Property providers'],
  property: ['العقارات', 'Properties'], property_media: ['صور العقارات', 'Property images'],
  project: ['المشروعات', 'Projects'], user: ['حسابات المستخدمين', 'User accounts'],
  admin_user: ['حسابات الموظفين', 'Staff accounts'], provider_application: ['طلبات تسجيل المزوّدين', 'Provider applications'],
  request: ['طلبات العملاء', 'Customer requests'], viewing: ['طلبات المعاينة', 'Viewing requests'],
  ad_request: ['طلبات الإعلانات', 'Advertising requests'], ad_banner: ['البانرات', 'Banners'],
  ad_banner_media: ['صور البانرات', 'Banner images'], ad_settings: ['إعدادات الإعلانات', 'Advertising settings'],
  payment_proof: ['إثباتات الدفع', 'Payment proofs'], article: ['المقالات', 'Articles'],
  article_category: ['تصنيفات المقالات', 'Article categories'], article_photo: ['صور المقالات', 'Article images'],
  cms_team_member: ['فريق العمل', 'Team members'], team_category: ['أقسام فريق العمل', 'Team departments'],
  cms_team_photo: ['صور فريق العمل', 'Team photos'], cms_about_block: ['محتوى عن المنصة', 'About content'],
  cms_real_estate_tip: ['النصائح', 'Tips'], cms_homepage_section: ['أقسام الصفحة الرئيسية', 'Homepage sections'],
  cms_display_setting: ['إعدادات عرض المحتوى', 'Content display settings'], cms_population_value: ['إحصائيات السكان', 'Population statistics'],
  commission_policy: ['سياسات العمولة', 'Commission policies'], commission_exception: ['استثناءات العمولة', 'Commission exceptions'],
  commission_account_override: ['عمولة الحساب', 'Account commission'], community_post: ['منشورات المجتمع', 'Community posts'],
  community_report: ['بلاغات المجتمع', 'Community reports'], property_report: ['بلاغات العقارات', 'Property reports'],
  account_report: ['بلاغات الحسابات', 'Account reports'], rbac_role: ['الأدوار والصلاحيات', 'Roles and permissions'],
  admin_role_assignment: ['تعيين صلاحيات الموظفين', 'Staff role assignments'], auth_session: ['جلسات الدخول', 'Sign-in sessions'],
  provider_settings: ['إعدادات المزوّد', 'Provider settings'], provider_document: ['مستندات المزوّد', 'Provider documents'],
  admin_settings: ['إعدادات المنصة', 'Platform settings'], settings: ['الإعدادات', 'Settings'],
  property_taxonomy: ['تصنيفات العقارات', 'Property categories'], location: ['المناطق', 'Locations'],
  feature_service: ['الخدمات والمميزات', 'Features and services']
};
const groups: Labels = {
  create: ['إنشاء وإضافة', 'Create and add'], update: ['تعديل وحفظ', 'Update and save'],
  delete: ['حذف', 'Delete'], review: ['مراجعة ومتابعة الحالة', 'Review and status changes'],
  approve: ['موافقة وقبول', 'Approve and accept'], reject: ['رفض وإلغاء', 'Reject and cancel'],
  visibility: ['نشر وإخفاء وجدولة', 'Publish, hide and schedule'], access: ['صلاحيات وأمان الحساب', 'Account access and security'],
  communication: ['تواصل وتعيين مسؤول', 'Communication and assignment']
};
const actions: Labels = {
  identity_subscription_updated: ['تعديل اشتراك ظهور المكتب', 'Update office identity subscription'],
  legacy_import: ['نقل إعلان قديم للمراجعة', 'Import legacy ad for review'],
  create: ['إضافة', 'Create'], created: ['إضافة', 'Create'], upload: ['رفع صورة أو ملف', 'Upload image or file'],
  update: ['تعديل', 'Update'], updated: ['تعديل', 'Update'], write: ['حفظ المحتوى', 'Save content'],
  delete: ['حذف', 'Delete'], reorder: ['تغيير الترتيب', 'Reorder'], review: ['مراجعة الطلب', 'Review submission'],
  submit: ['إرسال للمراجعة', 'Submit for review'], start_review: ['بدء المراجعة', 'Start review'],
  needs_information: ['طلب معلومات من العميل', 'Ask customer for information'], provide_information: ['رد العميل بالمعلومات المطلوبة', 'Customer supplied requested information'],
  transition: ['تغيير الحالة', 'Change status'], transitioned: ['تغيير الحالة', 'Change status'],
  approve: ['موافقة', 'Approve'], verify: ['توثيق الحساب', 'Verify account'], accept: ['قبول', 'Accept'],
  reject: ['رفض', 'Reject'], cancel: ['إلغاء', 'Cancel'], publish: ['نشر', 'Publish'], unpublish: ['إلغاء النشر', 'Unpublish'],
  visibility: ['تغيير ظهور العقار', 'Change property visibility'], hide: ['إخفاء', 'Hide'], restore: ['استعادة', 'Restore'], archive: ['أرشفة', 'Archive'],
  schedule: ['جدولة العرض', 'Schedule display'], schedule_payment_waived: ['جدولة بإعفاء من الدفع', 'Schedule with payment waiver'],
  restrict: ['تقييد الحساب', 'Restrict account'], suspend: ['إيقاف الحساب', 'Suspend account'], reactivate: ['إعادة تفعيل الحساب', 'Reactivate account'],
  revoke: ['إنهاء جلسة الدخول', 'Revoke sign-in session'], roles_assigned: ['تعيين الصلاحيات', 'Assign roles'],
  role_created: ['إنشاء دور وظيفي', 'Create role'], role_updated: ['تعديل دور وظيفي', 'Update role'],
  administrator_created: ['إنشاء حساب موظف', 'Create staff account'], administrator_updated: ['تعديل حساب موظف', 'Update staff account'],
  assigned: ['تعيين مسؤول للطلب', 'Assign request owner'], admin_message: ['إرسال رسالة إدارية', 'Send administrator message'],
  banner_display: ['تعديل تناوب البانرات', 'Update banner rotation'], download_granted: ['السماح بتنزيل مستند', 'Grant document download'],
  contact: ['تم التواصل', 'Contacted'], start_progress: ['بدء التنفيذ', 'Start work'], resolve: ['تم تنفيذ الطلب', 'Resolve request'],
  close: ['إغلاق الطلب', 'Close request'], reopen: ['إعادة فتح الطلب', 'Reopen request'], overdue: ['تأخر متابعة الطلب', 'Request follow-up overdue'],
  processing: ['معالجة الصورة', 'Process image']
};
const label = (labels: Labels, value: string, locale: SupportedLocale): string => labels[value]?.[locale === 'ar' ? 0 : 1] ?? value;
export const auditTargetLabel = (value: string, locale: SupportedLocale): string => label(targets, value, locale);
export const auditActionLabel = (value: string, locale: SupportedLocale): string => label(actions, value.split('.').at(-1) ?? value, locale);
export const auditActorLabel = (value: string, locale: SupportedLocale): string => label({ admin: ['موظف الإدارة', 'Administrator'], provider: ['مزوّد عقار', 'Property provider'], seeker: ['عميل باحث عن عقار', 'Property seeker'] }, value, locale);
export const auditTargetOptions = (locale: SupportedLocale, additional: readonly string[] = []) => [...new Set([...Object.keys(targets), ...additional])].map(value => ({ value, label: auditTargetLabel(value, locale) }));
export const auditActionGroupOptions = (locale: SupportedLocale) => Object.keys(AUDIT_ACTION_GROUP_SUFFIXES).map(value => ({ value, label: label(groups, value, locale) }));

export function getSimpleAuditCopy(locale: SupportedLocale) {
  return locale === 'ar' ? {
    eyebrow: 'متابعة التغييرات', title: 'سجل الإجراءات',
    description: 'هنا تعرف مين عمل تغيير على الموقع، وإيه اللي اتغيّر وإمتى. اختار القسم ونوع التغيير أو الفترة عشان توصل للسجل المطلوب.',
    targetType: 'القسم', actionGroup: 'نوع التغيير', allSections: 'كل الأقسام', allActions: 'كل التغييرات',
    filters: 'ابحث في سجل الإجراءات', tableLabel: 'التغييرات المسجلة', actor: 'من نفّذ التغيير؟', target: 'القسم والسجل', actionLabel: 'ما الذي حدث؟',
    advanced: 'بحث متقدم بالمعرّفات', advancedHelp: 'اختياري: استخدمه لو معاك كود حساب أو سجل أو رقم تتبّع من الدعم. للبحث عن سجل محدد، اختار القسم أولًا.',
    actorId: 'معرّف حساب منفّذ التغيير', targetId: 'معرّف السجل داخل القسم', traceId: 'رقم التتبّع لدى الدعم',
    from: 'من تاريخ', to: 'إلى تاريخ', apply: 'عرض النتائج', clear: 'إلغاء الفلاتر',
    invalidDates: 'تاريخ البداية لازم يكون قبل تاريخ النهاية أو نفس اليوم.', invalidActor: 'معرّف الحساب لازم يكون 24 حرفًا من الأرقام والحروف a إلى f.',
    missingSection: 'اختار القسم قبل إدخال معرّف السجل.', invalidFilters: 'راجع المعرّفات في البحث المتقدم؛ استخدم الكود كاملًا من غير مسافات.',
    example: 'مثال: اختار «العقارات» و«تعديل وحفظ» لمعرفة التعديلات التي تمت على بيانات العقارات.',
    snapshotNotice: 'افتح «عرض التفاصيل» لمقارنة البيانات قبل التغيير وبعده. السجل للمتابعة فقط، والبيانات الحساسة محجوبة.',
    total: 'إجمالي النتائج', onPage: 'نتائج هذه الصفحة', administrators: 'حسابات نفّذت تغييرات بهذه الصفحة', redactedSnapshots: 'سجلات بتفاصيل قبل وبعد'
  } : {
    eyebrow: 'Track changes', title: 'Action log',
    description: 'See who changed something on the website, what changed and when. Choose a section, a change type or a date range to find the record you need.',
    targetType: 'Section', actionGroup: 'Change type', allSections: 'All sections', allActions: 'All changes',
    filters: 'Search the action log', tableLabel: 'Recorded changes', actor: 'Who made the change?', target: 'Section and record', actionLabel: 'What happened?',
    advanced: 'Advanced search by ID', advancedHelp: 'Optional: use this if you have an account ID, record ID or a trace number from support. Choose a section before searching for a specific record.',
    actorId: 'Account ID of the person making the change', targetId: 'Record ID within the section', traceId: 'Support trace number',
    from: 'From date', to: 'To date', apply: 'Show results', clear: 'Reset filters',
    invalidDates: 'The start date must be on or before the end date.', invalidActor: 'The account ID must contain 24 characters using digits and letters a to f.',
    missingSection: 'Choose a section before entering a record ID.', invalidFilters: 'Check the IDs in advanced search; enter the complete code without spaces.',
    example: 'Example: choose “Properties” and “Update and save” to find changes to property details.',
    snapshotNotice: 'Open “View details” to compare the data before and after a change. This is a read-only history; sensitive data is hidden.',
    total: 'Total results', onPage: 'Results on this page', administrators: 'Accounts making changes on this page', redactedSnapshots: 'Records with before and after details'
  };
}
