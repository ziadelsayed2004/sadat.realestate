import type { ArticleAvailableAction, ArticleStatus, SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminContentState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'success';

export interface AdminContentCopy {
  readonly eyebrow: string;
  readonly articlesTitle: string;
  readonly articlesDescription: string;
  readonly categoriesTitle: string;
  readonly categoriesDescription: string;
  readonly createArticle: string;
  readonly createCategory: string;
  readonly categories: string;
  readonly articles: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly edit: string;
  readonly save: string;
  readonly saving: string;
  readonly cancel: string;
  readonly retry: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number, total: number) => string;
  readonly noActions: string;
  readonly id: string;
  readonly title: string;
  readonly name: string;
  readonly slug: string;
  readonly category: string;
  readonly description: string;
  readonly body: string;
  readonly order: string;
  readonly active: string;
  readonly version: string;
  readonly updated: string;
  readonly actions: string;
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly titleRequired: string;
  readonly categoryRequired: string;
  readonly action: Readonly<Record<ArticleAvailableAction, string>>;
  readonly status: Readonly<Record<ArticleStatus, string>>;
  readonly states: Readonly<Record<AdminContentState, { readonly title: string; readonly body: string }>>;
  readonly saved: string;
  readonly deleted: string;
  readonly directionNote: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, AdminContentCopy>> = {
  ar: {
    eyebrow: 'إدارة المحتوى', articlesTitle: 'إدارة المقالات', articlesDescription: 'أنشئ المقالات وراجعها وانشرها وفق الصلاحيات المعتمدة.',
    categoriesTitle: 'تصنيفات المقالات', categoriesDescription: 'نظّم تصنيفات المحتوى مع الحفاظ على ترتيبها وحالتها.', createArticle: 'إنشاء مقال', createCategory: 'إضافة تصنيف', categories: 'التصنيفات', articles: 'المقالات',
    searchLabel: 'البحث', searchPlaceholder: 'ابحث بالعنوان أو المعرّف المختصر', statusLabel: 'الحالة', allStatuses: 'كل الحالات', apply: 'تطبيق', clear: 'مسح', edit: 'تعديل', save: 'حفظ', saving: 'جارٍ الحفظ', cancel: 'إلغاء', retry: 'إعادة المحاولة', previous: 'السابق', next: 'التالي', page: (page, total) => `الصفحة ${page} من ${total}`, noActions: 'لا توجد إجراءات متاحة',
    id: 'المعرّف', title: 'العنوان', name: 'اسم التصنيف', slug: 'المعرّف المختصر', category: 'التصنيف', description: 'الوصف', body: 'المحتوى', order: 'الترتيب', active: 'نشط', version: 'الإصدار', updated: 'آخر تحديث', actions: 'الإجراءات', reason: 'سبب التغيير', reasonPlaceholder: 'اكتب سبباً واضحاً من خمسة أحرف على الأقل', reasonRequired: 'سبب التغيير مطلوب.', titleRequired: 'العنوان والمحتوى مطلوبان بالعربية أو الإنجليزية أو الصينية.', categoryRequired: 'اختر تصنيفاً.',
    action: { update: 'تعديل', submit: 'إرسال للمراجعة', publish: 'نشر', return_to_draft: 'إعادة لمسودة', archive: 'أرشفة', restore: 'استعادة' },
    status: { draft: 'مسودة', pending_review: 'قيد المراجعة', published: 'منشور', archived: 'مؤرشف' },
    states: { loading: { title: 'جارٍ تحميل المحتوى', body: 'يتم جلب البيانات من المصدر المعتمد.' }, empty: { title: 'لا توجد سجلات', body: 'لا توجد بيانات مطابقة للبحث أو الفلتر الحالي.' }, error: { title: 'تعذر تحميل المحتوى', body: 'تحقق من الاتصال وحاول مرة أخرى.' }, retry: { title: 'الاتصال غير متاح مؤقتاً', body: 'يمكن إعادة المحاولة دون تغيير البيانات.' }, permission: { title: 'الوصول غير متاح', body: 'تحتاج هذه الصفحة إلى جلسة مدير وصلاحية المحتوى المناسبة.' }, success: { title: 'المحتوى جاهز', body: 'تُعرض البيانات من الإسقاط المعتمد للخادم.' } },
    saved: 'تم الحفظ.', deleted: 'تم حذف التصنيف.', directionNote: 'العربية RTL — إدارة المحتوى معتمدة لسطح المكتب.'
  },
  en: {
    eyebrow: 'Content administration', articlesTitle: 'Article management', articlesDescription: 'Create, review, and publish articles using the server-approved permissions.', categoriesTitle: 'Article categories', categoriesDescription: 'Organize content categories while preserving their order and state.', createArticle: 'Create article', createCategory: 'Add category', categories: 'Categories', articles: 'Articles',
    searchLabel: 'Search', searchPlaceholder: 'Search by title or slug', statusLabel: 'Status', allStatuses: 'All statuses', apply: 'Apply', clear: 'Clear', edit: 'Edit', save: 'Save', saving: 'Saving', cancel: 'Cancel', retry: 'Retry', previous: 'Previous', next: 'Next', page: (page, total) => `Page ${page} of ${total}`, noActions: 'No actions available',
    id: 'ID', title: 'Title', name: 'Category name', slug: 'Slug', category: 'Category', description: 'Description', body: 'Body', order: 'Order', active: 'Active', version: 'Version', updated: 'Updated', actions: 'Actions', reason: 'Change reason', reasonPlaceholder: 'Write a clear reason of at least five characters', reasonRequired: 'A change reason is required.', titleRequired: 'Provide a title and body in Arabic or English.', categoryRequired: 'Choose a category.',
    action: { update: 'Edit', submit: 'Submit for review', publish: 'Publish', return_to_draft: 'Return to draft', archive: 'Archive', restore: 'Restore' },
    status: { draft: 'Draft', pending_review: 'Under review', published: 'Published', archived: 'Archived' },
    states: { loading: { title: 'Loading content', body: 'Fetching records from the approved source.' }, empty: { title: 'No records found', body: 'No records match the current search or filter.' }, error: { title: 'Content could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator session and the matching content permission.' }, success: { title: 'Content ready', body: 'Records are rendered from the server-approved projection.' } },
    saved: 'Saved.', deleted: 'Category deleted.', directionNote: 'English LTR — content administration is approved for desktop.'
  },};

export function getAdminContentCopy(locale: SupportedLocale): AdminContentCopy {
  return copyByLocale[locale];
}

export type AdminCmsState = 'loading' | 'empty' | 'error' | 'retry' | 'permission' | 'success' | 'not_found';

export interface AdminCmsCopy {
  readonly eyebrow: string;
  readonly namespace: Readonly<Record<string, string>>;
  readonly description: Readonly<Record<string, string>>;
  readonly add: string;
  readonly save: string;
  readonly saving: string;
  readonly preview: string;
  readonly hidePreview: string;
  readonly cancel: string;
  readonly retry: string;
  readonly key: string;
  readonly name: string;
  readonly title: string;
  readonly body: string;
  readonly order: string;
  readonly status: string;
  readonly active: string;
  readonly value: string;
  readonly sourceLabel: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly localizedHint: string;
  readonly noData: string;
  readonly unavailable: string;
  readonly states: Readonly<Record<AdminCmsState, { readonly title: string; readonly body: string }>>;
  readonly statusLabels: Readonly<Record<'draft' | 'published' | 'inactive' | 'available' | 'unavailable', string>>;
}

const cmsCopyByLocale: Readonly<Record<SupportedLocale, AdminCmsCopy>> = {
  ar: {
    eyebrow: '\u0625\u062f\u0627\u0631\u0629 \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0645\u0646\u0635\u0629',
    namespace: { about: '\u0639\u0646 \u0627\u0644\u0645\u0646\u0635\u0629', team: '\u0641\u0631\u064a\u0642 \u0627\u0644\u0639\u0645\u0644', population: '\u0639\u062f\u0627\u062f \u0633\u0643\u0627\u0646 \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a', tips: '\u0646\u0635\u0627\u0626\u062d \u0639\u0642\u0627\u0631\u064a\u0629' },
    description: { about: '\u0623\u062f\u0631 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0638\u0627\u0647\u0631 \u0641\u064a \u0635\u0641\u062d\u0629 \u0639\u0646 \u0627\u0644\u0645\u0646\u0635\u0629.', team: '\u062d\u0627\u0641\u0638 \u0639\u0644\u0649 \u062a\u0631\u062a\u064a\u0628 \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0641\u0631\u064a\u0642 \u0648\u0639\u0631\u0636\u0647\u0645 \u0628\u0623\u0645\u0627\u0646.', population: '\u062d\u062f\u062b \u0639\u062f\u0627\u062f \u0627\u0644\u0633\u0643\u0627\u0646 \u0645\u0646 \u0645\u0635\u062f\u0631 \u0645\u0639\u062a\u0645\u062f \u0641\u0642\u0637.', tips: '\u0623\u062f\u0631 \u0627\u0644\u0646\u0635\u0627\u0626\u062d \u0627\u0644\u0639\u0642\u0627\u0631\u064a\u0629 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629.' },
    add: '\u0625\u0636\u0627\u0641\u0629', save: '\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a', saving: '\u062c\u0627\u0631\u064d \u0627\u0644\u062d\u0641\u0638', preview: '\u0645\u0639\u0627\u064a\u0646\u0629', hidePreview: '\u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629', cancel: '\u0625\u0644\u063a\u0627\u0621', retry: '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629',
    key: '\u0627\u0644\u0645\u0641\u062a\u0627\u062d', name: '\u0627\u0644\u0627\u0633\u0645', title: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646', body: '\u0627\u0644\u0645\u062d\u062a\u0648\u0649', order: '\u0627\u0644\u062a\u0631\u062a\u064a\u0628', status: '\u0627\u0644\u062d\u0627\u0644\u0629', active: '\u0646\u0634\u0637', value: '\u0627\u0644\u0642\u064a\u0645\u0629', sourceLabel: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0635\u062f\u0631', sourceUrl: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0635\u062f\u0631', asOf: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u064a\u0627\u0646', reason: '\u0633\u0628\u0628 \u0627\u0644\u062a\u063a\u064a\u064a\u0631', reasonPlaceholder: '\u0627\u0643\u062a\u0628 \u0633\u0628\u0628\u064b\u0627 \u0648\u0627\u0636\u062d\u064b\u0627', reasonRequired: '\u0633\u0628\u0628 \u0627\u0644\u062a\u063a\u064a\u064a\u0631 \u0645\u0637\u0644\u0648\u0628.', localizedHint: '\u0623\u062f\u062e\u0644 \u0627\u0644\u0646\u0635 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0648\u0627\u0644\u0635\u064a\u0646\u064a\u0629 \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629.', noData: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062a\u0627\u062d\u0629.', unavailable: '\u0627\u0644\u0642\u064a\u0645\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629',
    states: { loading: { title: '\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u062d\u062a\u0648\u0649', body: '\u064a\u062a\u0645 \u062c\u0644\u0628 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0646 \u0627\u0644\u0645\u0635\u062f\u0631 \u0627\u0644\u0645\u0639\u062a\u0645\u062f.' }, empty: { title: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a', body: '\u0623\u0636\u0641 \u0645\u062d\u062a\u0648\u0649 \u064b\u0627 \u0644\u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629.' }, error: { title: '\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u062d\u062a\u0648\u0649', body: '\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.' }, retry: { title: '\u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d', body: '\u064a\u0645\u0643\u0646 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u062f\u0648\u0646 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.' }, permission: { title: '\u0627\u0644\u0648\u0635\u0648\u0644 \u063a\u064a\u0631 \u0645\u0645\u0643\u0646', body: '\u062a\u062d\u062a\u0627\u062c \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629 \u0625\u0644\u0649 \u062c\u0644\u0633\u0629 \u0645\u062f\u064a\u0631 \u0645\u0635\u7a90\u0644\u062d.' }, success: { title: '\u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u062c\u0627\u0647\u0632', body: '\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u0645\u0639\u0627\u064a\u0646\u0629.' }, not_found: { title: '\u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f', body: '\u0627\u0644\u0645\u0633\u0627\u0631 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641.' } },
    statusLabels: { draft: '\u0645\u0633\u0648\u062f\u0629', published: '\u0645\u0646\u0634\u0648\u0631', inactive: '\u063a\u064a\u0631 \u0646\u0634\u0637', available: '\u0645\u062a\u0627\u062d', unavailable: '\u063a\u064a\u0631 \u0645\u062a\u0627\u062d' }
  },
  en: {
    eyebrow: 'Platform content administration', namespace: { about: 'About platform', team: 'Team', population: 'Population counter' }, description: { about: 'Manage the approved About page content.', team: 'Maintain the approved team projection and ordering.', population: 'Update the population counter only from an approved source.' }, add: 'Add', save: 'Save changes', saving: 'Saving', preview: 'Preview', hidePreview: 'Hide preview', cancel: 'Cancel', retry: 'Retry', key: 'Key', name: 'Name', title: 'Title', body: 'Body', order: 'Order', status: 'Status', active: 'Active', value: 'Population value', sourceLabel: 'Source label', sourceUrl: 'Source URL', asOf: 'As of', reason: 'Change reason', reasonPlaceholder: 'Write a clear reason for this change', reasonRequired: 'A change reason is required.', localizedHint: 'Provide approved copy in Arabic or English as applicable.', noData: 'No content is available yet.', unavailable: 'Value unavailable', states: { loading: { title: 'Loading content', body: 'Fetching records from the approved CMS source.' }, empty: { title: 'No records found', body: 'Create a draft record to establish the approved content state.' }, error: { title: 'Content could not load', body: 'Check the connection and try again.' }, retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' }, permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator content session.' }, success: { title: 'Content ready', body: 'The server-approved projection is ready for editing or preview.' }, not_found: { title: 'Content route not found', body: 'The requested content namespace is not available.' } }, statusLabels: { draft: 'Draft', published: 'Published', inactive: 'Inactive', available: 'Available', unavailable: 'Unavailable' }
  },};

export function getAdminCmsCopy(locale: SupportedLocale): AdminCmsCopy {
  return cmsCopyByLocale[locale];
}
