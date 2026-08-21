import type { ProviderType, SupportedLocale } from '@sadat-real-estate/contracts';

export type OrganizationVariant = 'business' | 'company';

export interface ProviderOrganizationCopy {
  readonly stepLabel: string;
  readonly businessTitle: string;
  readonly businessDescription: string;
  readonly companyTitle: string;
  readonly companyDescription: string;
  readonly providerTypeLabel: string;
  readonly legalBusinessNameLabel: string;
  readonly legalBusinessNamePlaceholder: string;
  readonly tradeNameLabel: string;
  readonly tradeNamePlaceholder: string;
  readonly legalCompanyNameLabel: string;
  readonly legalCompanyNamePlaceholder: string;
  readonly brandNameLabel: string;
  readonly brandNamePlaceholder: string;
  readonly addressLabel: string;
  readonly addressPlaceholder: string;
  readonly commercialRegistrationNumberLabel: string;
  readonly commercialRegistrationNumberPlaceholder: string;
  readonly taxRegistrationNumberLabel: string;
  readonly taxRegistrationNumberPlaceholder: string;
  readonly authorizedRepresentativeFullNameLabel: string;
  readonly authorizedRepresentativeFullNamePlaceholder: string;
  readonly authorizedRepresentativeTitleLabel: string;
  readonly authorizedRepresentativeTitlePlaceholder: string;
  readonly authorityLabel: string;
  readonly authorityPlaceholder: string;
  readonly authorityYes: string;
  readonly authorityNo: string;
  readonly unsupportedFieldNote: string;
  readonly requirementsTitle: string;
  readonly requirementsBody: string;
  readonly missingFieldLabels: Readonly<Record<string, string>>;
  readonly saveDraftAction: string;
  readonly saveContinueAction: string;
  readonly savingAction: string;
  readonly savedTitle: string;
  readonly savedBody: string;
  readonly invalidFormTitle: string;
  readonly invalidFormBody: string;
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly conflictTitle: string;
  readonly conflictBody: string;
  readonly networkTitle: string;
  readonly networkBody: string;
  readonly unavailableTitle: string;
  readonly unavailableBody: string;
  readonly retryAction: string;
  readonly backAction: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderOrganizationCopy>> = {
  ar: {
    stepLabel: '3 / 4',
    businessTitle: 'بيانات المكتب العقاري',
    businessDescription: 'أضف بيانات المكتب المسجلة كما هي في المستندات الرسمية.',
    companyTitle: 'بيانات شركة التطوير',
    companyDescription: 'أضف بيانات الشركة المسجلة كما هي في المستندات الرسمية.',
    providerTypeLabel: 'نوع مقدم الخدمة',
    legalBusinessNameLabel: 'الاسم القانوني للمكتب',
    legalBusinessNamePlaceholder: 'الاسم كما يظهر في السجل التجاري',
    tradeNameLabel: 'الاسم التجاري',
    tradeNamePlaceholder: 'الاسم المستخدم أمام العملاء',
    legalCompanyNameLabel: 'الاسم القانوني للشركة',
    legalCompanyNamePlaceholder: 'الاسم كما يظهر في المستندات الرسمية',
    brandNameLabel: 'اسم العلامة التجارية',
    brandNamePlaceholder: 'اسم العلامة إن وُجد',
    addressLabel: 'العنوان الرئيسي',
    addressPlaceholder: 'العنوان المسجل للنشاط',
    commercialRegistrationNumberLabel: 'رقم السجل التجاري',
    commercialRegistrationNumberPlaceholder: 'أدخل الرقم الرسمي',
    taxRegistrationNumberLabel: 'رقم التسجيل الضريبي',
    taxRegistrationNumberPlaceholder: 'أدخل الرقم الرسمي',
    authorizedRepresentativeFullNameLabel: 'اسم الممثل المفوض',
    authorizedRepresentativeFullNamePlaceholder: 'الاسم الكامل',
    authorizedRepresentativeTitleLabel: 'صفة الممثل المفوض',
    authorizedRepresentativeTitlePlaceholder: 'مثال: المدير المسؤول',
    authorityLabel: 'هل يملك صاحب الحساب صلاحية مسجلة؟',
    authorityPlaceholder: 'اختر الحالة',
    authorityYes: 'نعم، الصلاحية مسجلة',
    authorityNo: 'لا، أرفق خطاب التفويض',
    unsupportedFieldNote: 'يتم حفظ الحقول المدعومة بالعقد الحالي فقط. ستظهر بيانات المناطق وأنواع العقارات عندما يوفرها العقد الخلفي الفعلي.',
    requirementsTitle: 'متطلبات الخطوة',
    requirementsBody: 'يمكنك حفظ مسودة الآن. ستظل الحقول غير المكتملة ظاهرة قبل الإرسال للمراجعة.',
    missingFieldLabels: {
      legalBusinessName: 'الاسم القانوني للمكتب',
      tradeName: 'الاسم التجاري',
      businessAddress: 'العنوان الرئيسي',
      legalCompanyName: 'الاسم القانوني للشركة',
      brandName: 'اسم العلامة التجارية',
      headOfficeAddress: 'العنوان الرئيسي',
      commercialRegistrationNumber: 'رقم السجل التجاري',
      taxRegistrationNumber: 'رقم التسجيل الضريبي',
      authorizedRepresentativeFullName: 'اسم الممثل المفوض',
      authorizedRepresentativeTitle: 'صفة الممثل المفوض',
      accountOwnerHasRegisteredAuthority: 'صلاحية صاحب الحساب المسجلة'
    },
    saveDraftAction: 'حفظ المسودة',
    saveContinueAction: 'حفظ ومتابعة',
    savingAction: 'جارٍ الحفظ',
    savedTitle: 'تم حفظ البيانات',
    savedBody: 'يمكنك تعديل هذه البيانات قبل إرسال الطلب للمراجعة.',
    invalidFormTitle: 'راجع البيانات',
    invalidFormBody: 'أدخل قيمة صحيحة واحدة على الأقل قبل الحفظ.',
    notFoundTitle: 'الطلب غير متاح',
    notFoundBody: 'لا يمكن العثور على طلب مقدم الخدمة الحالي.',
    permissionTitle: 'لا يمكن تعديل هذه الخطوة',
    permissionBody: 'تأكد من تسجيل دخولك كمقدم الخدمة الصحيح وأن الطلب ما زال قابلاً للتعديل.',
    conflictTitle: 'تغيرت المسودة',
    conflictBody: 'أعد تحميل البيانات ثم حاول الحفظ مرة أخرى.',
    networkTitle: 'تعذر الاتصال',
    networkBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    unavailableTitle: 'تعذر حفظ البيانات',
    unavailableBody: 'حاول مرة أخرى دون عرض أي بيانات حساسة.',
    retryAction: 'إعادة المحاولة',
    backAction: 'رجوع'
  },
  en: {
    stepLabel: '3 / 4',
    businessTitle: 'Business details',
    businessDescription: 'Add the office details exactly as they appear on official records.',
    companyTitle: 'Developer company details',
    companyDescription: 'Add the company details exactly as they appear on official records.',
    providerTypeLabel: 'Provider type',
    legalBusinessNameLabel: 'Legal business name',
    legalBusinessNamePlaceholder: 'Name on the commercial record',
    tradeNameLabel: 'Trade name',
    tradeNamePlaceholder: 'Name used with customers',
    legalCompanyNameLabel: 'Legal company name',
    legalCompanyNamePlaceholder: 'Name on official records',
    brandNameLabel: 'Brand name',
    brandNamePlaceholder: 'Brand name, if applicable',
    addressLabel: 'Main address',
    addressPlaceholder: 'Registered business address',
    commercialRegistrationNumberLabel: 'Commercial registration number',
    commercialRegistrationNumberPlaceholder: 'Enter the official number',
    taxRegistrationNumberLabel: 'Tax registration number',
    taxRegistrationNumberPlaceholder: 'Enter the official number',
    authorizedRepresentativeFullNameLabel: 'Authorized representative name',
    authorizedRepresentativeFullNamePlaceholder: 'Full name',
    authorizedRepresentativeTitleLabel: 'Authorized representative title',
    authorizedRepresentativeTitlePlaceholder: 'For example, managing director',
    authorityLabel: 'Does the account owner have registered authority?',
    authorityPlaceholder: 'Choose a status',
    authorityYes: 'Yes, authority is registered',
    authorityNo: 'No, an authorization letter is required',
    unsupportedFieldNote: 'Only fields supported by the current contract are saved. Service areas and property types will appear when the real backend contract provides them.',
    requirementsTitle: 'Step requirements',
    requirementsBody: 'You can save a draft now. Incomplete fields remain visible before submission for review.',
    missingFieldLabels: {
      legalBusinessName: 'Legal business name',
      tradeName: 'Trade name',
      businessAddress: 'Main address',
      legalCompanyName: 'Legal company name',
      brandName: 'Brand name',
      headOfficeAddress: 'Main address',
      commercialRegistrationNumber: 'Commercial registration number',
      taxRegistrationNumber: 'Tax registration number',
      authorizedRepresentativeFullName: 'Authorized representative name',
      authorizedRepresentativeTitle: 'Authorized representative title',
      accountOwnerHasRegisteredAuthority: 'Registered account-owner authority'
    },
    saveDraftAction: 'Save draft',
    saveContinueAction: 'Save and continue',
    savingAction: 'Saving',
    savedTitle: 'Details saved',
    savedBody: 'You can still edit these details before submitting the application for review.',
    invalidFormTitle: 'Review the details',
    invalidFormBody: 'Enter at least one valid supported value before saving.',
    notFoundTitle: 'Application unavailable',
    notFoundBody: 'The current provider application could not be found.',
    permissionTitle: 'This step cannot be edited',
    permissionBody: 'Confirm that you are signed in as the correct provider and that the application is editable.',
    conflictTitle: 'The draft changed',
    conflictBody: 'Reload the application and try saving again.',
    networkTitle: 'Connection unavailable',
    networkBody: 'Check your connection and try again.',
    unavailableTitle: 'Details could not be saved',
    unavailableBody: 'Try again without exposing any sensitive data.',
    retryAction: 'Retry',
    backAction: 'Back'
  },
  'zh-CN': {
    stepLabel: '3 / 4',
    businessTitle: '企业信息',
    businessDescription: '请按官方记录填写办公机构信息。',
    companyTitle: '开发商公司信息',
    companyDescription: '请按官方记录填写公司信息。',
    providerTypeLabel: '服务提供方类型',
    legalBusinessNameLabel: '企业法定名称',
    legalBusinessNamePlaceholder: '商业登记中的名称',
    tradeNameLabel: '商业名称',
    tradeNamePlaceholder: '面向客户使用的名称',
    legalCompanyNameLabel: '公司法定名称',
    legalCompanyNamePlaceholder: '官方记录中的名称',
    brandNameLabel: '品牌名称',
    brandNamePlaceholder: '如适用，请填写品牌名称',
    addressLabel: '主要地址',
    addressPlaceholder: '登记的经营地址',
    commercialRegistrationNumberLabel: '商业登记号',
    commercialRegistrationNumberPlaceholder: '输入官方编号',
    taxRegistrationNumberLabel: '税务登记号',
    taxRegistrationNumberPlaceholder: '输入官方编号',
    authorizedRepresentativeFullNameLabel: '授权代表姓名',
    authorizedRepresentativeFullNamePlaceholder: '完整姓名',
    authorizedRepresentativeTitleLabel: '授权代表职务',
    authorizedRepresentativeTitlePlaceholder: '例如：负责经理',
    authorityLabel: '账户所有人是否拥有登记授权？',
    authorityPlaceholder: '选择状态',
    authorityYes: '是，授权已登记',
    authorityNo: '否，需要授权书',
    unsupportedFieldNote: '仅保存当前合同支持的字段。后端合同提供后，才会显示服务区域和物业类型。',
    requirementsTitle: '步骤要求',
    requirementsBody: '现在可以保存草稿。提交审核前，未完成字段仍会显示。',
    missingFieldLabels: {
      legalBusinessName: '企业法定名称',
      tradeName: '商业名称',
      businessAddress: '主要地址',
      legalCompanyName: '公司法定名称',
      brandName: '品牌名称',
      headOfficeAddress: '主要地址',
      commercialRegistrationNumber: '商业登记号',
      taxRegistrationNumber: '税务登记号',
      authorizedRepresentativeFullName: '授权代表姓名',
      authorizedRepresentativeTitle: '授权代表职务',
      accountOwnerHasRegisteredAuthority: '账户所有人的登记授权'
    },
    saveDraftAction: '保存草稿',
    saveContinueAction: '保存并继续',
    savingAction: '正在保存',
    savedTitle: '信息已保存',
    savedBody: '在提交审核前仍可以编辑这些信息。',
    invalidFormTitle: '请检查信息',
    invalidFormBody: '保存前至少输入一个有效的支持字段。',
    notFoundTitle: '申请不可用',
    notFoundBody: '找不到当前服务提供方申请。',
    permissionTitle: '无法编辑此步骤',
    permissionBody: '请确认使用正确的服务提供方账户登录，且申请仍可编辑。',
    conflictTitle: '草稿已变化',
    conflictBody: '请重新加载申请后再保存。',
    networkTitle: '连接不可用',
    networkBody: '请检查连接后重试。',
    unavailableTitle: '信息无法保存',
    unavailableBody: '请重试，不会显示敏感数据。',
    retryAction: '重试',
    backAction: '返回'
  }
};

export function getProviderOrganizationCopy(locale: SupportedLocale): ProviderOrganizationCopy {
  return copyByLocale[locale];
}

export function organizationVariant(providerType: ProviderType): OrganizationVariant | undefined {
  if (providerType === 'brokerage_office') return 'business';
  if (providerType === 'developer_company') return 'company';
  return undefined;
}
