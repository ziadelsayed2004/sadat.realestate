import type { ProviderApplicationState, ProviderType, SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderReviewCopy {
  readonly stepLabel: string;
  readonly title: string;
  readonly description: string;
  readonly reviewTitle: string;
  readonly reviewBody: string;
  readonly applicationDetailsTitle: string;
  readonly providerTypeLabel: string;
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
  },};

export function getProviderReviewCopy(locale: SupportedLocale): ProviderReviewCopy {
  return copyByLocale[locale];
}
