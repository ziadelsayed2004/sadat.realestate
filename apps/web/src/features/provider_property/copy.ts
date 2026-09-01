import type { PropertyKind, PropertyStatus, PropertyTransactionType, SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderPropertySourceType = 'individual_broker' | 'brokerage_office' | 'developer_company';
export type ProviderPropertyWizardState = 'loading' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface ProviderPropertyCopy {
  readonly navLabel: string;
  readonly wizard: {
    readonly eyebrow: string;
    readonly basicTitle: string;
    readonly basicDescription: string;
    readonly locationTitle: string;
    readonly locationDescription: string;
    readonly steps: Readonly<Record<'basic' | 'location', string>>;
    readonly labels: Readonly<Record<'name' | 'slug' | 'kind' | 'transaction' | 'sourceType' | 'organizationId' | 'projectId' | 'parentPropertyId' | 'reason' | 'locationId' | 'mapUrl' | 'latitude' | 'longitude', string>>;
    readonly placeholders: Readonly<Record<'name' | 'slug' | 'organizationId' | 'projectId' | 'parentPropertyId' | 'reason' | 'locationId' | 'mapUrl' | 'latitude' | 'longitude', string>>;
    readonly sourceTypeLabels: Readonly<Record<ProviderPropertySourceType, string>>;
    readonly kindLabels: Readonly<Record<PropertyKind, string>>;
    readonly transactionLabels: Readonly<Record<PropertyTransactionType, string>>;
    readonly statusLabels: Readonly<Record<PropertyStatus, string>>;
    readonly saveDraft: string;
    readonly continue: string;
    readonly back: string;
    readonly saved: string;
    readonly saving: string;
    readonly validationTitle: string;
    readonly validationBody: string;
    readonly mutationError: string;
    readonly locationCatalogUnavailableTitle: string;
    readonly locationCatalogUnavailableBody: string;
    readonly contractBoundaryTitle: string;
    readonly contractBoundaryBody: string;
    readonly coordinateHelp: string;
    readonly sourceHelp: string;
    readonly notFoundTitle: string;
    readonly notFoundBody: string;
    readonly unavailable: string;
  };
  readonly states: Readonly<Record<ProviderPropertyWizardState, { readonly title: string; readonly body: string }>>;
  readonly retry: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderPropertyCopy>> = {
  ar: {
    navLabel: 'إدارة العقارات',
    wizard: {
      eyebrow: 'إضافة عقار',
      basicTitle: 'البيانات الأساسية',
      basicDescription: 'أدخل البيانات التي يدعمها عقد إنشاء مسودة العقار الحالي.',
      locationTitle: 'الموقع',
      locationDescription: 'اربط المسودة بموقع رئيسي نشط أو أضف إحداثيات تقريبية.',
      steps: { basic: 'البيانات الأساسية', location: 'الموقع' },
      labels: {
        name: 'اسم العقار', slug: 'المعرّف المختصر', kind: 'نوع السجل', transaction: 'نوع المعاملة', sourceType: 'نوع مصدر العقار',
        organizationId: 'معرّف المؤسسة', projectId: 'معرّف المشروع', parentPropertyId: 'معرّف العقار الأب', reason: 'سبب حفظ المسودة',
         locationId: 'معرّف الموقع الرئيسي', mapUrl: 'رابط موقع الخريطة', latitude: 'خط العرض', longitude: 'خط الطول'
      },
      placeholders: {
        name: 'مثال: شقة في مدينة السادات', slug: 'apartment-sadat-city', organizationId: '24 حرفاً سداسياً عشرينياً',
        projectId: 'اختياري', parentPropertyId: 'مطلوب للوحدة إن لم يوجد مشروع', reason: 'حفظ البيانات الأساسية',
         locationId: '24 حرفاً سداسياً عشرينياً', mapUrl: 'https://maps.example.com/…', latitude: '30.62', longitude: '30.74'
      },
      sourceTypeLabels: { individual_broker: 'وسيط فردي', brokerage_office: 'مكتب وساطة', developer_company: 'شركة مطوّرة' },
      kindLabels: { property: 'عقار', unit: 'وحدة' },
      transactionLabels: { sale: 'بيع', rent: 'إيجار' },
      statusLabels: { draft: 'مسودة', pending_review: 'قيد المراجعة', needs_changes: 'تحتاج تعديلات', approved: 'معتمدة', published: 'منشورة', rejected: 'مرفوضة', hidden: 'مخفية', archived: 'مؤرشفة' },
      saveDraft: 'حفظ المسودة', continue: 'متابعة', back: 'رجوع', saved: 'تم حفظ المسودة.', saving: 'جارٍ الحفظ…',
      validationTitle: 'تحقق من البيانات', validationBody: 'أكمل الحقول المطلوبة واستخدم القيم التي يقبلها العقد.',
      mutationError: 'تعذر حفظ المسودة. تحقق من الاتصال وحاول مرة أخرى.',
      locationCatalogUnavailableTitle: 'دليل المواقع غير متاح للمزوّد حالياً',
      locationCatalogUnavailableBody: 'لا يعرض العقد الحالي قائمة مواقع للمزوّد. لن نستخدم مسار الإدارة أو بيانات غير معتمدة؛ استخدم معرّف موقع نشطاً من المصدر المصرح به أو الإحداثيات.',
      contractBoundaryTitle: 'حقول غير مدعومة حالياً',
      contractBoundaryBody: 'حقول العنوان التفصيلية خارج عقد الحفظ. يتم حفظ رابط خريطة HTTPS آمن يضيفه المزوّد كمرجع للموقع.',
      coordinateHelp: 'يمكن تحديد الموقع برابط خريطة HTTPS آمن أو بالإحداثيات أو بمعرّف موقع رئيسي. يجب إدخال خط العرض والطول معاً.',
      sourceHelp: 'يتم أخذ هوية المزوّد من جلسة الدخول ولا يمكن تعديلها من النموذج.',
      notFoundTitle: 'المسودة غير موجودة', notFoundBody: 'لا يمكن تحميل هذه المسودة أو لا تملك الجلسة الحالية صلاحية الوصول إليها.', unavailable: 'غير متاح'
    },
    states: {
      loading: { title: 'جارٍ التحميل', body: 'يتم تحميل بيانات مسودة العقار.' },
      error: { title: 'تعذر تحميل المسودة', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      retry: { title: 'المسودة غير متاحة مؤقتاً', body: 'يمكنك إعادة المحاولة عند توفر اتصال صالح.' },
      permission: { title: 'يلزم التحقق من الصلاحية', body: 'لا يتم عرض بيانات العقار المحمية قبل تحقق جلسة المزوّد.' },
      not_found: { title: 'المسودة غير موجودة', body: 'لا توجد مسودة متاحة بهذه الهوية ضمن حساب المزوّد.' },
      success: { title: 'بيانات المسودة جاهزة', body: 'يمكنك متابعة حفظ بيانات العقار.' }
    },
    retry: 'إعادة المحاولة'
  },
  en: {
    navLabel: 'Property management',
    wizard: {
      eyebrow: 'Add property',
      basicTitle: 'Basic information',
      basicDescription: 'Enter the fields supported by the current property-draft contract.',
      locationTitle: 'Location',
      locationDescription: 'Attach an active master location or provide approximate coordinates.',
      steps: { basic: 'Basic information', location: 'Location' },
      labels: {
        name: 'Property name', slug: 'Short identifier', kind: 'Record type', transaction: 'Transaction type', sourceType: 'Property source type',
        organizationId: 'Organization ID', projectId: 'Project ID', parentPropertyId: 'Parent property ID', reason: 'Draft save reason',
        locationId: 'Master location ID', mapUrl: 'Map location link', latitude: 'Latitude', longitude: 'Longitude'
      },
      placeholders: {
        name: 'Example: Sadat City apartment', slug: 'apartment-sadat-city', organizationId: '24 hexadecimal characters',
        projectId: 'Optional', parentPropertyId: 'Required for a unit without a project', reason: 'Save basic property data',
        locationId: '24 hexadecimal characters', mapUrl: 'https://maps.example.com/…', latitude: '30.62', longitude: '30.74'
      },
      sourceTypeLabels: { individual_broker: 'Individual broker', brokerage_office: 'Brokerage office', developer_company: 'Developer company' },
      kindLabels: { property: 'Property', unit: 'Unit' },
      transactionLabels: { sale: 'Sale', rent: 'Rent' },
      statusLabels: { draft: 'Draft', pending_review: 'Pending review', needs_changes: 'Needs changes', approved: 'Approved', published: 'Published', rejected: 'Rejected', hidden: 'Hidden', archived: 'Archived' },
      saveDraft: 'Save draft', continue: 'Continue', back: 'Back', saved: 'Draft saved.', saving: 'Saving…',
      validationTitle: 'Check the form', validationBody: 'Complete the required fields using values accepted by the contract.',
      mutationError: 'The draft could not be saved. Check the connection and try again.',
      locationCatalogUnavailableTitle: 'The provider location catalog is unavailable',
      locationCatalogUnavailableBody: 'The current provider contract does not expose a location list. The admin route and unapproved data are not used; enter an active location ID from an approved source or coordinates.',
      contractBoundaryTitle: 'Fields not supported by the current contract',
      contractBoundaryBody: 'Detailed address fields are outside the save contract. A safe HTTPS map link is stored as the provider-supplied location reference.',
      coordinateHelp: 'A safe HTTPS map link, coordinates, or a master location ID may identify the location. Latitude and longitude must be supplied together.',
      sourceHelp: 'The provider identity comes from the authenticated session and cannot be changed in this form.',
      notFoundTitle: 'Draft not found', notFoundBody: 'This draft could not be loaded or is not owned by the current session.', unavailable: 'Unavailable'
    },
    states: {
      loading: { title: 'Loading', body: 'Loading the property draft.' },
      error: { title: 'The draft could not load', body: 'Check the connection and try again.' },
      retry: { title: 'The draft is temporarily unavailable', body: 'Retry when a valid connection is available.' },
      permission: { title: 'Permission verification required', body: 'Protected property data is not rendered before the provider session is verified.' },
      not_found: { title: 'Draft not found', body: 'No draft with this identifier is available to the provider account.' },
      success: { title: 'Draft ready', body: 'You can continue saving the property data.' }
    },
    retry: 'Retry'
  },};

export function getProviderPropertyCopy(locale: SupportedLocale): ProviderPropertyCopy {
  return copyByLocale[locale];
}
