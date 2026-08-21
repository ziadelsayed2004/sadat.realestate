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
  readonly locales: Readonly<Record<'ar' | 'en' | 'zh-CN', string>>;
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

const copyByLocale: Readonly<Record<SupportedLocale, AdminSettingsCopy>> = {
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
    locales: { ar: 'العربية', en: 'English', 'zh-CN': '简体中文' },
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
    locales: { ar: 'Arabic', en: 'English', 'zh-CN': 'Simplified Chinese' },
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
  },
  'zh-CN': {
    eyebrow: '平台设置',
    platform: '平台信息',
    contact: '联系信息',
    social: '社交媒体账号',
    labels: {
      platform: '平台信息',
      contact: '联系信息',
      social: '社交媒体账号',
      properties: '房产设置',
      requests: '请求设置',
      advertising: '广告设置',
      seo: 'SEO 设置',
      'privacy-security': '隐私与安全设置',
      display: '显示设置'
    },
    descriptions: {
      platform: '在保留版本和审计信息的情况下更新已批准的平台数据。',
      contact: '从已批准的管理投影维护公开联系信息。',
      social: '从已批准的设置来源管理可选社交链接。',
      properties: '仅编辑已批准管理投影中存在的房产设置。',
      requests: '编辑现有请求设置，不虚构运营规则。',
      advertising: '管理已批准的广告值，不添加统一价格或支付声明。',
      seo: '管理已批准的 SEO 值，并遵守其发布状态。',
      'privacy-security': '管理已批准的隐私与安全值，不暴露密钥或私密数据。',
      display: '管理已批准的显示值，并保留版本与审计信息。'
    },
    fields: {
      platform_name: '平台名称',
      short_name: '简称',
      description: '描述',
      city: '城市',
      timezone: '时区',
      currency: '货币',
      default_locale: '默认语言',
      primary_email: '电子邮箱',
      primary_phone: '电话',
      office_address: '办公室地址',
      working_hours: '工作时间',
      whatsapp_number: 'WhatsApp',
      map_url: '地图链接',
      facebook_url: 'Facebook',
      instagram_url: 'Instagram',
      linkedin_url: 'LinkedIn',
      youtube_url: 'YouTube',
      tiktok_url: 'TikTok'
    },
    locales: { ar: '阿拉伯语', en: 'English', 'zh-CN': '简体中文' },
    save: '保存更改',
    saving: '正在保存',
    retry: '重试',
    reason: '更改原因',
    reasonPlaceholder: '请输入至少三个字符的明确原因',
    reasonRequired: '必须填写更改原因。',
    saved: '设置已保存。',
    validation: '请检查字段后重试。',
    version: '版本',
    schemaVersion: '架构版本',
    preservedValues: '保存此页面时会保留其他已批准的值。',
    unavailableAction: '创建设置草稿',
    states: {
      loading: { title: '正在加载设置', body: '正在获取安全的管理投影。' },
      empty: { title: '设置尚不可用', body: '此命名空间尚未创建。不添加未经验证的生产值。' },
      error: { title: '无法加载设置', body: '请检查连接后重试。' },
      retry: { title: '连接暂时不可用', body: '可以在不丢失当前值的情况下重试。' },
      permission: { title: '无法访问', body: '此页面需要管理员会话和匹配的 API 权限。' },
      conflict: { title: '版本冲突', body: '设置在上次加载后发生变化。请重新加载投影并在保存前检查。' },
      success: { title: '设置已就绪', body: '值来自已批准的管理投影。' },
      not_found: { title: '未找到路由', body: '不存在匹配的设置命名空间。' }
    },
    directionNote: '简体中文 LTR — 平台设置仅批准用于桌面端。'
  }
};

export function getAdminSettingsCopy(locale: SupportedLocale): AdminSettingsCopy {
  return copyByLocale[locale];
}
