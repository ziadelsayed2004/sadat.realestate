import { localizeCopy } from '../localization/copy-catalog.ts';
import type { PropertyKind, PropertyStatus, PropertyTransactionType, SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderPropertySourceType = 'individual_broker' | 'brokerage_office' | 'developer_company';
export type ProviderPropertyWizardState = 'loading' | 'error' | 'retry' | 'permission' | 'not_found' | 'success';

export interface ProviderPropertyCopy {
  readonly navLabel: string;
  readonly wizard: {
    readonly eyebrow: string;
    readonly createTitle: string;
    readonly createDescription: string;
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
    readonly validationMessages: Readonly<Record<'name' | 'slug' | 'sourceType' | 'organizationId' | 'projectId' | 'parentPropertyId' | 'reason' | 'providerId', string>>;
    readonly mutationError: string;
    readonly locationCatalogUnavailableTitle: string;
    readonly locationCatalogUnavailableBody: string;
    readonly locationCatalogLoading: string;
    readonly locationCatalogEmptyTitle: string;
    readonly locationCatalogEmptyBody: string;
    readonly locationSearchLabel: string;
    readonly locationSearchPlaceholder: string;
    readonly locationSelectPlaceholder: string;
    readonly locationSearchEmpty: string;
    readonly clearLocationSearch: string;
    readonly contractBoundaryTitle: string;
    readonly contractBoundaryBody: string;
    readonly coordinateHelp: string;
    readonly mapUrlError: string;
    readonly parentPicker: Readonly<Record<'search' | 'help' | 'kindHelp' | 'loading' | 'empty' | 'error' | 'selected' | 'previous' | 'next', string>>;
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
      createTitle: 'إضافة عقار جديد',
      createDescription: 'أكمل الخطوات التالية لإضافة عقارك للمنصة',
      basicTitle: 'البيانات الأساسية',
      basicDescription: 'أدخل البيانات التي يدعمها عقد إنشاء مسودة العقار الحالي.',
      locationTitle: 'الموقع',
      locationDescription: 'اربط المسودة بموقع رئيسي نشط أو أضف إحداثيات تقريبية.',
      steps: { basic: 'البيانات الأساسية', location: 'الموقع' },
      labels: {
        name: 'اسم العقار', slug: 'المعرّف المختصر', kind: 'بتعلن عن إيه؟', transaction: 'نوع المعاملة', sourceType: 'نوع مصدر العقار',
        organizationId: 'معرّف المؤسسة', projectId: 'المشروع (اختياري)', parentPropertyId: 'العمارة أو العقار الرئيسي', reason: 'سبب حفظ المسودة',
         locationId: 'المنطقة أو الحي', mapUrl: 'رابط موقع الخريطة', latitude: 'خط العرض', longitude: 'خط الطول'
      },
      placeholders: {
        name: 'مثال: شقة في مدينة السادات', slug: 'apartment-sadat-city', organizationId: '24 حرفاً سداسياً عشرينياً',
        projectId: 'اختياري', parentPropertyId: 'اختر العقار من قائمتك', reason: 'حفظ البيانات الأساسية',
         locationId: '24 حرفاً سداسياً عشرينياً', mapUrl: 'https://maps.app.goo.gl/…', latitude: '30.62', longitude: '30.74'
      },
      sourceTypeLabels: { individual_broker: 'مالك عقار', brokerage_office: 'مكتب وساطة', developer_company: 'شركة مطوّرة' },
      kindLabels: { property: 'عقار مستقل', unit: 'وحدة تابعة لعقار أو مشروع' },
      parentPicker: {
        search: 'ابحث باسم العمارة أو العقار', help: 'يعني العمارة أو العقار المسجّل اللي الوحدة جزء منه، زي شقة داخل عمارة. اختاره بالاسم من عقاراتك. الحقل اختياري لو اخترت مشروع.',
        kindHelp: 'لإعلان شقة أو محل أو أرض لوحده اختر «عقار مستقل». «وحدة تابعة» لربط الإعلان بعقار أو مشروع مسجّل.',
        loading: 'جارٍ تحميل عقاراتك…', empty: 'لا توجد عقارات رئيسية في هذه الصفحة. جرّب البحث أو الصفحة التالية. يمكنك إضافة العقار الرئيسي أولًا، أو اختيار «عقار مستقل».',
        error: 'تعذر تحميل عقاراتك. أعد المحاولة؛ اختيارك الحالي محفوظ.', selected: 'العقار المرتبط حاليًا', previous: 'السابق', next: 'التالي'
      },
      transactionLabels: { sale: 'بيع', rent: 'إيجار' },
      statusLabels: { draft: 'مسودة', pending_review: 'قيد المراجعة', needs_changes: 'تحتاج تعديلات', approved: 'معتمدة', published: 'منشورة', rejected: 'مرفوضة', hidden: 'مخفية', archived: 'مؤرشفة' },
      saveDraft: 'حفظ المسودة', continue: 'متابعة', back: 'رجوع', saved: 'تم حفظ المسودة.', saving: 'جارٍ الحفظ…',
      validationTitle: 'تحقق من البيانات', validationBody: 'راجع الحقول المحددة أدناه ثم أعد الحفظ؛ البيانات المكتوبة محفوظة في النموذج.',
      validationMessages: {
        name: 'اكتب اسماً للعقار في لغة واحدة على الأقل.',
        slug: 'المعرّف المختصر يجب أن يكون من 2 إلى 120 حرفاً إنجليزياً صغيراً أو رقماً، مع شرطة بين الكلمات، مثل sadat-apartment.',
        sourceType: 'اختر نوع مصدر العقار.',
        organizationId: 'أدخل معرّف المؤسسة لمكتب الوساطة أو الشركة: يتكون من 24 حرفاً من الأرقام والحروف a إلى f؛ مالك العقار لا يحتاج مؤسسة.',
        projectId: 'اختار المشروع من قائمة مشاريعك أو اتركه بدون مشروع للإعلان المستقل.',
        parentPropertyId: 'اختر العمارة أو العقار الرئيسي من القائمة، أو اربط الوحدة بمشروع. للإعلان غير المرتبط اختر «عقار مستقل».',
        reason: 'اكتب سبب الحفظ من 5 إلى 500 حرف في سطر واحد.',
        providerId: 'تعذر تحديد حساب مقدم العقار. سجّل الدخول بحساب مقدم خدمة ثم حاول مرة أخرى.'
      },
      mutationError: 'تعذر حفظ المسودة. تحقق من الاتصال وحاول مرة أخرى.',
      locationCatalogUnavailableTitle: 'دليل المواقع غير متاح للمزوّد حالياً',
      locationCatalogUnavailableBody: 'لا يعرض العقد الحالي قائمة مواقع للمزوّد. لن نستخدم مسار الإدارة أو بيانات غير معتمدة؛ استخدم معرّف موقع نشطاً من المصدر المصرح به أو الإحداثيات.',
      locationCatalogLoading: 'جارٍ تحميل المناطق…',
      locationCatalogEmptyTitle: 'لا توجد مناطق نشطة',
      locationCatalogEmptyBody: 'أضف منطقة نشطة من لوحة الإدارة أو استخدم الإحداثيات لحين توفرها.',
      locationSearchLabel: 'البحث عن المنطقة', locationSearchPlaceholder: 'اكتب اسم المدينة أو المنطقة', locationSelectPlaceholder: 'اختر المنطقة',
      locationSearchEmpty: 'لم نجد تطابقًا مع البحث. القائمة بالأسفل تعرض كل المناطق المتاحة للاختيار.', clearLocationSearch: 'مسح البحث وعرض كل المناطق',
      contractBoundaryTitle: 'إيه الخطوة الجاية؟',
      contractBoundaryBody: 'احفظ البيانات الأساسية، وبعدها اختار المنطقة وأضف تفاصيل العقار وصوره. العقار يظهر للعميل بعد إرساله وموافقة الإدارة.',
      coordinateHelp: "الصق رابط دبوس موقع العقار من Google Maps أو Apple Maps؛ نملأ خط العرض والطول تلقائيًا عند توفر نقطة دقيقة. يمكنك أيضًا اختيار المنطقة أو تعديل الإحداثيات يدويًا.",
      mapUrlError: 'أدخل رابط موقع من Google Maps أو Apple Maps؛ روابط المواقع العادية غير مقبولة.',
      sourceHelp: 'نوع الحساب والمؤسسة يُحددان تلقائيًا من حسابك المعتمد؛ لا تحتاج إدخال كود.',
      notFoundTitle: 'المسودة غير موجودة', notFoundBody: 'لا يمكن تحميل هذه المسودة أو لا تملك الجلسة الحالية صلاحية الوصول إليها.', unavailable: 'غير متاح'
    },
    states: {
      loading: { title: 'جارٍ التحميل', body: 'يتم تحميل بيانات مسودة العقار.' },
      error: { title: 'تعذر تحميل المسودة', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      retry: { title: 'المسودة غير متاحة مؤقتاً', body: 'يمكنك إعادة المحاولة عند توفر اتصال صالح.' },
      permission: { title: 'يلزم التحقق من الصلاحية', body: 'تعذر تأكيد صلاحية حسابك لإضافة عقار. حدّث الصفحة وحاول تاني؛ لو الحساب لسه قيد المراجعة، تابع حالته من لوحة التحكم.' },
      not_found: { title: 'المسودة غير موجودة', body: 'لا توجد مسودة متاحة بهذه الهوية ضمن حساب المزوّد.' },
      success: { title: 'بيانات المسودة جاهزة', body: 'يمكنك متابعة حفظ بيانات العقار.' }
    },
    retry: 'إعادة المحاولة'
  },
  en: {
    navLabel: 'Property management',
    wizard: {
      eyebrow: 'Add property',
      createTitle: 'Add a new property',
      createDescription: 'Complete the following steps to add your property to the platform.',
      basicTitle: 'Basic information',
      basicDescription: 'Enter the fields supported by the current property-draft contract.',
      locationTitle: 'Location',
      locationDescription: 'Attach an active master location or provide approximate coordinates.',
      steps: { basic: 'Basic information', location: 'Location' },
      labels: {
        name: 'Property name', slug: 'Short identifier', kind: 'What are you listing?', transaction: 'Transaction type', sourceType: 'Property source type',
        organizationId: 'Organization ID', projectId: 'Project (optional)', parentPropertyId: 'Building or main property', reason: 'Draft save reason',
        locationId: 'Area or district', mapUrl: 'Map location link', latitude: 'Latitude', longitude: 'Longitude'
      },
      placeholders: {
        name: 'Example: Sadat City apartment', slug: 'apartment-sadat-city', organizationId: '24 hexadecimal characters',
        projectId: 'Optional', parentPropertyId: 'Choose from your properties', reason: 'Save basic property data',
        locationId: '24 hexadecimal characters', mapUrl: 'https://maps.app.goo.gl/…', latitude: '30.62', longitude: '30.74'
      },
      sourceTypeLabels: { individual_broker: 'Property owner', brokerage_office: 'Brokerage office', developer_company: 'Developer company' },
      kindLabels: { property: 'Standalone property', unit: 'Unit within a property or project' },
      parentPicker: {
        search: 'Search by building or property name', help: 'The registered building or property this unit belongs to, such as an apartment inside a building. Choose it by name from your properties. Optional if you selected a project.',
        kindHelp: 'For an apartment, shop or plot listed on its own, choose “Standalone property”. Choose a unit to link it to a registered property or project.',
        loading: 'Loading your properties…', empty: 'No main properties on this page. Try searching or the next page. You can add the main property first, or choose “Standalone property”.',
        error: 'Your properties could not be loaded. Retry; your current selection is preserved.', selected: 'Currently linked property', previous: 'Previous', next: 'Next'
      },
      transactionLabels: { sale: 'Sale', rent: 'Rent' },
      statusLabels: { draft: 'Draft', pending_review: 'Pending review', needs_changes: 'Needs changes', approved: 'Approved', published: 'Published', rejected: 'Rejected', hidden: 'Hidden', archived: 'Archived' },
      saveDraft: 'Save draft', continue: 'Continue', back: 'Back', saved: 'Draft saved.', saving: 'Saving…',
      validationTitle: 'Check the form', validationBody: 'Correct the fields listed below and save again. Your entered values remain in the form.',
      validationMessages: {
        name: 'Enter a property name in at least one language.',
        slug: 'Use 2–120 lowercase English letters or digits, with hyphens between words, for example sadat-apartment.',
        sourceType: 'Select the property source type.',
        organizationId: 'Offices and developers need an organization ID containing exactly 24 digits or letters a–f. Property owners do not need an organization.',
        projectId: 'Choose from your projects, or leave empty for a standalone listing.',
        parentPropertyId: 'Select the building or main property, or link the unit to a project. For an unlinked listing choose “Standalone property”.',
        reason: 'Enter a save reason of 5–500 characters on one line.',
        providerId: 'The provider account could not be identified. Sign in as a provider and try again.'
      },
      mutationError: 'The draft could not be saved. Check the connection and try again.',
      locationCatalogUnavailableTitle: 'The provider location catalog is unavailable',
      locationCatalogUnavailableBody: 'The current provider contract does not expose a location list. The admin route and unapproved data are not used; enter an active location ID from an approved source or coordinates.',
      locationCatalogLoading: 'Loading locations…',
      locationCatalogEmptyTitle: 'No active locations',
      locationCatalogEmptyBody: 'Add an active location from the admin dashboard, or use coordinates until one is available.',
      locationSearchLabel: 'Search locations', locationSearchPlaceholder: 'Type a city or area name', locationSelectPlaceholder: 'Select a location',
      locationSearchEmpty: 'No exact match. The list below shows all available areas to choose from.', clearLocationSearch: 'Clear search and show all areas',
      contractBoundaryTitle: 'What happens next?',
      contractBoundaryBody: 'Save the basic information, then choose the area and add property details and photos. The listing becomes public after submission and administrative approval.',
      coordinateHelp: "Paste the property pin link from Google Maps or Apple Maps. Latitude and longitude fill automatically when an exact point is available. You can also select an area or edit the coordinates manually.",
      mapUrlError: 'Enter a Google Maps or Apple Maps location link; ordinary website links are not accepted.',
      sourceHelp: 'Provider type and organization are determined automatically from your approved account. No code is needed.',
      notFoundTitle: 'Draft not found', notFoundBody: 'This draft could not be loaded or is not owned by the current session.', unavailable: 'Unavailable'
    },
    states: {
      loading: { title: 'Loading', body: 'Loading the property draft.' },
      error: { title: 'The draft could not load', body: 'Check the connection and try again.' },
      retry: { title: 'The draft is temporarily unavailable', body: 'Retry when a valid connection is available.' },
      permission: { title: 'Permission verification required', body: 'Your account could not be verified for adding a property. Refresh and retry. If your account is still under review, check its status on the dashboard.' },
      not_found: { title: 'Draft not found', body: 'No draft with this identifier is available to the provider account.' },
      success: { title: 'Draft ready', body: 'You can continue saving the property data.' }
    },
    retry: 'Retry'
  },};

export function getProviderPropertyCopy(locale: SupportedLocale): ProviderPropertyCopy {
  return localizeCopy('provider_property/copy#getProviderPropertyCopy', locale, copyByLocale[locale]);
}
