import type { GuideSection, GuideTopic } from './content.ts';
import { SETTINGS_FIELD_HELP } from '../admin_settings/field-help.ts';
import { getAdminSettingsCopy } from '../admin_settings/copy.ts';

const groups: Record<string, string[]> = {
  platform: ['platform_name', 'short_name', 'description', 'city', 'timezone', 'currency', 'default_locale', 'primary_email'],
  contact: ['primary_phone', 'whatsapp_number', 'office_address', 'working_hours', 'map_url', 'facebook_url', 'instagram_url'],
  social: ['facebook_url', 'instagram_url'],
  properties: ['requires_admin_review', 'publication_after_approval', 'automatic_expiry', 'max_images', 'accepted_image_formats', 'max_image_size_mb'],
  advertising: ['supported_placements', 'supported_ad_types', 'desktop_dimensions', 'mobile_dimensions', 'accepted_file_formats', 'quote_validity_days', 'payment_proof_methods', 'vodafone_cash_payment_details', 'instapay_payment_details', 'bank_transfer_payment_details', 'cash_payment_details'],
  seo: ['default_seo_title', 'default_meta_description', 'title_separator', 'canonical_domain', 'allow_indexing', 'sitemap_status', 'google_search_console_verification'],
  'privacy-security': ['hide_customer_contact', 'hide_internal_notes', 'hide_private_documents', 'admin_session_timeout_minutes', 'two_factor_authentication'],
  display: ['show_population_counter', 'population_label', 'blocked_word_review', 'blocked_words', 'blocked_word_action', 'daily_post_limit', 'moderation_wait_hours'],
  requests: []
};
const copy = getAdminSettingsCopy('ar');
export const SETTINGS_REFERENCE: GuideSection = {
  id: 'settings-reference', title: 'شرح كل الإعدادات العامة', description: 'معنى كل خانة وتأثيرها الفعلي، والقيم الافتراضية والحقول القديمة المحفوظة.',
  topics: Object.entries(groups).map(([namespace, keys]): GuideTopic => ({
    id: `settings-reference-${namespace}`, title: copy.labels[namespace as keyof typeof copy.labels],
    summary: copy.descriptions[namespace as keyof typeof copy.descriptions],
    before: 'صلاحية عرض الإعدادات للقراءة، وصلاحية إدارتها للحفظ. كل قسم يُحفظ على حدة.',
    steps: namespace === 'requests' ? ['لا توجد مفاتيح عامة مهيأة للطلبات حاليًا؛ لا تضف أسماء إعدادات من عندك.', 'افتح إدارة طلبات العملاء للمتابعة واختيار الطلب.', 'راجع حالة الطلب وتكليفاته ومواعيده من صفحته؛ تعديل إعدادات العقارات لا يغير بيانات الطلب.'] : [
      'راجع القيم المحفوظة، ثم اقرأ شرح الخانة قبل تعديلها. القيم القديمة التي لا تتحكم في سلوك حالي تظل محفوظة دون تقديمها كمفاتيح تشغيل.',
      'في النصوص املأ اللغة المطلوبة. في القوائم اكتب كل عنصر في سطر. الخانة الفارغة ليست دائمًا إيقافًا؛ راجع معناها الموضح أدناه.',
      'اكتب سببًا واضحًا لا يقل عن ثلاثة أحرف واحفظ التغييرات. انتظر رسالة النجاح، ثم أعد فتح القسم للتأكد.',
      'عند تعارض النسخة لا تكرر الحفظ عشوائيًا؛ حمّل آخر نسخة مع الاحتفاظ بتعديلاتك، قارن القيم ثم أعد الحفظ.',
      ...(namespace === 'properties' ? ['الافتراضي: المراجعة مطلوبة، النشر يدوي، بلا انتهاء، حتى 50 صورة JPG/PNG و10 ميجابايت للصورة. تعديل الحدود لا يحذف الصور القديمة.'] : []),
      ...(namespace === 'display' ? ['الافتراضي: عداد السكان ظاهر إن توفرت قيمة منشورة، فحص الكلمات متوقف، ولا حد يومي إضافي أو مهلة مراجعة محددة. لغة الصفحة واتجاهها يتبعان اختيار الزائر؛ حجم القائمة يتبع الصفحة نفسها.'] : []),
      ...(namespace === 'privacy-security' ? ['حماية المستندات والبيانات الخاصة مفروضة بالصلاحيات، ولا يمكن تحويلها إلى محتوى عام بالمفاتيح القديمة. المصادقة الإضافية غير مفعلة افتراضيًا.'] : []),
      ...(namespace === 'contact' || namespace === 'social' ? ['إذا كان الحقل موجودًا في أكثر من تبويب فالأحدث حفظًا هو المرجع. تحقق من الفوتر وأزرار التواصل بعد الحفظ.'] : [])
    ],
    fields: keys.length ? keys.map(key => [copy.fields[key] ?? key, SETTINGS_FIELD_HELP[key]?.[0] ?? 'راجع وصف الحقل في النموذج.']) : [['إعدادات الطلبات', 'لا توجد اختيارات عامة مهيأة حاليًا؛ متابعة الحالة من إدارة طلبات العملاء.']],
    result: 'تعرف بالضبط ما الذي تغيّر، وتراجع القيمة المحفوظة وتأثيرها في مكانها المناسب.',
    questions: [['هل كل قيمة محفوظة تغيّر الموقع فورًا؟', 'لا. بعض تفضيلات المنصة بيانات تعريفية فقط. النصوص العامة من إدارة المحتوى، والبانرات من إدارة البانرات، والعنوان في نتائج البحث من SEO. شرح كل خانة يحدد تأثيرها.']],
    links: [{ label: 'فتح الإعدادات', path: `/admin/settings/${namespace}` }, ...(namespace === 'requests' ? [{ label: 'طلبات العملاء', path: '/admin/requests' }] : []), ...(namespace === 'display' ? [{ label: 'إحصاءات المدينة', path: '/admin/content/population-counter' }] : [])]
  }))
};

