import { localizeCopy } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderPropertyAdvancedStep = 'details' | 'price-payment' | 'features-services';

export interface ProviderPropertyAdvancedCopy {
  readonly titles: Readonly<Record<ProviderPropertyAdvancedStep, string>>;
  readonly descriptions: Readonly<Record<ProviderPropertyAdvancedStep, string>>;
  readonly steps: Readonly<Record<ProviderPropertyAdvancedStep, string>>;
  readonly labels: Readonly<Record<'description' | 'propertyTypeId' | 'deliveryStatus' | 'area' | 'bedrooms' | 'bathrooms' | 'floor' | 'totalFloors' | 'priceAmount' | 'currency' | 'paymentPlan' | 'planName' | 'installments' | 'frequency' | 'downPaymentAmount' | 'installmentAmount' | 'featureIds' | 'serviceIds', string>>;
  readonly placeholders: Readonly<Record<'description' | 'propertyTypeId' | 'area' | 'bedrooms' | 'bathrooms' | 'floor' | 'totalFloors' | 'priceAmount' | 'currency' | 'planName' | 'installments' | 'downPaymentAmount' | 'installmentAmount' | 'featureIds' | 'serviceIds', string>>;
  readonly frequencyLabels: Readonly<Record<'monthly' | 'quarterly' | 'annually', string>>;
  readonly propertyTypeCatalogUnavailableTitle: string;
  readonly propertyTypeCatalogUnavailableBody: string;
  readonly propertyTypeCatalogLoading: string;
  readonly propertyTypeCatalogEmptyTitle: string;
  readonly propertyTypeCatalogEmptyBody: string;
  readonly propertyTypeSelectPlaceholder: string;
  readonly featureCatalogUnavailableTitle: string;
  readonly featureCatalogUnavailableBody: string;
  readonly serviceCatalogUnavailableTitle: string;
  readonly serviceCatalogUnavailableBody: string;
  readonly referenceHelp: string;
  readonly paymentPlanHelp: string;
  readonly commissionBoundaryTitle: string;
  readonly commissionBoundaryBody: string;
  readonly commissionTitle: string;
  readonly commissionLoading: string;
  readonly commissionError: string;
  readonly commissionNone: string;
  readonly commissionSource: string;
  readonly commissionKind: string;
  readonly commissionValue: string;
  readonly commissionEffective: string;
  readonly commissionVersion: string;
  readonly commissionExempt: string;
  readonly commissionSources: Readonly<Record<'exception' | 'account_override' | 'policy', string>>;
  readonly commissionKinds: Readonly<Record<'percentage' | 'fixed' | 'exempt', string>>;
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
      description: 'وصف العقار', propertyTypeId: 'نوع العقار', deliveryStatus: 'حالة التسليم', area: 'المساحة (م²)', bedrooms: 'عدد غرف النوم', bathrooms: 'عدد دورات المياه', floor: 'الطابق', totalFloors: 'إجمالي الطوابق',
      priceAmount: 'السعر الإجمالي', currency: 'العملة', paymentPlan: 'خطة سداد', planName: 'اسم الخطة', installments: 'عدد الأقساط', frequency: 'دورية السداد', downPaymentAmount: 'الدفعة المقدمة', installmentAmount: 'قيمة القسط', featureIds: 'المميزات (اختياري)', serviceIds: 'الخدمات القريبة (اختياري)'
    },
    placeholders: {
      description: 'اكتب وصفاً واضحاً للعقار...', propertyTypeId: '24 حرفاً سداسياً عشرينياً', area: 'مثال: 120', bedrooms: '0', bathrooms: '0', floor: '0', totalFloors: '1', priceAmount: 'مثال: 1000000', currency: 'EGP', planName: 'خطة تقسيط', installments: '12', downPaymentAmount: 'اختياري', installmentAmount: 'مثال: 80000', featureIds: 'مراجع سداسية عشرية مفصولة بفواصل', serviceIds: 'مراجع سداسية عشرية مفصولة بفواصل'
    },
    frequencyLabels: { monthly: 'شهري', quarterly: 'ربع سنوي', annually: 'سنوي' },
    propertyTypeCatalogUnavailableTitle: 'تعذر تحميل أنواع العقارات',
    propertyTypeCatalogUnavailableBody: 'اضغط إعادة المحاولة لعرض الأنواع بأسمائها. لا تكتب اسم النوع أو أي رمز في خانة أخرى.',
    propertyTypeCatalogLoading: 'جارٍ تحميل أنواع العقارات…',
    propertyTypeCatalogEmptyTitle: 'لا توجد أنواع عقارات نشطة',
    propertyTypeCatalogEmptyBody: 'أضف نوع عقار نشطًا من لوحة الإدارة ليظهر هنا.',
    propertyTypeSelectPlaceholder: 'اختر نوع العقار',
    featureCatalogUnavailableTitle: 'تعذر تحميل الاختيارات',
    featureCatalogUnavailableBody: 'أعد المحاولة لعرض الاختيارات. اختياراتك المحفوظة لن تُمسح؛ ويمكنك المتابعة بدون إضافة اختيارات.',
    serviceCatalogUnavailableTitle: 'تعذر تحميل الخدمات',
    serviceCatalogUnavailableBody: 'يمكنك المتابعة دون اختيار خدمة.',
    referenceHelp: 'اختر ما يتوفر بالفعل بالعقار أو بالقرب منه. كل الاختيارات اختيارية؛ يمكنك الحفظ والمتابعة بدون اختيار أي ميزة أو خدمة.',
    paymentPlanHelp: 'يجب أن تطابق عملة الخطة عملة السعر. لا يتم عرض عمولة عامة أو قيمة تمويل غير صادرة من الخادم.',
    commissionBoundaryTitle: 'العمولة يحددها النظام',
    commissionBoundaryBody: 'لا يعرض هذا النموذج نسبة عمولة مفترضة أو سعراً عاماً. أي سياسة فعالة يجب أن تأتي من بيانات المنصة المعتمدة.',
    commissionTitle: 'عمولة عقارات السادات', commissionLoading: 'جارٍ تحميل سياسة العمولة…', commissionError: 'تعذر تحميل سياسة العمولة الحالية.', commissionNone: 'لا توجد سياسة عمولة مطبقة على هذا الحساب حالياً.',
    commissionSource: 'مصدر السياسة', commissionKind: 'نوع الحساب', commissionValue: 'القيمة', commissionEffective: 'تاريخ السريان', commissionVersion: 'إصدار السياسة', commissionExempt: 'معفى',
    commissionSources: { exception: 'استثناء', account_override: 'تخصيص الحساب', policy: 'السياسة العامة' }, commissionKinds: { percentage: 'نسبة مئوية', fixed: 'قيمة ثابتة', exempt: 'معفى' },
    invalidReference: 'راجع الاختيارات وسبب الحفظ ثم أعد المحاولة.',
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
      description: 'Property description', propertyTypeId: 'Property type', deliveryStatus: 'Delivery status', area: 'Area (sqm)', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', floor: 'Floor', totalFloors: 'Total floors',
      priceAmount: 'Total price', currency: 'Currency', paymentPlan: 'Payment plan', planName: 'Plan name', installments: 'Installments', frequency: 'Payment frequency', downPaymentAmount: 'Down payment', installmentAmount: 'Installment amount', featureIds: 'Features (optional)', serviceIds: 'Nearby services (optional)'
    },
    placeholders: {
      description: 'Write a clear property description...', propertyTypeId: '24 hexadecimal characters', area: 'Example: 120', bedrooms: '0', bathrooms: '0', floor: '0', totalFloors: '1', priceAmount: 'Example: 1000000', currency: 'EGP', planName: 'Installment plan', installments: '12', downPaymentAmount: 'Optional', installmentAmount: 'Example: 80000', featureIds: 'Comma-separated hexadecimal references', serviceIds: 'Comma-separated hexadecimal references'
    },
    frequencyLabels: { monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' },
    propertyTypeCatalogUnavailableTitle: 'Unable to load property types',
    propertyTypeCatalogUnavailableBody: 'Retry to display property types by name. Do not enter a type name or code in another field.',
    propertyTypeCatalogLoading: 'Loading property types…',
    propertyTypeCatalogEmptyTitle: 'No active property types',
    propertyTypeCatalogEmptyBody: 'Add an active property type from the admin dashboard so it appears here.',
    propertyTypeSelectPlaceholder: 'Select a property type',
    featureCatalogUnavailableTitle: 'Unable to load choices',
    featureCatalogUnavailableBody: 'Retry to load the choices. Saved selections are retained; you can continue without adding any choices.',
    serviceCatalogUnavailableTitle: 'Unable to load services',
    serviceCatalogUnavailableBody: 'You can continue without selecting a service.',
    referenceHelp: 'Select what is actually available in or near the property. All choices are optional; you can save and continue without selecting a feature or service.',
    paymentPlanHelp: 'Plan currencies must match the property price currency. This form does not display a universal commission or an unsupported financing claim.',
    commissionBoundaryTitle: 'Commission is platform-controlled',
    commissionBoundaryBody: 'This form does not show an assumed commission percentage or universal price. Any effective policy must come from approved platform data.',
    commissionTitle: 'Sadat Real Estate commission', commissionLoading: 'Loading commission policy…', commissionError: 'The current commission policy could not load.', commissionNone: 'No commission policy currently applies to this account.',
    commissionSource: 'Policy source', commissionKind: 'Calculation type', commissionValue: 'Value', commissionEffective: 'Effective date', commissionVersion: 'Policy version', commissionExempt: 'Exempt',
    commissionSources: { exception: 'Exception', account_override: 'Account override', policy: 'General policy' }, commissionKinds: { percentage: 'Percentage', fixed: 'Fixed amount', exempt: 'Exempt' },
    invalidReference: 'Check the selections and save reason, then try again.',
    versionConflict: 'The draft changed after it was loaded. Reload the draft before saving your changes.'
  },};

export function getProviderPropertyAdvancedCopy(locale: SupportedLocale): ProviderPropertyAdvancedCopy {
  return localizeCopy('provider_property/steps-copy#getProviderPropertyAdvancedCopy', locale, copyByLocale[locale]);
}
