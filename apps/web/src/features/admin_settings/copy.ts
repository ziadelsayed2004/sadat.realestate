import type { AdminSettingsNamespace, SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminSettingsState } from './views.tsx';

export interface AdminSettingsCopy {
  readonly eyebrow: string;
  readonly platform: string;
  readonly contact: string;
  readonly social: string;
  readonly labels: Readonly<Record<AdminSettingsNamespace, string>>;
  readonly descriptions: Readonly<Record<AdminSettingsNamespace, string>>;
  readonly fields: Readonly<Record<string, string>>;
  readonly selectPlaceholder: string;
  readonly locales: Readonly<Record<'ar' | 'en', string>>;
  readonly save: string;
  readonly saving: string;
  readonly retry: string;
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly saved: string;
  readonly validation: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly preservedValues: string;
  readonly unavailableAction: string;
  readonly states: Readonly<Record<AdminSettingsState, { readonly title: string; readonly body: string }>>;
  readonly directionNote: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, Omit<AdminSettingsCopy, 'selectPlaceholder'>>> = {
  ar: {
    eyebrow: 'إعدادات المنصة',
    platform: 'معلومات المنصة',
    contact: 'معلومات التواصل',
    social: 'حسابات التواصل الاجتماعي',
    labels: {
      platform: 'معلومات المنصة',
      contact: 'معلومات التواصل',
      social: 'حسابات التواصل الاجتماعي',
      properties: 'إعدادات العقارات',
      requests: 'إعدادات الطلبات',
      advertising: 'إعدادات الإعلانات',
      seo: 'إعدادات تحسين محركات البحث',
      'privacy-security': 'إعدادات الخصوصية والأمان',
      display: 'إعدادات العرض'
    },
    descriptions: {
      platform: 'حدّث بيانات المنصة المعتمدة مع الحفاظ على الإصدار والتدقيق.',
      contact: 'حافظ على بيانات التواصل العامة من الإسقاط الإداري المعتمد.',
      social: 'أدر روابط الحسابات الاجتماعية الاختيارية من المصدر المعتمد.',
      properties: 'حدّث قيم إعدادات العقارات الموجودة في الإسقاط الإداري المعتمد فقط.',
      requests: 'حدّث قيم إعدادات الطلبات الموجودة دون اختراع قواعد تشغيلية.',
      advertising: 'أدر قيم الإعلانات المعتمدة دون إضافة أسعار عامة أو قيم دفع.',
      seo: 'أدر قيم تحسين محركات البحث المعتمدة مع احترام حالة النشر.',
      'privacy-security': 'أدر قيم الخصوصية والأمان المعتمدة دون كشف أسرار أو بيانات خاصة.',
      display: 'أدر قيم العرض المعتمدة مع الحفاظ على النسخة والتدقيق.'
    },
    fields: {
      platform_name: 'اسم المنصة',
      short_name: 'الاسم المختصر',
      description: 'الوصف',
      city: 'المدينة',
      timezone: 'المنطقة الزمنية',
      currency: 'العملة',
      default_locale: 'اللغة الافتراضية',
      primary_email: 'البريد الإلكتروني',
      primary_phone: 'رقم الهاتف',
      office_address: 'عنوان المكتب',
      working_hours: 'ساعات العمل',
      whatsapp_number: 'واتساب',
      map_url: 'رابط الخريطة',
      facebook_url: 'فيسبوك',
      instagram_url: 'إنستغرام',
      linkedin_url: 'لينكدإن',
      youtube_url: 'يوتيوب',
      tiktok_url: 'تيك توك'
    },
    locales: { ar: 'العربية', en: 'English',},
    save: 'حفظ التغييرات',
    saving: 'جارٍ الحفظ',
    retry: 'إعادة المحاولة',
    reason: 'سبب التغيير',
    reasonPlaceholder: 'اكتب سببًا واضحًا لا يقل عن ثلاثة أحرف',
    reasonRequired: 'سبب التغيير مطلوب.',
    saved: 'تم حفظ الإعدادات.',
    validation: 'تحقق من الحقول وأعد المحاولة.',
    version: 'الإصدار',
    schemaVersion: 'إصدار المخطط',
    preservedValues: 'تُحفظ القيم المعتمدة الأخرى عند تحديث هذه الشاشة.',
    unavailableAction: 'إنشاء مسودة إعدادات',
    states: {
      loading: { title: 'جارٍ تحميل الإعدادات', body: 'يتم جلب الإسقاط الإداري الآمن.' },
      empty: { title: 'الإعدادات غير متاحة بعد', body: 'لم يتم إنشاء هذا النطاق بعد. لا تُضاف قيم إنتاجية غير موثقة.' },
      error: { title: 'تعذر تحميل الإعدادات', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      retry: { title: 'الاتصال غير متاح مؤقتًا', body: 'أعد المحاولة دون فقدان القيم الحالية.' },
      permission: { title: 'الوصول غير مسموح', body: 'تتطلب هذه الشاشة جلسة مدير والصلاحية المطابقة من واجهة البرمجة.' },
      conflict: { title: 'تعارض في الإصدار', body: 'تغيرت الإعدادات منذ آخر تحميل. أعد تحميل الإسقاط وراجعه قبل الحفظ.' },
      success: { title: 'الإعدادات جاهزة', body: 'تُعرض القيم من الإسقاط الإداري المعتمد.' },
      not_found: { title: 'المسار غير موجود', body: 'لا يوجد نطاق إعدادات مطابق.' }
    },
    directionNote: 'العربية RTL — إعدادات المنصة معتمدة لسطح المكتب.'
  },
  en: {
    eyebrow: 'Platform settings',
    platform: 'Platform information',
    contact: 'Contact information',
    social: 'Social media accounts',
    labels: {
      platform: 'Platform information',
      contact: 'Contact information',
      social: 'Social media accounts',
      properties: 'Property settings',
      requests: 'Request settings',
      advertising: 'Advertising settings',
      seo: 'SEO settings',
      'privacy-security': 'Privacy and security settings',
      display: 'Display settings'
    },
    descriptions: {
      platform: 'Update approved platform data while preserving versioning and auditability.',
      contact: 'Maintain public contact data from the approved administrative projection.',
      social: 'Manage optional social links from the approved settings source.',
      properties: 'Edit only the property settings present in the approved administrative projection.',
      requests: 'Edit existing request settings without inventing operational rules.',
      advertising: 'Manage approved advertising values without universal prices or payment claims.',
      seo: 'Manage approved SEO values while respecting their publication state.',
      'privacy-security': 'Manage approved privacy and security values without exposing secrets or private data.',
      display: 'Manage approved display values with versioning and auditability.'
    },
    fields: {
      platform_name: 'Platform name',
      short_name: 'Short name',
      description: 'Description',
      city: 'City',
      timezone: 'Timezone',
      currency: 'Currency',
      default_locale: 'Default language',
      primary_email: 'Email',
      primary_phone: 'Phone',
      office_address: 'Office address',
      working_hours: 'Working hours',
      whatsapp_number: 'WhatsApp',
      map_url: 'Map link',
      facebook_url: 'Facebook',
      instagram_url: 'Instagram',
      linkedin_url: 'LinkedIn',
      youtube_url: 'YouTube',
      tiktok_url: 'TikTok'
    },
    locales: { ar: 'Arabic', en: 'English',},
    save: 'Save changes',
    saving: 'Saving',
    retry: 'Retry',
    reason: 'Change reason',
    reasonPlaceholder: 'Write a clear reason of at least three characters',
    reasonRequired: 'A change reason is required.',
    saved: 'Settings saved.',
    validation: 'Check the fields and try again.',
    version: 'Version',
    schemaVersion: 'Schema version',
    preservedValues: 'Other approved values are preserved when this screen is saved.',
    unavailableAction: 'Create settings draft',
    states: {
      loading: { title: 'Loading settings', body: 'Fetching the safe administrative projection.' },
      empty: { title: 'Settings are not available yet', body: 'This namespace has not been created. No unverified production values are added.' },
      error: { title: 'Settings could not load', body: 'Check the connection and try again.' },
      retry: { title: 'Connection temporarily unavailable', body: 'Retry without losing the current values.' },
      permission: { title: 'Access is not permitted', body: 'This screen requires an administrator session and the matching API permission.' },
      conflict: { title: 'Version conflict', body: 'The settings changed since the last load. Reload the projection and review it before saving.' },
      success: { title: 'Settings ready', body: 'Values are rendered from the approved administrative projection.' },
      not_found: { title: 'Route not found', body: 'No matching settings namespace exists.' }
    },
    directionNote: 'English LTR — platform settings are approved for desktop.'
  },};

const extendedFieldCopy: Readonly<Record<SupportedLocale, Readonly<Record<string, string>>>> = {
  ar: {
    requires_admin_review: 'المراجعة الإدارية مطلوبة قبل النشر', publication_after_approval: 'سلوك النشر بعد الاعتماد', automatic_expiry: 'انتهاء صلاحية العقار تلقائيًا', max_images: 'الحد الأقصى للصور', accepted_image_formats: 'صيغ الصور المقبولة', max_image_size_mb: 'الحد الأقصى للحجم (MB)', hide_provider_contact: 'إخفاء بيانات تواصل المقدم في القوائم', contact_visibility: 'قواعد رؤية بيانات التواصل', supported_placements: 'مواضع الإعلان المدعومة', supported_ad_types: 'أنواع الإعلان المدعومة', desktop_dimensions: 'أبعاد Desktop المطلوبة', mobile_dimensions: 'أبعاد Mobile المطلوبة', accepted_file_formats: 'صيغ الملفات المقبولة', quote_validity_days: 'صلاحية عرض السعر (أيام)', payment_proof_methods: 'طرق إثبات الدفع', default_seo_title: 'عنوان SEO الافتراضي', default_meta_description: 'الوصف الافتراضي (Meta Description)', title_separator: 'فاصل العنوان', canonical_domain: 'النطاق الأساسي', allow_indexing: 'السماح بفهرسة الصفحات افتراضيًا', sitemap_status: 'حالة Sitemap', google_search_console_verification: 'كود التحقق من Google Search Console', hide_customer_contact: 'إخفاء بيانات تواصل العميل عن غير المصرح لهم', hide_internal_notes: 'الملاحظات الداخلية لا تظهر خارج الإدارة', hide_private_documents: 'المستندات الخاصة لا تُعرض علنًا', admin_session_timeout_minutes: 'مدة انتهاء جلسة الإدارة (دقائق)', two_factor_authentication: 'المصادقة الثنائية', page_direction: 'اتجاه الصفحة', page_size: 'عدد النتائج في الصفحة', population_count: 'قيمة عداد السكان', population_label: 'النص التوضيحي للعداد', show_population_counter: 'إظهار العداد في الصفحة الرئيسية', blocked_word_review: 'مراجعة تلقائية بالكلمات المحظورة', blocked_words: 'الكلمات المحظورة (كلمة في كل سطر)', blocked_word_action: 'الإجراء التلقائي عند الاكتشاف', daily_post_limit: 'الحد الأقصى للمنشورات يوميًا', moderation_wait_hours: 'وقت انتظار المراجعة (ساعات)', option_automatic: 'نشر تلقائي', option_manual: 'نشر يدوي', option_never: 'لا ينتهي', option_30_days: '30 يومًا', option_60_days: '60 يومًا', option_90_days: '90 يومًا', option_authenticated: 'للمستخدمين المسجلين فقط', option_public: 'للجميع', option_after_request: 'بعد إرسال طلب', option_active: 'نشط', option_inactive: 'غير نشط', option_arabic: 'العربية', option_english: 'الإنجليزية', option_rtl: 'RTL (يمين لليسار)', option_ltr: 'LTR (يسار لليمين)', option_manual_review: 'إرسال للمراجعة اليدوية', option_reject: 'رفض تلقائي'
  },
  en: {
    requires_admin_review: 'Require administrative review before publishing', publication_after_approval: 'Publishing after approval', automatic_expiry: 'Automatic property expiry', max_images: 'Maximum images', accepted_image_formats: 'Accepted image formats', max_image_size_mb: 'Maximum file size (MB)', hide_provider_contact: 'Hide provider contact in listings', contact_visibility: 'Contact visibility', supported_placements: 'Supported advertising placements', supported_ad_types: 'Supported advertising types', desktop_dimensions: 'Required desktop dimensions', mobile_dimensions: 'Required mobile dimensions', accepted_file_formats: 'Accepted file formats', quote_validity_days: 'Quote validity (days)', payment_proof_methods: 'Payment proof methods', default_seo_title: 'Default SEO title', default_meta_description: 'Default meta description', title_separator: 'Title separator', canonical_domain: 'Canonical domain', allow_indexing: 'Allow pages to be indexed by default', sitemap_status: 'Sitemap status', google_search_console_verification: 'Google Search Console verification code', hide_customer_contact: 'Hide customer contact from unauthorized users', hide_internal_notes: 'Keep internal notes inside administration', hide_private_documents: 'Keep private documents out of public views', admin_session_timeout_minutes: 'Admin session timeout (minutes)', two_factor_authentication: 'Two-factor authentication', page_direction: 'Page direction', page_size: 'Results per page', population_count: 'Population counter value', population_label: 'Population counter label', show_population_counter: 'Show counter on homepage', blocked_word_review: 'Review blocked words automatically', blocked_words: 'Blocked words (one per line)', blocked_word_action: 'Action when detected', daily_post_limit: 'Maximum posts per day', moderation_wait_hours: 'Moderation wait time (hours)', option_automatic: 'Publish automatically', option_manual: 'Publish manually', option_never: 'Never expires', option_30_days: '30 days', option_60_days: '60 days', option_90_days: '90 days', option_authenticated: 'Authenticated users only', option_public: 'Everyone', option_after_request: 'After a request', option_active: 'Active', option_inactive: 'Inactive', option_arabic: 'Arabic', option_english: 'English', option_rtl: 'RTL (right to left)', option_ltr: 'LTR (left to right)', option_manual_review: 'Send to manual review', option_reject: 'Reject automatically'
  }
};

export function getAdminSettingsCopy(locale: SupportedLocale): AdminSettingsCopy {
  const copy = copyByLocale[locale];
  return { ...copy, fields: { ...copy.fields, ...extendedFieldCopy[locale] }, selectPlaceholder: locale === 'ar' ? 'اختر قيمة' : 'Select a value' };
}
