import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminAccountsView = 'users' | 'seekers' | 'providers' | 'verification';
export type AdminAccountsState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission' | 'not_found';

export interface AdminAccountsCopy {
  readonly users: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;
    readonly roleLabel: string;
    readonly statusLabel: string;
    readonly typeLabel: string;
    readonly all: string;
    readonly totalLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly columns: Readonly<Record<'name' | 'type' | 'phone' | 'email' | 'status' | 'locale' | 'updated' | 'actions', string>>;
  };
  readonly providers: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;
    readonly statusLabel: string;
    readonly typeLabel: string;
    readonly all: string;
    readonly totalLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly columns: Readonly<Record<'name' | 'type' | 'status' | 'accountStatus' | 'company' | 'updated' | 'actions', string>>;
  };
  readonly verification: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;
    readonly statusLabel: string;
    readonly typeLabel: string;
    readonly all: string;
    readonly totalLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly columns: Readonly<Record<'name' | 'type' | 'status' | 'submitted' | 'updated' | 'actions', string>>;
  };
  readonly states: Readonly<Record<AdminAccountsState, { readonly title: string; readonly body: string }>>;
  readonly statusLabels: Readonly<Record<string, string>>;
  readonly accountStatusLabels: Readonly<Record<string, string>>;
  readonly providerTypeLabels: Readonly<Record<string, string>>;
  readonly documentCategoryLabels: Readonly<Record<string, string>>;
  readonly securityStateLabels: Readonly<Record<string, string>>;
  readonly reviewStateLabels: Readonly<Record<string, string>>;
  readonly actions: {
    readonly retry: string;
    readonly view: string;
    readonly back: string;
    readonly openDocument: string;
    readonly unavailableDocument: string;
    readonly loadingDocument: string;
  };
}

const english: AdminAccountsCopy = {
  users: {
    eyebrow: 'Account administration',
    title: 'Users and accounts',
    description: 'Review seeker and provider accounts using the server projection approved for administrators.',
    searchLabel: 'Search the loaded page',
    searchPlaceholder: 'Name, email, phone, or account ID',
    roleLabel: 'Account type',
    statusLabel: 'Account status',
    typeLabel: 'Account type',
    all: 'All',
    totalLabel: 'accounts',
    emptyTitle: 'No accounts found',
    emptyBody: 'No account records match the current filters.',
    columns: { name: 'Account', type: 'Type', phone: 'Phone', email: 'Email', status: 'Status', locale: 'Locale', updated: 'Updated', actions: 'Actions' }
  },
  providers: {
    eyebrow: 'Account administration',
    title: 'Property providers',
    description: 'Review provider applications and account states without exposing private documents or internal review data.',
    searchLabel: 'Search the loaded page',
    searchPlaceholder: 'Name, company, email, or provider ID',
    statusLabel: 'Application status',
    typeLabel: 'Provider type',
    all: 'All',
    totalLabel: 'providers',
    emptyTitle: 'No providers found',
    emptyBody: 'No provider records match the current filters.',
    columns: { name: 'Provider', type: 'Type', status: 'Application status', accountStatus: 'Account status', company: 'Business', updated: 'Updated', actions: 'Actions' }
  },
  verification: {
    eyebrow: 'Verification workspace',
    title: 'Provider verification',
    description: 'Review provider applications and open only clean, active documents through a short-lived reviewer grant.',
    searchLabel: 'Search the loaded page',
    searchPlaceholder: 'Provider name, company, or application ID',
    statusLabel: 'Application status',
    typeLabel: 'Provider type',
    all: 'All',
    totalLabel: 'applications',
    emptyTitle: 'No verification records found',
    emptyBody: 'No provider applications match the current filters.',
    columns: { name: 'Provider', type: 'Type', status: 'Application status', submitted: 'Submitted', updated: 'Updated', actions: 'Actions' }
  },
  states: {
    loading: { title: 'Loading administration records', body: 'Fetching the approved administrator projection from the live API.' },
    empty: { title: 'No records found', body: 'There are no records to display for the current filters.' },
    error: { title: 'The administration records could not load', body: 'Check the connection and try again.' },
    retry: { title: 'The administration service is unavailable', body: 'Retry when the connection is available.' },
    success: { title: 'Administration records loaded', body: 'The current server projection is ready.' },
    permission: { title: 'Access is not permitted', body: 'This page requires an authenticated administrator with the matching read permission.' },
    not_found: { title: 'Record not found', body: 'The requested account or provider is no longer available in the administrator projection.' }
  },
  statusLabels: {
    draft: 'Draft', pending_review: 'Pending review', needs_information: 'Needs information', approved: 'Approved', rejected: 'Rejected', suspended: 'Suspended'
  },
  accountStatusLabels: {
    draft: 'Draft', pending_review: 'Pending review', verified: 'Verified', needs_information: 'Needs information', rejected: 'Rejected', restricted: 'Restricted', suspended: 'Suspended'
  },
  providerTypeLabels: { individual_broker: 'Individual broker', brokerage_office: 'Brokerage office', developer_company: 'Developer company' },
  documentCategoryLabels: {
    government_id_front: 'Government ID (front)', government_id_back: 'Government ID (back)', broker_license: 'Broker licence', professional_membership: 'Professional membership', commercial_registration: 'Commercial registration', tax_card: 'Tax card', authorized_representative_id_front: 'Representative ID (front)', authorized_representative_id_back: 'Representative ID (back)', authorization_letter: 'Authorization letter', brokerage_license: 'Brokerage licence', company_profile: 'Company profile', developer_license: 'Developer licence', additional_supporting_document: 'Supporting document'
  },
  securityStateLabels: { quarantined: 'Quarantined', scan_pending: 'Scan pending', clean: 'Clean', infected: 'Infected', scan_failed: 'Scan failed', deleted: 'Deleted' },
  reviewStateLabels: { uploaded: 'Uploaded', pending_review: 'Pending review', needs_replacement: 'Needs replacement', approved: 'Approved', rejected: 'Rejected' },
  actions: { retry: 'Retry', view: 'View details', back: 'Back to list', openDocument: 'Open document', unavailableDocument: 'Unavailable', loadingDocument: 'Opening…' }
};

