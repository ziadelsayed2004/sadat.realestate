import type { ProjectStatus, SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderProjectsCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly add: string;
  readonly countSuffix: string;
  readonly filtersLabel: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly noResultsTitle: string;
  readonly noResultsBody: string;
  readonly columns: Readonly<Record<'project' | 'slug' | 'status' | 'reason' | 'updated' | 'actions', string>>;
  readonly statuses: Readonly<Record<ProjectStatus, string>>;
  readonly viewUnavailable: string;
  readonly edit: string;
  readonly submit: string;
  readonly noActions: string;
  readonly reason: string;
  readonly form: {
    readonly createTitle: string;
    readonly editTitle: string;
    readonly createDescription: string;
    readonly editDescription: string;
    readonly name: string;
    readonly description: string;
    readonly slug: string;
    readonly locationId: string;
    readonly organizationId: string;
    readonly website: string;
    readonly reason: string;
    readonly reasonHelp: string;
    readonly save: string;
    readonly cancel: string;
    readonly close: string;
    readonly required: string;
    readonly localeLabels: Readonly<Record<SupportedLocale, string>>;
    readonly placeholders: Readonly<Record<'slug' | 'locationId' | 'organizationId' | 'website', string>>;
  };
  readonly submitDialog: {
    readonly title: string;
    readonly description: string;
    readonly reason: string;
    readonly reasonHelp: string;
    readonly confirm: string;
    readonly cancel: string;
  };
  readonly feedback: Readonly<Record<'created' | 'updated' | 'submitted', string>>;
  readonly errors: Readonly<Record<'validation' | 'generic' | 'conflict', string>>;
  readonly pagination: string;
  readonly previous: string;
  readonly next: string;
}

const statuses = {
  ar: { draft: 'مسودة', pending_review: 'قيد المراجعة', needs_changes: 'تحتاج تعديلات', approved: 'معتمد', published: 'منشور', rejected: 'مرفوض', hidden: 'مخفي', archived: 'مؤرشف' },
  en: { draft: 'Draft', pending_review: 'Pending review', needs_changes: 'Needs changes', approved: 'Approved', published: 'Published', rejected: 'Rejected', hidden: 'Hidden', archived: 'Archived' },} as const satisfies Readonly<Record<SupportedLocale, Readonly<Record<ProjectStatus, string>>>>;

