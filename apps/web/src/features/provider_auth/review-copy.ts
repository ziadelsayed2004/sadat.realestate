import type { ProviderApplicationState, ProviderType, SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderReviewCopy {
  readonly stepLabel: string;
  readonly title: string;
  readonly description: string;
  readonly reviewTitle: string;
  readonly reviewBody: string;
  readonly applicationDetailsTitle: string;
  readonly providerTypeLabel: string;
  readonly phoneLabel: string;
  readonly emailLabel: string;
  readonly accountOwnerLabel: string;
  readonly displayNameLabel: string;
  readonly organizationLabel: string;
  readonly addressLabel: string;
  readonly documentsTitle: string;
  readonly documentsCompleteLabel: string;
  readonly documentsIncompleteLabel: string;
  readonly missingFieldsLabel: string;
  readonly missingDocumentsLabel: string;
  readonly submitAction: string;
  readonly submittingAction: string;
  readonly submitUnavailableTitle: string;
  readonly submitUnavailableBody: string;
  readonly underReviewTitle: string;
  readonly underReviewBody: string;
  readonly trackingTitle: string;
  readonly trackingAction: string;
  readonly submittedStep: string;
  readonly reviewStep: string;
  readonly informationStep: string;
  readonly decisionStep: string;
  readonly currentStepLabel: string;
  readonly submittedAtLabel: string;
  readonly updatedAtLabel: string;
  readonly applicationNumberLabel: string;
  readonly statusLabel: string;
  readonly needsInformationTitle: string;
  readonly needsInformationBody: string;
  readonly reviewReasonLabel: string;
  readonly editApplicationAction: string;
  readonly approvedTitle: string;
  readonly approvedBody: string;
  readonly openDashboardAction: string;
  readonly rejectedTitle: string;
  readonly rejectedBody: string;
  readonly suspendedTitle: string;
  readonly suspendedBody: string;
  readonly privacyNote: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly networkTitle: string;
  readonly networkBody: string;
  readonly unavailableTitle: string;
  readonly unavailableBody: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly retryAction: string;
  readonly backAction: string;
  readonly homeAction: string;
  readonly supportAction: string;
  readonly statusLabels: Readonly<Record<ProviderApplicationState, string>>;
  readonly providerTypeLabels: Readonly<Record<ProviderType, string>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderReviewCopy>> = {
  ar: {
    stepLabel: '5 / 5',
    title: 'مراجعة وإرسال الطلب',
    description: 'راجع بياناتك ومستنداتك قبل إرسال طلب مقدم الخدمة للمراجعة.',
    reviewTitle: 'طلبك جاهز للمراجعة',
    reviewBody: 'تأكد من صحة البيانات والمستندات. بعد الإرسال سيصبح الطلب قيد المراجعة ولا يمكن تعديل البيانات حتى يطلب الفريق معلومات إضافية.',
    applicationDetailsTitle: 'بيانات الطلب',
    providerTypeLabel: 'نوع الحساب',
    phoneLabel: 'رقم الهاتف الموثق',
    emailLabel: 'البريد الإلكتروني',
    accountOwnerLabel: 'مسؤول الحساب',
    displayNameLabel: 'اسم العرض',
    organizationLabel: 'المنشأة',
    addressLabel: 'العنوان',
    documentsTitle: 'المستندات',
    documentsCompleteLabel: 'اكتملت المستندات المطلوبة',
    documentsIncompleteLabel: 'توجد مستندات أو بيانات ناقصة',
    missingFieldsLabel: 'البيانات الناقصة',
    missingDocumentsLabel: 'المستندات الناقصة',
    submitAction: 'إرسال طلب التسجيل',
    submittingAction: 'جارٍ إرسال الطلب',
    submitUnavailableTitle: 'لا يمكن إرسال الطلب الآن',
    submitUnavailableBody: 'أكمل البيانات والمستندات المطلوبة أو حدّث الطلب ثم حاول مرة أخرى.',
    underReviewTitle: 'حسابك قيد المراجعة',
    underReviewBody: 'تم استلام طلبك بنجاح. سيراجع فريق عقارات السادات البيانات والمستندات قبل تفعيل الحساب.',
    trackingTitle: 'متابعة حالة الطلب',
    trackingAction: 'تتبع حالة الطلب',
    submittedStep: 'تم إرسال الطلب',
    reviewStep: 'مراجعة البيانات والمستندات',
    informationStep: 'استكمال البيانات عند الحاجة',
    decisionStep: 'القرار النهائي',
    currentStepLabel: 'المرحلة الحالية',
    submittedAtLabel: 'تاريخ الإرسال',
    updatedAtLabel: 'آخر تحديث',
    applicationNumberLabel: 'رقم الطلب',
    statusLabel: 'الحالة',
    needsInformationTitle: 'نحتاج إلى استكمال بعض البيانات',
    needsInformationBody: 'راجع ملاحظات فريق عقارات السادات وحدّث البيانات أو المستندات المطلوبة قبل إعادة إرسال الطلب.',
    reviewReasonLabel: 'ملاحظة فريق المراجعة',
    editApplicationAction: 'تعديل الطلب',
    approvedTitle: 'تم اعتماد حسابك',
    approvedBody: 'تم اعتماد حساب مقدم الخدمة الخاص بك. يمكنك الآن الوصول إلى أدوات إدارة نشاطك على عقارات السادات.',
    openDashboardAction: 'الانتقال إلى لوحة مقدم الخدمة',
    rejectedTitle: 'لم تتم الموافقة على الطلب',
    rejectedBody: 'حالة الطلب الحالية لا تسمح بإعادة الإرسال. تواصل مع الدعم لمعرفة الخطوة التالية.',
    suspendedTitle: 'الحساب موقوف مؤقتًا',
    suspendedBody: 'الوصول إلى أدوات مقدم الخدمة متوقف حاليًا. تواصل مع الدعم لمراجعة الحالة.',
    privacyNote: 'تظهر لك فقط البيانات والملاحظات التي يسمح بها نطاق مقدم الخدمة. لا يتم عرض الملاحظات الداخلية أو بيانات التعيين أو سجلات التدقيق.',
    permissionTitle: 'لا يمكن عرض حالة الطلب',
    permissionBody: 'تأكد من تسجيل الدخول بحساب مقدم الخدمة الصحيح وأن الطلب ما زال متاحًا لك.',
    notFoundTitle: 'الطلب غير متاح',
    notFoundBody: 'تعذر العثور على طلب مقدم الخدمة الحالي.',
    networkTitle: 'تعذر الاتصال',
    networkBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    unavailableTitle: 'حالة الطلب غير متاحة',
    unavailableBody: 'حاول مرة أخرى دون عرض بيانات غير مؤكدة.',
    emptyTitle: 'لا توجد بيانات طلب',
    emptyBody: 'ستظهر حالة الطلب بعد تحميل طلب مقدم الخدمة من الخادم.',
    retryAction: 'إعادة المحاولة',
    backAction: 'رجوع',
    homeAction: 'العودة إلى الصفحة الرئيسية',
    supportAction: 'التواصل مع الدعم',
    statusLabels: {
      draft: 'مسودة',
      pending_review: 'قيد المراجعة',
      needs_information: 'يحتاج إلى استكمال',
      approved: 'تم الاعتماد',
      rejected: 'غير معتمد',
      suspended: 'موقوف مؤقتًا'
    },
    providerTypeLabels: {
      individual_broker: 'وسيط عقاري فردي',
      brokerage_office: 'مكتب وساطة عقارية',
      developer_company: 'شركة تطوير عقاري'
    }
  },
  en: {
    stepLabel: '5 / 5',
    title: 'Review and submit',
    description: 'Review your details and documents before submitting the provider application.',
    reviewTitle: 'Your application is ready to submit',
    reviewBody: 'Confirm that the details and documents are correct. After submission, the application is read-only until the team requests more information.',
    applicationDetailsTitle: 'Application details',
    providerTypeLabel: 'Account type',
    phoneLabel: 'Verified phone',
    emailLabel: 'Email',
    accountOwnerLabel: 'Account owner',
    displayNameLabel: 'Display name',
    organizationLabel: 'Organization',
    addressLabel: 'Address',
    documentsTitle: 'Documents',
    documentsCompleteLabel: 'All required documents are ready',
    documentsIncompleteLabel: 'Some details or documents are missing',
    missingFieldsLabel: 'Missing details',
    missingDocumentsLabel: 'Missing documents',
    submitAction: 'Submit registration application',
    submittingAction: 'Submitting application',
    submitUnavailableTitle: 'Application cannot be submitted yet',
    submitUnavailableBody: 'Complete the required details and documents, refresh the application, and try again.',
    underReviewTitle: 'Your application is under review',
    underReviewBody: 'Your application was received. The Sadat Real Estate team will review the details and documents before activating the account.',
    trackingTitle: 'Application tracking',
    trackingAction: 'Track application',
    submittedStep: 'Application submitted',
    reviewStep: 'Details and documents review',
    informationStep: 'Complete information if requested',
    decisionStep: 'Final decision',
    currentStepLabel: 'Current stage',
    submittedAtLabel: 'Submitted',
    updatedAtLabel: 'Last updated',
    applicationNumberLabel: 'Application number',
    statusLabel: 'Status',
    needsInformationTitle: 'More information is needed',
    needsInformationBody: 'Review the Sadat Real Estate team note, update the requested details or documents, and submit again.',
    reviewReasonLabel: 'Review team note',
    editApplicationAction: 'Edit application',
    approvedTitle: 'Your account is approved',
    approvedBody: 'Your provider account has been approved. You can now access the tools for managing your Sadat Real Estate activity.',
    openDashboardAction: 'Open provider dashboard',
    rejectedTitle: 'The application was not approved',
    rejectedBody: 'The current application state does not allow another submission. Contact support for the next step.',
    suspendedTitle: 'The account is temporarily suspended',
    suspendedBody: 'Provider tools are currently unavailable. Contact support to review the account state.',
    privacyNote: 'Only provider-safe data and review reasons returned by the API are shown. Internal notes, assignments, and audit records are never exposed.',
    permissionTitle: 'Application status is unavailable',
    permissionBody: 'Sign in with the correct provider account and confirm that the application is still available to you.',
    notFoundTitle: 'Application unavailable',
    notFoundBody: 'The current provider application could not be found.',
    networkTitle: 'Connection unavailable',
    networkBody: 'Check your connection and try again.',
    unavailableTitle: 'Application status is unavailable',
    unavailableBody: 'Try again without displaying unverified data.',
    emptyTitle: 'No application data',
    emptyBody: 'The application status will appear after the provider application is loaded from the server.',
    retryAction: 'Retry',
    backAction: 'Back',
    homeAction: 'Back to homepage',
    supportAction: 'Contact support',
    statusLabels: {
      draft: 'Draft',
      pending_review: 'Under review',
      needs_information: 'Needs information',
      approved: 'Approved',
      rejected: 'Not approved',
      suspended: 'Temporarily suspended'
    },
    providerTypeLabels: {
      individual_broker: 'Individual broker',
      brokerage_office: 'Brokerage office',
      developer_company: 'Developer company'
    }
  },
  'zh-CN': {
    stepLabel: '5 / 5',
    title: '审核并提交',
    description: '提交服务提供方申请前，请检查你的资料和文件。',
    reviewTitle: '申请已准备好提交',
    reviewBody: '请确认资料和文件准确无误。提交后，申请将在团队要求补充信息前保持只读。',
    applicationDetailsTitle: '申请详情',
    providerTypeLabel: '账户类型',
    phoneLabel: '已验证手机号',
    emailLabel: '电子邮箱',
    accountOwnerLabel: '账户负责人',
    displayNameLabel: '显示名称',
    organizationLabel: '组织',
    addressLabel: '地址',
    documentsTitle: '文件',
    documentsCompleteLabel: '所有必需文件已准备好',
    documentsIncompleteLabel: '仍缺少资料或文件',
    missingFieldsLabel: '缺少的资料',
    missingDocumentsLabel: '缺少的文件',
    submitAction: '提交注册申请',
    submittingAction: '正在提交申请',
    submitUnavailableTitle: '申请暂时无法提交',
    submitUnavailableBody: '请完成必填资料和文件，刷新申请后重试。',
    underReviewTitle: '你的申请正在审核',
    underReviewBody: '我们已收到申请。Sadat Real Estate 团队会审核资料和文件后再启用账户。',
    trackingTitle: '申请进度',
    trackingAction: '跟踪申请',
    submittedStep: '已提交申请',
    reviewStep: '审核资料和文件',
    informationStep: '需要时补充资料',
    decisionStep: '最终决定',
    currentStepLabel: '当前阶段',
    submittedAtLabel: '提交时间',
    updatedAtLabel: '最近更新',
    applicationNumberLabel: '申请编号',
    statusLabel: '状态',
    needsInformationTitle: '需要补充信息',
    needsInformationBody: '查看 Sadat Real Estate 团队的说明，更新所需资料或文件后再次提交。',
    reviewReasonLabel: '审核团队说明',
    editApplicationAction: '编辑申请',
    approvedTitle: '账户已批准',
    approvedBody: '你的服务提供方账户已批准。现在可以使用 Sadat Real Estate 活动管理工具。',
    openDashboardAction: '打开服务提供方面板',
    rejectedTitle: '申请未获批准',
    rejectedBody: '当前申请状态不允许再次提交。请联系支持团队了解下一步。',
    suspendedTitle: '账户暂时被暂停',
    suspendedBody: '服务提供方工具暂时不可用。请联系支持团队查看账户状态。',
    privacyNote: '只显示 API 返回的服务提供方安全资料和审核说明。不会暴露内部备注、分配信息或审计记录。',
    permissionTitle: '无法查看申请状态',
    permissionBody: '请使用正确的服务提供方账户登录，并确认申请仍对你可用。',
    notFoundTitle: '申请不可用',
    notFoundBody: '找不到当前服务提供方申请。',
    networkTitle: '连接不可用',
    networkBody: '请检查连接后重试。',
    unavailableTitle: '申请状态不可用',
    unavailableBody: '请重试，不显示未经确认的数据。',
    emptyTitle: '没有申请数据',
    emptyBody: '从服务器加载服务提供方申请后会显示状态。',
    retryAction: '重试',
    backAction: '返回',
    homeAction: '返回首页',
    supportAction: '联系支持',
    statusLabels: {
      draft: '草稿',
      pending_review: '审核中',
      needs_information: '需要补充信息',
      approved: '已批准',
      rejected: '未批准',
      suspended: '暂时暂停'
    },
    providerTypeLabels: {
      individual_broker: '个人经纪人',
      brokerage_office: '经纪办公室',
      developer_company: '开发商公司'
    }
  }
};

export function getProviderReviewCopy(locale: SupportedLocale): ProviderReviewCopy {
  return copyByLocale[locale];
}
