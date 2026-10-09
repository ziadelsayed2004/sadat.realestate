import type { AdminSettingsNamespace, SupportedLocale } from '@sadat-real-estate/contracts';

export function settingsHelp(locale: SupportedLocale) {
  const ar = locale === 'ar';
  const descriptions: Record<AdminSettingsNamespace, string> = ar ? {
    platform: 'راجع اسم المنصة المحفوظ وبيانات المكتب، ثم عدّل الخانات المطلوبة واضغط حفظ التغييرات.',
    contact: 'أرقام التواصل وروابط الخريطة وفيسبوك وإنستجرام التي يستخدمها زوار الموقع.',
    social: 'روابط صفحات المنصة على مواقع التواصل الاجتماعي.',
    properties: 'اختيارات مراجعة العقارات ونشرها، وحدود الصور وظهور بيانات التواصل.',
    requests: 'راجع إعدادات متابعة طلبات العملاء المتاحة لحسابك.',
    advertising: 'مواضع الإعلانات ومقاسات الصور ومدة صلاحية عرض السعر وطرق إثبات الدفع.',
    seo: 'عنوان الموقع ووصفه في نتائج البحث، والرابط الأساسي وإعدادات الفهرسة.',
    'privacy-security': 'إعدادات حماية بيانات العملاء والمستندات، وأمان حسابات الإدارة.',
    display: 'اللغة واتجاه الصفحة وعدد النتائج، وعداد السكان وإعدادات منشورات المجتمع.'
  } : {
    platform: 'Review the saved platform name and office details, edit the fields you need, then save your changes.',
    contact: 'Contact numbers, map and social links used by visitors.', social: 'Links to the platform’s social media pages.',
    properties: 'Property review, publication, image limits and contact visibility choices.', requests: 'Review the customer request settings available to your account.',
    advertising: 'Advertising placements, image sizes, quote validity and payment proof methods.',
    seo: 'The site title and description in search results, canonical address and indexing settings.',
    'privacy-security': 'Customer data, document privacy and administrator account security settings.',
    display: 'Language, page direction, result count, population counter and community post settings.'
  };
  return { descriptions, guide: ar ? {
    original: 'الاسم الأساسي للموقع', savedName: 'الاسم المحفوظ في الإعدادات',
    originalHelp: 'ده اسم الموقع المعروف. تقدر تستخدمه بدل الاسم اللي بتكتبه في الخانات أدناه.',
    useOriginal: 'استخدام الاسم الأساسي', savedHelp: 'هذه آخر قيمة محفوظة، وتظل ظاهرة هنا أثناء تعديلك للخانات.',
    noSavedName: 'لم يُحفظ اسم بهذه اللغة هنا بعد.', restore: 'إلغاء تعديلاتي',
    history: 'سجل التعديلات السابقة', historyHelp: 'لو تقصد قيمة أقدم من المحفوظة حاليًا، افتح سجل الإجراءات واختار «إعدادات المنصة» لمراجعة البيانات قبل كل تغيير وبعده.',
    unsaved: 'عندك تعديلات لم تُحفظ بعد.', savedStatus: 'أنت تعرض آخر بيانات محفوظة.',
    nameSection: 'اسم المنصة ووصفها', officeSection: 'بيانات المكتب', advanced: 'خيارات إضافية',
    advancedHelp: 'اختيارات اللغة والعملة والتوقيت، وأي إعدادات إضافية محفوظة.',
    technical: 'تفاصيل الحفظ', viewSite: 'عرض الموقع', viewSearch: 'عنوان الموقع في نتائج البحث',
    nameNotice: 'الاسم هنا بيان تعريفي محفوظ للمنصة. الاسم المكتوب داخل صورة الشعار لا يتغير من هذه الخانة، وعنوان نتائج البحث له إعدادات منفصلة.',
    languageHelp: 'اكتب النص باللغة التي تريد استخدامها. الخانة الفارغة تعني أنه لا يوجد نص محفوظ بهذه اللغة.',
    before: 'المحفوظ الآن', notSet: 'غير محدد', fieldHelp: {
      platform_name: 'الاسم الكامل للمنصة، مثل «عقارات السادات».', short_name: 'اختصار الاسم لو احتجت نسخة أقصر، مثل «السادات».',
      description: 'نبذة قصيرة تشرح نشاط المنصة وخدماتها.', city: 'المدينة التي تعمل بها المنصة.',
      timezone: 'المدينة التي يوافق توقيتها مواعيد العمل، مثل القاهرة.', currency: 'عملة الأسعار الأساسية، مثل الجنيه المصري.',
      default_locale: 'لغة البداية المفضلة في الإعدادات.', primary_email: 'البريد الإداري المسجّل ضمن بيانات المنصة.',
      primary_phone: 'رقم المكتب المسجّل هنا. أزرار الاتصال العامة تُدار من تبويب معلومات التواصل.',
      office_address: 'عنوان المكتب أو مقر الشركة.', working_hours: 'أيام العمل ومواعيد فتح المكتب وإغلاقه.'
    }
  } : {
    original: 'Original website name', savedName: 'Name saved in settings',
    originalHelp: 'This is the familiar website name. You can use it in the fields below.',
    useOriginal: 'Use original name', savedHelp: 'This is the last saved value. It stays visible while you edit the fields.',
    noSavedName: 'No name has been saved here in this language yet.', restore: 'Discard my edits',
    history: 'Previous changes', historyHelp: 'For values older than the current saved name, open the action log and select “Platform settings” to compare the data before and after each change.',
    unsaved: 'You have changes that have not been saved.', savedStatus: 'You are viewing the latest saved values.',
    nameSection: 'Platform name and description', officeSection: 'Office details', advanced: 'Additional options',
    advancedHelp: 'Language, currency, timezone and any other saved settings.',
    technical: 'Save details', viewSite: 'View website', viewSearch: 'Website title in search results',
    nameNotice: 'This field stores the platform’s descriptive name. It does not replace text inside the logo image. The search result title has separate settings.',
    languageHelp: 'Enter text in the language you want to use. An empty field means no text is saved in that language.',
    before: 'Currently saved', notSet: 'Not set', fieldHelp: {
      platform_name: 'The full platform name, such as “Sadat Real Estate”.', short_name: 'An optional shorter version of the name, such as “Sadat”.',
      description: 'A short introduction to the platform and its services.', city: 'The city where the platform operates.',
      timezone: 'The timezone used for office hours, such as Cairo.', currency: 'The primary price currency, such as Egyptian pounds.',
      default_locale: 'The preferred starting language stored in settings.', primary_email: 'The administration email stored in platform details.',
      primary_phone: 'The office number stored here. Public call buttons are managed in Contact information.',
      office_address: 'The office or company address.', working_hours: 'Working days, opening and closing times.'
    }
  } };
}