const copy: Readonly<Record<SupportedLocale, ProviderProjectsCopy>> = {
  ar: {
    eyebrow: 'إدارة المشاريع', title: 'المشاريع', description: 'أدر المشاريع التابعة لحساب مزود العقار واعرض حالتها والإجراءات المتاحة من النظام.', add: 'إضافة مشروع جديد', countSuffix: 'مشروع',
    filtersLabel: 'تصفية المشاريع', searchLabel: 'بحث', searchPlaceholder: 'ابحث باسم المشروع أو الرابط المختصر', statusLabel: 'الحالة', allStatuses: 'كل الحالات', apply: 'تطبيق', clear: 'مسح الفلاتر', emptyTitle: 'لا توجد مشاريع بعد', emptyBody: 'ستظهر المشاريع التي يملكها حسابك هنا عند توفرها.', noResultsTitle: 'لا توجد نتائج مطابقة', noResultsBody: 'جرّب تغيير البحث أو الحالة.',
    columns: { project: 'المشروع', slug: 'الرابط المختصر', status: 'الحالة', reason: 'ملاحظة المراجعة', updated: 'آخر تحديث', actions: 'الإجراءات' }, statuses: statuses.ar, viewUnavailable: 'العرض التفصيلي غير متاح', edit: 'تعديل', submit: 'إرسال للمراجعة', noActions: 'لا توجد إجراءات متاحة', reason: 'السبب:',
    form: { createTitle: 'إضافة مشروع جديد', editTitle: 'تعديل المشروع', createDescription: 'أدخل البيانات التي يدعمها عقد المشروع الحالي.', editDescription: 'عدّل البيانات المملوكة للمشروع مع الاحتفاظ بإصدار الخادم.', name: 'اسم المشروع', description: 'الوصف', slug: 'الرابط المختصر', locationId: 'معرّف الموقع', organizationId: 'معرّف المؤسسة', website: 'الموقع الإلكتروني', reason: 'سبب التغيير', reasonHelp: 'مطلوب للتغييرات الحساسة ويسجل مع العملية.', save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق', required: 'مطلوب', localeLabels: { ar: 'العربية', en: 'English',}, placeholders: { slug: 'central-project', locationId: 'معرّف اختياري', organizationId: 'معرّف اختياري', website: 'https://example.com' } },
    submitDialog: { title: 'إرسال المشروع للمراجعة', description: 'سيرسل المشروع بالحالة والإصدار الحاليين إلى مسار المراجعة.', reason: 'سبب الإرسال', reasonHelp: 'اكتب سبباً واضحاً من 5 أحرف على الأقل.', confirm: 'إرسال', cancel: 'إلغاء' },
    feedback: { created: 'تم إنشاء المشروع.', updated: 'تم تحديث المشروع.', submitted: 'تم إرسال المشروع للمراجعة.' }, errors: { validation: 'راجع الحقول المطلوبة قبل الحفظ.', generic: 'تعذر حفظ التغيير. حاول مرة أخرى.', conflict: 'تغير المشروع على الخادم. أعد تحميل القائمة قبل المحاولة مرة أخرى.' }, pagination: 'صفحات المشاريع', previous: 'الصفحة السابقة', next: 'الصفحة التالية'
  },
  en: {
    eyebrow: 'Project management', title: 'Projects', description: 'Manage projects owned by your provider account and review their status and server-authorized actions.', add: 'Add new project', countSuffix: 'projects',
    filtersLabel: 'Filter projects', searchLabel: 'Search', searchPlaceholder: 'Search by project name or slug', statusLabel: 'Status', allStatuses: 'All statuses', apply: 'Apply', clear: 'Clear filters', emptyTitle: 'No projects yet', emptyBody: 'Projects owned by your provider account will appear here when available.', noResultsTitle: 'No matching projects', noResultsBody: 'Try changing the search or status filter.',
    columns: { project: 'Project', slug: 'Slug', status: 'Status', reason: 'Review note', updated: 'Updated', actions: 'Actions' }, statuses: statuses.en, viewUnavailable: 'Detailed view unavailable', edit: 'Edit', submit: 'Submit for review', noActions: 'No actions available', reason: 'Reason:',
    form: { createTitle: 'Add new project', editTitle: 'Edit project', createDescription: 'Enter fields supported by the current project contract.', editDescription: 'Edit provider-owned fields while preserving the server version.', name: 'Project name', description: 'Description', slug: 'Slug', locationId: 'Location ID', organizationId: 'Organization ID', website: 'Website', reason: 'Change reason', reasonHelp: 'Required for sensitive changes and recorded with the operation.', save: 'Save', cancel: 'Cancel', close: 'Close', required: 'Required', localeLabels: { ar: 'Arabic', en: 'English',}, placeholders: { slug: 'central-project', locationId: 'Optional ID', organizationId: 'Optional ID', website: 'https://example.com' } },
    submitDialog: { title: 'Submit project for review', description: 'The project will be sent to the review workflow with its current status and version.', reason: 'Submission reason', reasonHelp: 'Enter a clear reason of at least 5 characters.', confirm: 'Submit', cancel: 'Cancel' },
    feedback: { created: 'Project created.', updated: 'Project updated.', submitted: 'Project submitted for review.' }, errors: { validation: 'Review the required fields before saving.', generic: 'The change could not be saved. Try again.', conflict: 'The project changed on the server. Reload the list before trying again.' }, pagination: 'Project pages', previous: 'Previous page', next: 'Next page'
  },};

export function getProviderProjectsCopy(locale: SupportedLocale): ProviderProjectsCopy {
  return copy[locale];
}
