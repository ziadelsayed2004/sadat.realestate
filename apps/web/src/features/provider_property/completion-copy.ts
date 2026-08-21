import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderPropertyCompletionStep = 'media' | 'contact' | 'review';

export interface ProviderPropertyCompletionCopy {
  readonly steps: Readonly<Record<ProviderPropertyCompletionStep, string>>;
  readonly titles: Readonly<Record<ProviderPropertyCompletionStep, string>>;
  readonly descriptions: Readonly<Record<ProviderPropertyCompletionStep, string>>;
  readonly back: string;
  readonly saveDraft: string;
  readonly continue: string;
  readonly saving: string;
  readonly saved: string;
  readonly validationTitle: string;
  readonly validationBody: string;
  readonly mutationError: string;
  readonly permissionBody: string;
  readonly notFoundBody: string;
  readonly versionConflict: string;
  readonly media: {
    readonly chooseImage: string;
    readonly chooseFloorPlan: string;
    readonly imageKind: string;
    readonly floorPlanKind: string;
    readonly remove: string;
    readonly makeCover: string;
    readonly moveUp: string;
    readonly moveDown: string;
    readonly upload: string;
    readonly uploading: string;
    readonly count: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly existingUnavailableTitle: string;
    readonly existingUnavailableBody: string;
    readonly acceptedTypes: string;
    readonly privacyNote: string;
    readonly invalidFileTitle: string;
    readonly invalidFileBody: string;
    readonly tooLargeTitle: string;
    readonly tooLargeBody: string;
    readonly uploadErrorTitle: string;
    readonly uploadErrorBody: string;
    readonly storageUnavailableTitle: string;
    readonly storageUnavailableBody: string;
    readonly permissionTitle: string;
    readonly permissionBody: string;
    readonly versionConflictTitle: string;
    readonly versionConflictBody: string;
  };
  readonly contact: {
    readonly contactName: string;
    readonly phone: string;
    readonly whatsapp: string;
    readonly email: string;
    readonly preferredLocale: string;
    readonly contactNamePlaceholder: string;
    readonly phonePlaceholder: string;
    readonly whatsappPlaceholder: string;
    readonly emailPlaceholder: string;
    readonly preferredLocaleLabels: Readonly<Record<SupportedLocale, string>>;
    readonly supportedFieldsTitle: string;
    readonly supportedFieldsBody: string;
    readonly internalNotesTitle: string;
    readonly internalNotesBody: string;
  };
  readonly review: {
    readonly submit: string;
    readonly submitting: string;
    readonly save: string;
    readonly requiredConfirmationsTitle: string;
    readonly accurateData: string;
    readonly authority: string;
    readonly reviewProcess: string;
    readonly missingTitle: string;
    readonly missingBody: string;
    readonly location: string;
    readonly price: string;
    readonly contact: string;
    readonly status: string;
    readonly media: string;
    readonly noMedia: string;
    readonly mediaCount: string;
    readonly reviewReason: string;
    readonly submittedTitle: string;
    readonly submittedBody: string;
    readonly submittedStatus: string;
    readonly notSubmittableTitle: string;
    readonly notSubmittableBody: string;
    readonly safeProjectionTitle: string;
    readonly safeProjectionBody: string;
  };
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderPropertyCompletionCopy>> = {
  ar: {
    steps: { media: 'الصور والوسائط', contact: 'التواصل', review: 'المراجعة والإرسال' },
    titles: { media: 'الصور والوسائط', contact: 'بيانات التواصل', review: 'المراجعة والإرسال' },
    descriptions: {
      media: 'أضف صور العقار والمخطط من خلال مسار رفع الوسائط المعتمد.',
      contact: 'حدد بيانات التواصل التي يدعمها عقد العقار الحالي.',
      review: 'راجع ملخص المسودة وأرسلها للمراجعة عندما تسمح حالة الخادم بذلك.'
    },
    back: 'السابق', saveDraft: 'حفظ كمسودة', continue: 'متابعة', saving: 'جارٍ الحفظ…', saved: 'تم حفظ المسودة.',
    validationTitle: 'تحقق من البيانات', validationBody: 'أكمل الحقول المطلوبة باستخدام قيم يقبلها العقد الحالي.',
    mutationError: 'تعذر حفظ البيانات. تحقق من الاتصال وحاول مرة أخرى.',
    permissionBody: 'لا يمكن تعديل هذه المسودة أو بياناتها من خلال الجلسة الحالية.',
    notFoundBody: 'المسودة غير موجودة أو لا تنتمي إلى حساب المزود الحالي.',
    versionConflict: 'تغيرت المسودة في جلسة أخرى. أعد تحميلها ثم حاول مرة أخرى.',
    media: {
      chooseImage: 'اختيار صورة', chooseFloorPlan: 'اختيار مخطط', imageKind: 'صورة', floorPlanKind: 'مخطط طابق', remove: 'إزالة', makeCover: 'تعيين كغلاف', moveUp: 'تحريك لأعلى', moveDown: 'تحريك لأسفل', upload: 'رفع الملف', uploading: 'جارٍ الرفع…', count: 'عدد الوسائط',
      emptyTitle: 'لم يتم رفع وسائط بعد', emptyBody: 'أضف صورة أو مخططاً من الملفات المعتمدة.', existingUnavailableTitle: 'قائمة الوسائط السابقة غير متاحة في العقد الحالي', existingUnavailableBody: 'يعرض هذا المحرر الوسائط التي تم رفعها خلال الجلسة الحالية فقط؛ لا يتم اختلاق روابط أو بيانات لوسائط سابقة.', acceptedTypes: 'الأنواع المدعومة: JPG وPNG للصور، وPDF للمخططات. الحد الأقصى 10 ميجابايت للملف.', privacyNote: 'الوسائط الخاصة تمر عبر تخزين مؤقت مصرح به. لن يتم عرض مفتاح تخزين أو رابط عام دائم.', invalidFileTitle: 'الملف غير صالح', invalidFileBody: 'اختر ملفاً غير فارغ بامتداد ونوع مدعومين.', tooLargeTitle: 'الملف كبير جداً', tooLargeBody: 'يجب ألا يتجاوز الملف 10 ميجابايت.', uploadErrorTitle: 'تعذر رفع الملف', uploadErrorBody: 'تعذر إكمال الرفع. يمكنك المحاولة مرة أخرى.', storageUnavailableTitle: 'خدمة الوسائط غير متاحة مؤقتاً', storageUnavailableBody: 'لا يمكن إكمال الرفع حتى تصبح خدمة التخزين والفحص متاحة.', permissionTitle: 'لا توجد صلاحية للرفع', permissionBody: 'لا يمكن رفع وسائط لهذه المسودة أو للجلسة الحالية.', versionConflictTitle: 'تعارض في نسخة الوسائط', versionConflictBody: 'تغير ترتيب الوسائط. أعد تحميل المسودة قبل المتابعة.'
    },
    contact: {
      contactName: 'اسم مسؤول التواصل', phone: 'رقم الهاتف', whatsapp: 'رقم واتساب', email: 'البريد الإلكتروني', preferredLocale: 'لغة التواصل', contactNamePlaceholder: 'الاسم الكامل', phonePlaceholder: '+201234567890', whatsappPlaceholder: '+201234567891', emailPlaceholder: 'example@domain.com', preferredLocaleLabels: { ar: 'العربية', en: 'English', 'zh-CN': '简体中文' }, supportedFieldsTitle: 'الحقول المدعومة', supportedFieldsBody: 'يتم إرسال الاسم وأرقام الهاتف والبريد واللغة فقط وفق عقد التواصل الحالي.', internalNotesTitle: 'الملاحظات الداخلية غير متاحة', internalNotesBody: 'لا يدعم العقد الحالي ملاحظات داخلية أو بيانات تشغيلية، لذلك لا يتم عرضها أو إرسالها.'
    },
    review: {
      submit: 'إرسال العقار للمراجعة', submitting: 'جارٍ الإرسال…', save: 'حفظ كمسودة', requiredConfirmationsTitle: 'التأكيدات المطلوبة', accurateData: 'أقر بأن بيانات العقار المدخلة دقيقة.', authority: 'أقر بأن لدي الصلاحية لعرض هذا العقار وتسويقه.', reviewProcess: 'أوافق على مراجعة فريق سادات للعقار قبل النشر.', missingTitle: 'لا يمكن الإرسال بعد', missingBody: 'أكمل المتطلبات التي يحددها الخادم قبل الإرسال.', location: 'الموقع', price: 'السعر', contact: 'بيانات التواصل', status: 'الحالة', media: 'الصور', noMedia: 'لا توجد وسائط مرفوعة في هذه الجلسة', mediaCount: 'وسائط مرفوعة', reviewReason: 'سبب الإرسال', submittedTitle: 'تم إرسال المسودة للمراجعة', submittedBody: 'استلم الخادم طلب المراجعة. ستظهر الحالة التالية عند توفرها من الخادم.', submittedStatus: 'قيد المراجعة', notSubmittableTitle: 'الإرسال غير متاح', notSubmittableBody: 'تسمح حالة الخادم الحالية بالحفظ فقط.', safeProjectionTitle: 'ملخص آمن', safeProjectionBody: 'يعرض هذا الملخص بيانات العقار التي يسمح بها عقد المزود فقط، ولا يعرض ملاحظات الإدارة أو التعيينات أو بيانات التدقيق.'
    }
  },
  en: {
    steps: { media: 'Media', contact: 'Contact', review: 'Review and submit' },
    titles: { media: 'Photos and media', contact: 'Contact details', review: 'Review and submit' },
    descriptions: {
      media: 'Add property photos and floor plans through the implemented media-upload boundary.',
      contact: 'Set the contact data supported by the current property contract.',
      review: 'Review the draft summary and submit it when the server state allows it.'
    },
    back: 'Back', saveDraft: 'Save draft', continue: 'Continue', saving: 'Saving…', saved: 'Draft saved.',
    validationTitle: 'Check the form', validationBody: 'Complete the required fields with values accepted by the current contract.',
    mutationError: 'The data could not be saved. Check the connection and try again.',
    permissionBody: 'This draft or its data cannot be changed by the current session.',
    notFoundBody: 'The draft was not found or is not owned by the current provider account.',
    versionConflict: 'The draft changed in another session. Reload it and try again.',
    media: {
      chooseImage: 'Choose image', chooseFloorPlan: 'Choose floor plan', imageKind: 'Image', floorPlanKind: 'Floor plan', remove: 'Remove', makeCover: 'Make cover', moveUp: 'Move up', moveDown: 'Move down', upload: 'Upload file', uploading: 'Uploading…', count: 'Media count',
      emptyTitle: 'No media uploaded yet', emptyBody: 'Add an image or floor plan from the supported file types.', existingUnavailableTitle: 'Existing media list is not exposed by the current contract', existingUnavailableBody: 'This editor shows media uploaded during the current session only; it does not fabricate old media records or URLs.', acceptedTypes: 'Supported types: JPG and PNG for images, PDF for floor plans. Maximum 10 MB per file.', privacyNote: 'Private media uses an authorized quarantine flow. Storage keys and permanent public URLs are never rendered.', invalidFileTitle: 'File is not valid', invalidFileBody: 'Choose a non-empty file with a supported extension and MIME type.', tooLargeTitle: 'File is too large', tooLargeBody: 'The file must not exceed 10 MB.', uploadErrorTitle: 'File could not be uploaded', uploadErrorBody: 'The upload did not complete. You can retry it.', storageUnavailableTitle: 'Media service is temporarily unavailable', storageUnavailableBody: 'The upload cannot complete until storage and scanning are ready.', permissionTitle: 'Upload permission required', permissionBody: 'Media cannot be uploaded for this draft or session.', versionConflictTitle: 'Media version conflict', versionConflictBody: 'The media order changed. Reload the draft before continuing.'
    },
    contact: {
      contactName: 'Contact name', phone: 'Phone number', whatsapp: 'WhatsApp number', email: 'Email', preferredLocale: 'Contact language', contactNamePlaceholder: 'Full name', phonePlaceholder: '+201234567890', whatsappPlaceholder: '+201234567891', emailPlaceholder: 'example@domain.com', preferredLocaleLabels: { ar: 'Arabic', en: 'English', 'zh-CN': 'Simplified Chinese' }, supportedFieldsTitle: 'Supported fields', supportedFieldsBody: 'Only the name, phone numbers, email, and preferred locale are sent through the current contact contract.', internalNotesTitle: 'Internal notes are unavailable', internalNotesBody: 'The current contract has no internal notes or operational fields, so they are not rendered or submitted.'
    },
    review: {
      submit: 'Submit property for review', submitting: 'Submitting…', save: 'Save draft', requiredConfirmationsTitle: 'Required confirmations', accurateData: 'I confirm that the property data entered is accurate.', authority: 'I confirm that I am authorized to list and market this property.', reviewProcess: 'I agree that Sadat Real Estate will review the property before publication.', missingTitle: 'Cannot submit yet', missingBody: 'Complete the server-defined requirements before submitting.', location: 'Location', price: 'Price', contact: 'Contact data', status: 'Status', media: 'Media', noMedia: 'No media uploaded in this session', mediaCount: 'Uploaded media', reviewReason: 'Submission reason', submittedTitle: 'Draft submitted for review', submittedBody: 'The server accepted the review request. The next status will appear when supplied by the server.', submittedStatus: 'Pending review', notSubmittableTitle: 'Submission unavailable', notSubmittableBody: 'The current server state allows saving only.', safeProjectionTitle: 'Safe summary', safeProjectionBody: 'This summary renders only provider-permitted property contract data; administrator notes, assignments, and audit data are excluded.'
    }
  },
  'zh-CN': {
    steps: { media: '图片与媒体', contact: '联系信息', review: '审核并提交' },
    titles: { media: '图片与媒体', contact: '联系信息', review: '审核并提交' },
    descriptions: {
      media: '通过已实现的媒体上传边界添加房产图片和户型图。',
      contact: '填写当前房产契约支持的联系信息。',
      review: '检查草稿摘要，并在服务器状态允许时提交。'
    },
    back: '上一步', saveDraft: '保存草稿', continue: '继续', saving: '保存中…', saved: '草稿已保存。',
    validationTitle: '请检查表单', validationBody: '请使用当前契约接受的值填写必填字段。',
    mutationError: '无法保存数据。请检查连接后重试。',
    permissionBody: '当前会话无法修改此草稿或其数据。',
    notFoundBody: '找不到草稿，或它不属于当前提供方账户。',
    versionConflict: '草稿已在其他会话中更改。请重新加载后重试。',
    media: {
      chooseImage: '选择图片', chooseFloorPlan: '选择户型图', imageKind: '图片', floorPlanKind: '户型图', remove: '移除', makeCover: '设为封面', moveUp: '上移', moveDown: '下移', upload: '上传文件', uploading: '上传中…', count: '媒体数量',
      emptyTitle: '尚未上传媒体', emptyBody: '请从支持的文件类型中添加图片或户型图。', existingUnavailableTitle: '当前契约未提供已有媒体列表', existingUnavailableBody: '此编辑器只显示当前会话上传的媒体，不会编造旧媒体记录或链接。', acceptedTypes: '支持类型：图片使用 JPG/PNG，户型图使用 PDF。单个文件最大 10 MB。', privacyNote: '私有媒体使用授权的隔离流程。不会显示存储键或永久公共链接。', invalidFileTitle: '文件无效', invalidFileBody: '请选择非空且扩展名和 MIME 类型受支持的文件。', tooLargeTitle: '文件过大', tooLargeBody: '文件不能超过 10 MB。', uploadErrorTitle: '文件上传失败', uploadErrorBody: '上传未完成，可以重试。', storageUnavailableTitle: '媒体服务暂时不可用', storageUnavailableBody: '存储和扫描服务就绪后才能完成上传。', permissionTitle: '需要上传权限', permissionBody: '当前草稿或会话不能上传媒体。', versionConflictTitle: '媒体版本冲突', versionConflictBody: '媒体顺序已更改。请重新加载草稿后继续。'
    },
    contact: {
      contactName: '联系人姓名', phone: '电话号码', whatsapp: 'WhatsApp 号码', email: '电子邮箱', preferredLocale: '联系语言', contactNamePlaceholder: '姓名', phonePlaceholder: '+201234567890', whatsappPlaceholder: '+201234567891', emailPlaceholder: 'example@domain.com', preferredLocaleLabels: { ar: '阿拉伯语', en: '英语', 'zh-CN': '简体中文' }, supportedFieldsTitle: '支持的字段', supportedFieldsBody: '当前联系契约只发送姓名、电话号码、电子邮箱和首选语言。', internalNotesTitle: '内部备注不可用', internalNotesBody: '当前契约不包含内部备注或运营字段，因此不会显示或提交。'
    },
    review: {
      submit: '提交房产审核', submitting: '提交中…', save: '保存草稿', requiredConfirmationsTitle: '必需确认', accurateData: '我确认输入的房产数据准确。', authority: '我确认有权展示和营销此房产。', reviewProcess: '我同意萨达特房地产在发布前审核此房产。', missingTitle: '暂时无法提交', missingBody: '提交前请完成服务器定义的要求。', location: '位置', price: '价格', contact: '联系信息', status: '状态', media: '媒体', noMedia: '本会话尚未上传媒体', mediaCount: '已上传媒体', reviewReason: '提交原因', submittedTitle: '草稿已提交审核', submittedBody: '服务器已接受审核请求。服务器提供下一状态后会显示。', submittedStatus: '待审核', notSubmittableTitle: '无法提交', notSubmittableBody: '当前服务器状态只允许保存。', safeProjectionTitle: '安全摘要', safeProjectionBody: '此摘要只显示提供方契约允许的房产数据，不包含管理员备注、分配或审计数据。'
    }
  }
};

export function getProviderPropertyCompletionCopy(locale: SupportedLocale): ProviderPropertyCompletionCopy {
  return copyByLocale[locale];
}
