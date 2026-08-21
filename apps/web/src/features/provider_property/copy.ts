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
    readonly labels: Readonly<Record<'name' | 'slug' | 'kind' | 'transaction' | 'sourceType' | 'organizationId' | 'projectId' | 'parentPropertyId' | 'reason' | 'locationId' | 'latitude' | 'longitude', string>>;
    readonly placeholders: Readonly<Record<'name' | 'slug' | 'organizationId' | 'projectId' | 'parentPropertyId' | 'reason' | 'locationId' | 'latitude' | 'longitude', string>>;
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
        locationId: 'معرّف الموقع الرئيسي', latitude: 'خط العرض', longitude: 'خط الطول'
      },
      placeholders: {
        name: 'مثال: شقة في مدينة السادات', slug: 'apartment-sadat-city', organizationId: '24 حرفاً سداسياً عشرينياً',
        projectId: 'اختياري', parentPropertyId: 'مطلوب للوحدة إن لم يوجد مشروع', reason: 'حفظ البيانات الأساسية',
        locationId: '24 حرفاً سداسياً عشرينياً', latitude: '30.62', longitude: '30.74'
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
      contractBoundaryBody: 'حقول العنوان التفصيلية والخرائط الخارجية غير موجودة في عقد الحفظ الحالي، لذلك لا يتم إرسالها أو اختلاق قيم لها.',
      coordinateHelp: 'يمكن حفظ الإحداثيات وحدها أو مع معرّف الموقع. يجب إدخال خط العرض والطول معاً.',
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
        locationId: 'Master location ID', latitude: 'Latitude', longitude: 'Longitude'
      },
      placeholders: {
        name: 'Example: Sadat City apartment', slug: 'apartment-sadat-city', organizationId: '24 hexadecimal characters',
        projectId: 'Optional', parentPropertyId: 'Required for a unit without a project', reason: 'Save basic property data',
        locationId: '24 hexadecimal characters', latitude: '30.62', longitude: '30.74'
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
      contractBoundaryBody: 'Detailed address fields and external map URLs are not part of the current save contract, so they are not submitted or fabricated.',
      coordinateHelp: 'Coordinates may be saved alone or with a location ID. Latitude and longitude must be supplied together.',
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
  },
  'zh-CN': {
    navLabel: '房产管理',
    wizard: {
      eyebrow: '添加房产',
      basicTitle: '基本信息',
      basicDescription: '填写当前房产草稿契约支持的字段。',
      locationTitle: '位置',
      locationDescription: '关联启用的主位置，或提供近似坐标。',
      steps: { basic: '基本信息', location: '位置' },
      labels: {
        name: '房产名称', slug: '短标识', kind: '记录类型', transaction: '交易类型', sourceType: '房产来源类型',
        organizationId: '组织 ID', projectId: '项目 ID', parentPropertyId: '父房产 ID', reason: '草稿保存原因',
        locationId: '主位置 ID', latitude: '纬度', longitude: '经度'
      },
      placeholders: {
        name: '例如：萨达特城公寓', slug: 'apartment-sadat-city', organizationId: '24 个十六进制字符',
        projectId: '可选', parentPropertyId: '没有项目时单位必填', reason: '保存基本房产数据',
        locationId: '24 个十六进制字符', latitude: '30.62', longitude: '30.74'
      },
      sourceTypeLabels: { individual_broker: '个人经纪人', brokerage_office: '经纪办公室', developer_company: '开发公司' },
      kindLabels: { property: '房产', unit: '单元' },
      transactionLabels: { sale: '出售', rent: '出租' },
      statusLabels: { draft: '草稿', pending_review: '待审核', needs_changes: '需要修改', approved: '已批准', published: '已发布', rejected: '已拒绝', hidden: '已隐藏', archived: '已归档' },
      saveDraft: '保存草稿', continue: '继续', back: '返回', saved: '草稿已保存。', saving: '保存中…',
      validationTitle: '请检查表单', validationBody: '请填写必填字段，并使用契约接受的值。',
      mutationError: '无法保存草稿。请检查连接后重试。',
      locationCatalogUnavailableTitle: '提供方位置目录不可用',
      locationCatalogUnavailableBody: '当前提供方契约不提供位置列表。不会调用管理端路径或未批准的数据；请输入批准来源中的启用位置 ID 或坐标。',
      contractBoundaryTitle: '当前契约不支持的字段',
      contractBoundaryBody: '详细地址字段和外部地图 URL 不在当前保存契约中，因此不会提交或编造。',
      coordinateHelp: '可以单独保存坐标，也可以与位置 ID 一起保存。纬度和经度必须同时填写。',
      sourceHelp: '提供方身份来自已验证会话，不能在此表单中修改。',
      notFoundTitle: '找不到草稿', notFoundBody: '无法加载此草稿，或当前会话不拥有它。', unavailable: '不可用'
    },
    states: {
      loading: { title: '加载中', body: '正在加载房产草稿。' },
      error: { title: '无法加载草稿', body: '请检查连接后重试。' },
      retry: { title: '草稿暂时不可用', body: '连接可用后请重试。' },
      permission: { title: '需要权限验证', body: '提供方会话验证前不会显示受保护的房产数据。' },
      not_found: { title: '找不到草稿', body: '提供方账户无法访问此标识的草稿。' },
      success: { title: '草稿已就绪', body: '可以继续保存房产数据。' }
    },
    retry: '重试'
  }
};

export function getProviderPropertyCopy(locale: SupportedLocale): ProviderPropertyCopy {
  return copyByLocale[locale];
}