const arabic: AdminAccountsCopy = {
  users: {
    eyebrow: 'إدارة الحسابات', title: 'المستخدمون والحسابات', description: 'راجع حسابات الباحثين ومقدمي العقارات من خلال البيانات المعتمدة للمديرين.', searchLabel: 'البحث في الصفحة المحملة', searchPlaceholder: 'الاسم أو البريد أو الهاتف أو معرف الحساب', roleLabel: 'نوع الحساب', statusLabel: 'حالة الحساب', typeLabel: 'نوع الحساب', all: 'الكل', totalLabel: 'حسابات', emptyTitle: 'لا توجد حسابات', emptyBody: 'لا توجد حسابات تطابق عوامل التصفية الحالية.', columns: { name: 'الحساب', type: 'النوع', phone: 'الهاتف', email: 'البريد الإلكتروني', status: 'الحالة', locale: 'اللغة', updated: 'آخر تحديث', actions: 'الإجراءات' }
  },
  providers: {
    eyebrow: 'إدارة الحسابات', title: 'مقدمو العقارات', description: 'راجع طلبات مقدمي العقارات وحالات حساباتهم دون كشف المستندات الخاصة أو بيانات المراجعة الداخلية.', searchLabel: 'البحث في الصفحة المحملة', searchPlaceholder: 'الاسم أو الشركة أو البريد أو معرف مقدم الخدمة', statusLabel: 'حالة الطلب', typeLabel: 'نوع مقدم الخدمة', all: 'الكل', totalLabel: 'مقدمين', emptyTitle: 'لا يوجد مقدمو عقارات', emptyBody: 'لا توجد سجلات تطابق عوامل التصفية الحالية.', columns: { name: 'مقدم العقار', type: 'النوع', status: 'حالة الطلب', accountStatus: 'حالة الحساب', company: 'النشاط', updated: 'آخر تحديث', actions: 'الإجراءات' }
  },
  verification: {
    eyebrow: 'مساحة التحقق', title: 'التحقق من مقدمي العقارات', description: 'راجع الطلبات وافتح فقط المستندات النظيفة والنشطة من خلال صلاحية مراجعة مؤقتة.', searchLabel: 'البحث في الصفحة المحملة', searchPlaceholder: 'اسم المقدم أو الشركة أو معرف الطلب', statusLabel: 'حالة الطلب', typeLabel: 'نوع مقدم الخدمة', all: 'الكل', totalLabel: 'طلبات', emptyTitle: 'لا توجد سجلات تحقق', emptyBody: 'لا توجد طلبات مقدمي عقارات تطابق عوامل التصفية الحالية.', columns: { name: 'مقدم العقار', type: 'النوع', status: 'حالة الطلب', submitted: 'تاريخ التقديم', updated: 'آخر تحديث', actions: 'الإجراءات' }
  },
  states: {
    loading: { title: 'جار تحميل سجلات الإدارة', body: 'يتم جلب البيانات المعتمدة للمدير من واجهة البرمجة الفعلية.' },
    empty: { title: 'لا توجد سجلات', body: 'لا توجد سجلات لعرضها وفق عوامل التصفية الحالية.' },
    error: { title: 'تعذر تحميل سجلات الإدارة', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
    retry: { title: 'خدمة الإدارة غير متاحة', body: 'أعد المحاولة عند توفر الاتصال.' },
    success: { title: 'تم تحميل سجلات الإدارة', body: 'البيانات الحالية من المصدر المعتمد جاهزة.' },
    permission: { title: 'الوصول غير مسموح', body: 'تتطلب هذه الصفحة جلسة مدير موثقة والصلاحية المناسبة للقراءة.' },
    not_found: { title: 'السجل غير موجود', body: 'لم يعد الحساب أو مقدم العقار المطلوب متاحاً في بيانات الإدارة.' }
  },
  statusLabels: { draft: 'مسودة', pending_review: 'قيد المراجعة', needs_information: 'يحتاج معلومات', approved: 'معتمد', rejected: 'مرفوض', suspended: 'موقوف' },
  accountStatusLabels: { draft: 'مسودة', pending_review: 'قيد المراجعة', verified: 'موثق', needs_information: 'يحتاج معلومات', rejected: 'مرفوض', restricted: 'مقيد', suspended: 'موقوف' },
  providerTypeLabels: { individual_broker: 'وسيط فردي', brokerage_office: 'مكتب وساطة', developer_company: 'شركة تطوير' },
  documentCategoryLabels: { government_id_front: 'الهوية (أمام)', government_id_back: 'الهوية (خلف)', broker_license: 'رخصة الوساطة', professional_membership: 'عضوية مهنية', commercial_registration: 'السجل التجاري', tax_card: 'البطاقة الضريبية', authorized_representative_id_front: 'هوية الممثل (أمام)', authorized_representative_id_back: 'هوية الممثل (خلف)', authorization_letter: 'خطاب التفويض', brokerage_license: 'ترخيص الوساطة', company_profile: 'ملف الشركة', developer_license: 'ترخيص المطور', additional_supporting_document: 'مستند داعم' },
  securityStateLabels: { quarantined: 'معزول', scan_pending: 'في انتظار الفحص', clean: 'نظيف', infected: 'مصاب', scan_failed: 'فشل الفحص', deleted: 'محذوف' },
  reviewStateLabels: { uploaded: 'تم الرفع', pending_review: 'قيد المراجعة', needs_replacement: 'يحتاج استبدالاً', approved: 'معتمد', rejected: 'مرفوض' },
  actions: { retry: 'إعادة المحاولة', view: 'عرض التفاصيل', back: 'العودة للقائمة', openDocument: 'فتح المستند', unavailableDocument: 'غير متاح', loadingDocument: 'جار الفتح…' }
};

const copies: Readonly<Record<SupportedLocale, AdminAccountsCopy>> = { ar: arabic, en: english,};

export function getAdminAccountsCopy(locale: SupportedLocale): AdminAccountsCopy {
  return copies[locale];
}
