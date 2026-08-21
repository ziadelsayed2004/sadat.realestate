import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderPropertyAdvancedStep = 'details' | 'price-payment' | 'features-services';

export interface ProviderPropertyAdvancedCopy {
  readonly titles: Readonly<Record<ProviderPropertyAdvancedStep, string>>;
  readonly descriptions: Readonly<Record<ProviderPropertyAdvancedStep, string>>;
  readonly steps: Readonly<Record<ProviderPropertyAdvancedStep, string>>;
  readonly labels: Readonly<Record<'description' | 'propertyTypeId' | 'area' | 'bedrooms' | 'bathrooms' | 'floor' | 'totalFloors' | 'priceAmount' | 'currency' | 'paymentPlan' | 'planName' | 'installments' | 'frequency' | 'downPaymentAmount' | 'installmentAmount' | 'featureIds' | 'serviceIds', string>>;
  readonly placeholders: Readonly<Record<'description' | 'propertyTypeId' | 'area' | 'bedrooms' | 'bathrooms' | 'floor' | 'totalFloors' | 'priceAmount' | 'currency' | 'planName' | 'installments' | 'downPaymentAmount' | 'installmentAmount' | 'featureIds' | 'serviceIds', string>>;
  readonly frequencyLabels: Readonly<Record<'monthly' | 'quarterly' | 'annually', string>>;
  readonly propertyTypeCatalogUnavailableTitle: string;
  readonly propertyTypeCatalogUnavailableBody: string;
  readonly featureCatalogUnavailableTitle: string;
  readonly featureCatalogUnavailableBody: string;
  readonly serviceCatalogUnavailableTitle: string;
  readonly serviceCatalogUnavailableBody: string;
  readonly referenceHelp: string;
  readonly paymentPlanHelp: string;
  readonly commissionBoundaryTitle: string;
  readonly commissionBoundaryBody: string;
  readonly invalidReference: string;
  readonly versionConflict: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderPropertyAdvancedCopy>> = {
  ar: {
    titles: { details: 'تفاصيل العقار', 'price-payment': 'السعر والسداد', 'features-services': 'المميزات والخدمات' },
    descriptions: {
      details: 'أدخل المساحات والتقسيم الداخلي والوصف المدعوم في مسودة العقار.',
      'price-payment': 'أدخل السعر وخطة السداد كما يسمح بها العقد الحالي.',
      'features-services': 'احفظ مراجع المميزات والخدمات المعتمدة المرتبطة بالعقار.'
    },
    steps: { details: 'تفاصيل العقار', 'price-payment': 'السعر والسداد', 'features-services': 'المميزات والخدمات' },
    labels: {
      description: 'وصف العقار', propertyTypeId: 'معرّف نوع العقار', area: 'المساحة (م²)', bedrooms: 'عدد غرف النوم', bathrooms: 'عدد دورات المياه', floor: 'الطابق', totalFloors: 'إجمالي الطوابق',
      priceAmount: 'السعر الإجمالي', currency: 'العملة', paymentPlan: 'خطة سداد', planName: 'اسم الخطة', installments: 'عدد الأقساط', frequency: 'دورية السداد', downPaymentAmount: 'الدفعة المقدمة', installmentAmount: 'قيمة القسط', featureIds: 'مراجع المميزات', serviceIds: 'مراجع الخدمات'
    },
    placeholders: {
      description: 'اكتب وصفاً واضحاً للعقار...', propertyTypeId: '24 حرفاً سداسياً عشرينياً', area: 'مثال: 120', bedrooms: '0', bathrooms: '0', floor: '0', totalFloors: '1', priceAmount: 'مثال: 1000000', currency: 'EGP', planName: 'خطة تقسيط', installments: '12', downPaymentAmount: 'اختياري', installmentAmount: 'مثال: 80000', featureIds: 'مراجع سداسية عشرية مفصولة بفواصل', serviceIds: 'مراجع سداسية عشرية مفصولة بفواصل'
    },
    frequencyLabels: { monthly: 'شهري', quarterly: 'ربع سنوي', annually: 'سنوي' },
    propertyTypeCatalogUnavailableTitle: 'دليل أنواع العقارات غير متاح للمزوّد حالياً',
    propertyTypeCatalogUnavailableBody: 'لا يعرض العقد الحالي قائمة أنواع للمزوّد. لن نستخدم مسار الإدارة أو نخترع نوعاً؛ يمكن الاحتفاظ بمرجع موجود أو إدخال مرجع معتمد من مصدر مصرح به.',
    featureCatalogUnavailableTitle: 'دليل المميزات غير متاح للمزوّد حالياً',
    featureCatalogUnavailableBody: 'لا يوجد مسار مزوّد لعرض المميزات المعتمدة. لن نستخدم بيانات الإدارة أو أسماء وهمية؛ احفظ مراجع معتمدة فقط.',
    serviceCatalogUnavailableTitle: 'دليل الخدمات غير متاح للمزوّد حالياً',
    serviceCatalogUnavailableBody: 'لا يوجد مسار مزوّد لعرض الخدمات المعتمدة. لن نستخدم بيانات الإدارة أو أسماء وهمية؛ احفظ مراجع معتمدة فقط.',
    referenceHelp: 'استخدم مراجع سداسية عشرية من مصدر معتمد فقط. سيتم التحقق من الشكل والتكرار والتداخل قبل الإرسال.',
    paymentPlanHelp: 'يجب أن تطابق عملة الخطة عملة السعر. لا يتم عرض عمولة عامة أو قيمة تمويل غير صادرة من الخادم.',
    commissionBoundaryTitle: 'العمولة يحددها النظام',
    commissionBoundaryBody: 'لا يعرض هذا النموذج نسبة عمولة مفترضة أو سعراً عاماً. أي سياسة فعالة يجب أن تأتي من بيانات المنصة المعتمدة.',
    invalidReference: 'تحقق من مراجع المميزات والخدمات؛ كل مرجع يجب أن يكون 24 حرفاً سداسياً عشرياً وفريداً.',
    versionConflict: 'تغيرت المسودة منذ تحميلها. أعد تحميلها قبل حفظ تعديلاتك.'
  },
  en: {
    titles: { details: 'Property details', 'price-payment': 'Price and payment', 'features-services': 'Features and services' },
    descriptions: {
      details: 'Enter the area, layout, and description fields supported by the current property contract.',
      'price-payment': 'Enter the price and payment plan using the current contract rules.',
      'features-services': 'Save approved feature and service references associated with this property.'
    },
    steps: { details: 'Property details', 'price-payment': 'Price and payment', 'features-services': 'Features and services' },
    labels: {
      description: 'Property description', propertyTypeId: 'Property type reference ID', area: 'Area (sqm)', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', floor: 'Floor', totalFloors: 'Total floors',
      priceAmount: 'Total price', currency: 'Currency', paymentPlan: 'Payment plan', planName: 'Plan name', installments: 'Installments', frequency: 'Payment frequency', downPaymentAmount: 'Down payment', installmentAmount: 'Installment amount', featureIds: 'Feature references', serviceIds: 'Service references'
    },
    placeholders: {
      description: 'Write a clear property description...', propertyTypeId: '24 hexadecimal characters', area: 'Example: 120', bedrooms: '0', bathrooms: '0', floor: '0', totalFloors: '1', priceAmount: 'Example: 1000000', currency: 'EGP', planName: 'Installment plan', installments: '12', downPaymentAmount: 'Optional', installmentAmount: 'Example: 80000', featureIds: 'Comma-separated hexadecimal references', serviceIds: 'Comma-separated hexadecimal references'
    },
    frequencyLabels: { monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' },
    propertyTypeCatalogUnavailableTitle: 'The provider property-type catalog is unavailable',
    propertyTypeCatalogUnavailableBody: 'The current provider contract does not expose a property-type list. The admin route and invented labels are not used; an existing reference can be retained or an approved reference can be entered.',
    featureCatalogUnavailableTitle: 'The provider feature catalog is unavailable',
    featureCatalogUnavailableBody: 'There is no provider route for approved feature labels. Admin data and fabricated labels are not used; save approved references only.',
    serviceCatalogUnavailableTitle: 'The provider service catalog is unavailable',
    serviceCatalogUnavailableBody: 'There is no provider route for approved service labels. Admin data and fabricated labels are not used; save approved references only.',
    referenceHelp: 'Use references from an approved source only. Format, duplicates, overlap, and server-side ownership rules are checked before saving.',
    paymentPlanHelp: 'Plan currencies must match the property price currency. This form does not display a universal commission or an unsupported financing claim.',
    commissionBoundaryTitle: 'Commission is platform-controlled',
    commissionBoundaryBody: 'This form does not show an assumed commission percentage or universal price. Any effective policy must come from approved platform data.',
    invalidReference: 'Check feature and service references. Each must be a unique 24-character hexadecimal ID with no overlap.',
    versionConflict: 'The draft changed after it was loaded. Reload the draft before saving your changes.'
  },
  'zh-CN': {
    titles: { details: '房产详情', 'price-payment': '价格与付款', 'features-services': '特色与服务' },
    descriptions: {
      details: '填写当前房产契约支持的面积、户型和描述字段。',
      'price-payment': '按照当前契约规则填写价格和付款计划。',
      'features-services': '保存与房产关联的已批准特色和服务引用。'
    },
    steps: { details: '房产详情', 'price-payment': '价格与付款', 'features-services': '特色与服务' },
    labels: {
      description: '房产描述', propertyTypeId: '房产类型引用 ID', area: '面积（平方米）', bedrooms: '卧室数量', bathrooms: '卫生间数量', floor: '楼层', totalFloors: '总楼层',
      priceAmount: '总价', currency: '货币', paymentPlan: '付款计划', planName: '计划名称', installments: '分期次数', frequency: '付款频率', downPaymentAmount: '首付款', installmentAmount: '每期金额', featureIds: '特色引用', serviceIds: '服务引用'
    },
    placeholders: {
      description: '填写清晰的房产描述...', propertyTypeId: '24 个十六进制字符', area: '例如：120', bedrooms: '0', bathrooms: '0', floor: '0', totalFloors: '1', priceAmount: '例如：1000000', currency: 'EGP', planName: '分期计划', installments: '12', downPaymentAmount: '可选', installmentAmount: '例如：80000', featureIds: '用逗号分隔的十六进制引用', serviceIds: '用逗号分隔的十六进制引用'
    },
    frequencyLabels: { monthly: '每月', quarterly: '每季度', annually: '每年' },
    propertyTypeCatalogUnavailableTitle: '提供方房产类型目录不可用',
    propertyTypeCatalogUnavailableBody: '当前提供方契约不提供房产类型列表。不使用管理端路径或虚构标签；可以保留已有引用，或输入已批准的引用。',
    featureCatalogUnavailableTitle: '提供方特色目录不可用',
    featureCatalogUnavailableBody: '没有用于显示已批准特色标签的提供方路径。不使用管理端数据或虚构标签；仅保存已批准的引用。',
    serviceCatalogUnavailableTitle: '提供方服务目录不可用',
    serviceCatalogUnavailableBody: '没有用于显示已批准服务标签的提供方路径。不使用管理端数据或虚构标签；仅保存已批准的引用。',
    referenceHelp: '仅使用已批准来源的引用。保存前会检查格式、重复、重叠以及服务端所有权规则。',
    paymentPlanHelp: '计划货币必须与房产价格货币一致。本表单不显示通用佣金或不受支持的融资声明。',
    commissionBoundaryTitle: '佣金由平台控制',
    commissionBoundaryBody: '本表单不显示假定的佣金比例或通用价格。有效政策必须来自已批准的平台数据。',
    invalidReference: '请检查特色和服务引用。每个引用必须是唯一的 24 位十六进制 ID，且两组不能重叠。',
    versionConflict: '草稿在加载后已发生变化。请重新加载草稿后再保存。'
  }
};

export function getProviderPropertyAdvancedCopy(locale: SupportedLocale): ProviderPropertyAdvancedCopy {
  return copyByLocale[locale];
}