export function followupGuideTopic(topic: GuideTopic): GuideTopic {
  if (topic.id === 'banner-create') return { ...topic,
    steps: [...topic.steps, 'اختر صور الإعلان واكتب العنوان والمحتوى؛ المعاينة أسفل النموذج تتغير فورًا قبل الحفظ والرفع، ويمكن التبديل بين الهاتف واللابتوب.', 'افتح «نص ورابط كل صورة» لتخصيص عنوان ووصف ورابط لكل شريحة. الخانة الفارغة تستخدم بيانات البانر العامة. احفظ بعد تعديل الصور أو نصوصها.', 'اترك «الإبقاء على مقدمة الرئيسية الأصلية» مفعّلًا لظهورها مع الإعلان. بانرات المنصة والشركات سجلات مستقلة؛ أضف بانرًا جديدًا للشركة بدل تعديل بانر المنصة. يمكن نشر أكثر من بانر رئيسي في الفترة نفسها ضمن السعة المحددة.', 'إذا ظهر تجهيز وتفعيل مكان البانر اضغطه أولًا، ثم احفظ المسودة وانشرها. مجرد المعاينة لا ينشر. صورة الهاتف تظهر كاملة والنص أسفلها؛ اللابتوب يعرض خلفية ممتدة خلف البحث.'],
    fields: [...topic.fields, ['نص كل صورة', 'عنوان ووصف ورابط مستقل اختياري. بانرات البطاقات المميزة لها محررها ووجهتها المعتمدة.'], ['مدة الصورة', 'من 3 إلى 60 ثانية لكل صورة؛ الحركة تتوقف مع تفضيل تقليل الحركة أو إخفاء التبويب.']]
  };
  if (topic.id === 'tips-home') return { ...topic,
    fields: [['رابط صورة النصيحة', 'اختياري: رابط HTTPS مباشر لملف صورة. يظهر بجوار النص في المعاينة؛ ليس رابط انتقال أو صفحة مقال. اتركه فارغًا لنصيحة نصية.'], ['وصف القسم', 'للمسح احذف الوصف باللغتين ثم احفظ؛ لن يعود النص القديم. إذا بقيت ترجمة واحدة يستخدمها الموقع عند غياب الترجمة الأخرى.'], ['القسم والترتيب', 'اختر القسم باسمه؛ ترتيبه داخل الصفحة ثابت. رقم الترتيب يخص قائمة الإدارة فقط.']],
    steps: ['اختر القسم الموجود واضغط تعديل؛ لا تضف سجلًا آخر لنفس القسم.', 'عدّل العنوان والوصف، أو امسح الوصف باللغتين لإخفائه. اختر عرض النص في الرئيسية، واكتب السبب واحفظ.', 'انتظر إغلاق النموذج ثم افتحه مجددًا لمراجعة القيمة الفعلية. المسودة لا تظهر للزوار، وإيقاف النص المخصص يعيد النص الافتراضي.', 'نص النصيحة نفسه تكتبه الإدارة؛ الصورة اختيارية وتظهر في المعاينة أثناء الكتابة. المقالات تُضاف من إدارة المقالات ويظهر أحدث ثلاثة منشورة بتصنيف نشط.'],
    questions: [['لماذا ظل النص بعد المسح؟', 'راجع خانة اللغة الأخرى، وحالة النشر. بانر شركة نشط له نص مستقل يعلو نص المقدمة؛ عدّله من البانرات. التحديث يصلح عدم إرسال مسح الوصف وإعادة فتح نموذج الرابط المباشر.']]
  };
  if (['platform-contact', 'property-request-settings', 'seo-display', 'privacy'].includes(topic.id)) return { ...topic,
    steps: ['افتح «شرح كل الإعدادات العامة» في الدليل واختر القسم؛ ستجد معنى كل خانة وتأثيرها الفعلي والقيم الافتراضية.', 'عدّل الحقول التي تحتاجها فقط، وراجع تأثير كل حقل قبل الحفظ.', 'احفظ كل قسم بسبب واضح، ثم أعد فتحه للتحقق. لا تعتمد على قيم قديمة مخزنة لتغيير اللغة أو نشر البيانات الخاصة.'],
    questions: [['أين شرح كل خانة؟', 'في قسم «شرح كل الإعدادات العامة»؛ النص نفسه موجود بجانب الحقول في صفحة الإعدادات.']],
    fields: [['شرح الخانات', 'المعنى والقيم الافتراضية والتأثير الفعلي في قسم شرح كل الإعدادات العامة.']], links: [...topic.links, { label: 'الإعدادات العامة', path: '/admin/settings' }]
  };
  return topic;
}
