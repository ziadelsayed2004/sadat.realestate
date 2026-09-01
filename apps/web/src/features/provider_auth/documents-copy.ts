import type { ProviderDocumentCategory, SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderDocumentsCopy {
  readonly stepLabel: string;
  readonly title: string;
  readonly description: string;
  readonly requiredLabel: string;
  readonly optionalLabel: string;
  readonly chooseFileAction: string;
  readonly replaceAction: string;
  readonly removeAction: string;
  readonly uploadingAction: string;
  readonly uploadedLabel: string;
  readonly pendingReviewLabel: string;
  readonly needsReplacementLabel: string;
  readonly approvedLabel: string;
  readonly rejectedLabel: string;
  readonly securityPendingLabel: string;
  readonly securityCleanLabel: string;
  readonly securityFailedLabel: string;
  readonly requirementsTitle: string;
  readonly requirementsBody: string;
  readonly privacyNote: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly networkTitle: string;
  readonly networkBody: string;
  readonly unavailableTitle: string;
  readonly unavailableBody: string;
  readonly uploadErrorTitle: string;
  readonly uploadErrorBody: string;
  readonly fileTooLargeTitle: string;
  readonly fileTooLargeBody: string;
  readonly fileTypeTitle: string;
  readonly fileTypeBody: string;
  readonly invalidFileTitle: string;
  readonly invalidFileBody: string;
  readonly retryAction: string;
  readonly backAction: string;
  readonly reviewAction: string;
  readonly reviewUnavailableTitle: string;
  readonly reviewUnavailableBody: string;
  readonly noPublicUrlNote: string;
  readonly categoryLabels: Readonly<Record<ProviderDocumentCategory, string>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderDocumentsCopy>> = {
  ar: {
    stepLabel: '4 / 4',
    title: 'المستندات المطلوبة',
    description: 'ارفع المستندات الخاصة بالطلب. لن تظهر هذه الملفات للعامة.',
    requiredLabel: 'مطلوب',
    optionalLabel: 'اختياري',
    chooseFileAction: 'اختيار ملف',
    replaceAction: 'استبدال الملف',
    removeAction: 'إزالة الملف',
    uploadingAction: 'جارٍ الرفع',
    uploadedLabel: 'تم الرفع',
    pendingReviewLabel: 'في انتظار المراجعة',
    needsReplacementLabel: 'مطلوب استبدال الملف',
    approvedLabel: 'تمت الموافقة',
    rejectedLabel: 'تم رفض الملف',
    securityPendingLabel: 'فحص الأمان قيد التنفيذ',
    securityCleanLabel: 'اجتاز فحص الأمان',
    securityFailedLabel: 'تعذر إكمال فحص الأمان',
    requirementsTitle: 'متطلبات المستندات',
    requirementsBody: 'تحدد متطلبات المستندات من لقطة المتطلبات التي يرسلها الخادم.',
    privacyNote: 'المستندات خاصة ومحمية بصلاحية حديثة. لا يتم إنشاء روابط عامة دائمة.',
    emptyTitle: 'متطلبات المستندات غير متاحة',
    emptyBody: 'لا يمكن عرض بطاقات الرفع حتى يرسل الخادم لقطة المتطلبات الحالية.',
    permissionTitle: 'لا يمكن تعديل المستندات',
    permissionBody: 'تأكد من أن طلب مقدم الخدمة ما زال قابلاً للتعديل.',
    notFoundTitle: 'الطلب غير متاح',
    notFoundBody: 'لا يمكن العثور على طلب مقدم الخدمة الحالي.',
    networkTitle: 'تعذر الاتصال',
    networkBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    unavailableTitle: 'المستندات غير متاحة الآن',
    unavailableBody: 'حاول مرة أخرى دون عرض أي بيانات أو روابط خاصة.',
    uploadErrorTitle: 'تعذر رفع الملف',
    uploadErrorBody: 'راجع الملف وحاول مرة أخرى.',
    fileTooLargeTitle: 'الملف كبير جدًا',
    fileTooLargeBody: 'يجب ألا يتجاوز الملف 10 ميجابايت.',
    fileTypeTitle: 'نوع الملف غير مدعوم',
    fileTypeBody: 'استخدم PDF أو JPG أو PNG فقط.',
    invalidFileTitle: 'الملف غير صالح',
    invalidFileBody: 'اختر ملفًا غير فارغ بالامتداد الصحيح.',
    retryAction: 'إعادة المحاولة',
    backAction: 'رجوع',
    reviewAction: 'مراجعة الطلب',
    reviewUnavailableTitle: 'لا يمكن الانتقال للمراجعة',
    reviewUnavailableBody: 'اكتمل البيانات والمستندات المطلوبة أوحدث الطلب قبل المتابعة.',
    noPublicUrlNote: 'لا تعرض الواجهة عنوان التخزين أو رابط تنزيل دائم.',
    categoryLabels: {
      government_id_front: 'الهوية الحكومية - الوجه الأمامي',
      government_id_back: 'الهوية الحكومية - الوجه الخلفي',
      broker_license: 'ترخيص الوساطة',
      professional_membership: 'عضوية مهنية',
      commercial_registration: 'السجل التجاري',
      tax_card: 'البطاقة الضريبية',
      authorized_representative_id_front: 'هوية الممثل المفوض - الوجه الأمامي',
      authorized_representative_id_back: 'هوية الممثل المفوض - الوجه الخلفي',
      authorization_letter: 'خطاب التفويض',
      brokerage_license: 'ترخيص المكتب',
      company_profile: 'ملف الشركة',
      developer_license: 'ترخيص المطور',
      additional_supporting_document: 'مستند داعم إضافي'
    }
  },
  en: {
    stepLabel: '4 / 4',
    title: 'Required documents',
    description: 'Upload the documents for this application. These files are never public.',
    requiredLabel: 'Required',
    optionalLabel: 'Optional',
    chooseFileAction: 'Choose file',
    replaceAction: 'Replace file',
    removeAction: 'Remove file',
    uploadingAction: 'Uploading',
    uploadedLabel: 'Uploaded',
    pendingReviewLabel: 'Pending review',
    needsReplacementLabel: 'Replacement required',
    approvedLabel: 'Approved',
    rejectedLabel: 'Rejected',
    securityPendingLabel: 'Security check pending',
    securityCleanLabel: 'Security check passed',
    securityFailedLabel: 'Security check did not complete',
    requirementsTitle: 'Document requirements',
    requirementsBody: 'Document cards come from the server-provided requirement snapshot.',
    privacyNote: 'Documents are private and protected by fresh authorization. No permanent public links are created.',
    emptyTitle: 'Document requirements unavailable',
    emptyBody: 'Upload cards remain hidden until the server provides the current requirement snapshot.',
    permissionTitle: 'Documents cannot be edited',
    permissionBody: 'Confirm that the provider application is still editable.',
    notFoundTitle: 'Application unavailable',
    notFoundBody: 'The current provider application could not be found.',
    networkTitle: 'Connection unavailable',
    networkBody: 'Check your connection and try again.',
    unavailableTitle: 'Documents are unavailable',
    unavailableBody: 'Try again without exposing private data or links.',
    uploadErrorTitle: 'File could not be uploaded',
    uploadErrorBody: 'Review the file and try again.',
    fileTooLargeTitle: 'File is too large',
    fileTooLargeBody: 'The file must not exceed 10 MB.',
    fileTypeTitle: 'File type is not supported',
    fileTypeBody: 'Use PDF, JPG, or PNG only.',
    invalidFileTitle: 'File is not valid',
    invalidFileBody: 'Choose a non-empty file with a supported extension.',
    retryAction: 'Retry',
    backAction: 'Back',
    reviewAction: 'Review application',
    reviewUnavailableTitle: 'Review is not ready',
    reviewUnavailableBody: 'Complete the required details and documents, or refresh the application before continuing.',
    noPublicUrlNote: 'The interface never exposes storage keys or permanent download URLs.',
    categoryLabels: {
      government_id_front: 'Government ID — front',
      government_id_back: 'Government ID — back',
      broker_license: 'Broker license',
      professional_membership: 'Professional membership',
      commercial_registration: 'Commercial registration',
      tax_card: 'Tax card',
      authorized_representative_id_front: 'Authorized representative ID — front',
      authorized_representative_id_back: 'Authorized representative ID — back',
      authorization_letter: 'Authorization letter',
      brokerage_license: 'Brokerage license',
      company_profile: 'Company profile',
      developer_license: 'Developer license',
      additional_supporting_document: 'Additional supporting document'
    }
  },};

export function getProviderDocumentsCopy(locale: SupportedLocale): ProviderDocumentsCopy {
  return copyByLocale[locale];
}
