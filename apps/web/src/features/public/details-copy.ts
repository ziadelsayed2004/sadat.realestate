import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface PublicPropertyDetailsCopy {
  readonly backToResults: string;
  readonly sale: string;
  readonly rent: string;
  readonly property: string;
  readonly unit: string;
  readonly code: string;
  readonly price: string;
  readonly area: string;
  readonly bedrooms: string;
  readonly bathrooms: string;
  readonly floor: string;
  readonly sqm: string;
  readonly galleryTitle: string;
  readonly imageUnavailable: string;
  readonly mediaUnavailable: string;
  readonly mediaItem: (position: number) => string;
  readonly sourceTitle: string;
  readonly publishedSource: string;
  readonly sourceTypes: Readonly<Record<'individual_broker' | 'brokerage_office' | 'developer_company', string>>;
  readonly projectTitle: string;
  readonly projectUnavailable: string;
  readonly projectDescription: string;
  readonly descriptionTitle: string;
  readonly noDescription: string;
  readonly relatedTitle: string;
  readonly contactTitle: string;
  readonly contactBody: string;
  readonly messageLabel: string;
  readonly messagePlaceholder: string;
  readonly submitContact: string;
  readonly requestViewing: string;
  readonly viewingTitle: string;
  readonly viewingBody: string;
  readonly requestedAt: string;
  readonly timezone: string;
  readonly timezonePlaceholder: string;
  readonly note: string;
  readonly notePlaceholder: string;
  readonly submitViewing: string;
  readonly cancel: string;
  readonly close: string;
  readonly contactValidation: string;
  readonly viewingValidation: string;
  readonly actionLoading: string;
  readonly actionSuccessTitle: string;
  readonly actionSuccessBody: string;
  readonly actionPermissionTitle: string;
  readonly actionPermissionBody: string;
  readonly actionPermissionLink: string;
  readonly actionErrorTitle: string;
  readonly actionErrorBody: string;
  readonly retryLabel: string;
  readonly loadingTitle: string;
  readonly loadingBody: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly errorTitle: string;
  readonly errorBody: string;
  readonly retryTitle: string;
  readonly retryBody: string;
  readonly permissionTitle: string;
  readonly permissionBody: string;
  readonly permissionLink: string;
  readonly notFoundTitle: string;
  readonly notFoundBody: string;
  readonly notFoundLink: string;
}

const copyByLocale: Readonly<Record<SupportedLocale, PublicPropertyDetailsCopy>> = {
  ar: {
    backToResults: 'العودة إلى النتائج',
    sale: 'بيع',
    rent: 'إيجار',
    property: 'عقار',
    unit: 'وحدة',
    code: 'الكود',
    price: 'السعر',
    area: 'المساحة',
    bedrooms: 'الغرف',
    bathrooms: 'الحمامات',
    floor: 'الدور',
    sqm: 'م²',
    galleryTitle: 'صور العقار',
    imageUnavailable: 'الصورة غير متاحة',
    mediaUnavailable: 'لا تتوفر وسائط عامة لهذا العقار حالياً.',
    mediaItem: position => `الوسائط ${position}`,
    sourceTitle: 'مصدر هذا العقار',
    publishedSource: 'مصدر منشور معتمد',
    sourceTypes: {
      individual_broker: 'وسيط عقاري فردي',
      brokerage_office: 'مكتب وساطة عقارية',
      developer_company: 'شركة تطوير عقاري'
    },
    projectTitle: 'المشروع والمطور',
    projectUnavailable: 'لا يوجد مشروع منشور مرتبط بهذا العقار.',
    projectDescription: 'نبذة عن المشروع',
    descriptionTitle: 'وصف العقار',
    noDescription: 'لا يوجد وصف منشور لهذا العقار.',
    relatedTitle: 'عقارات مشابهة',
    contactTitle: 'استفسر عن هذا العقار',
    contactBody: 'أرسل طلب تواصل من خلال حساب الباحث عن عقار.',
    messageLabel: 'رسالتك',
    messagePlaceholder: 'اكتب سؤالك أو التفاصيل التي تريد معرفتها',
    submitContact: 'أرسل الطلب',
    requestViewing: 'طلب معاينة',
    viewingTitle: 'طلب معاينة العقار',
    viewingBody: 'اختر الوقت المناسب وسيراجع الفريق طلبك.',
    requestedAt: 'التاريخ والوقت',
    timezone: 'المنطقة الزمنية',
    timezonePlaceholder: 'مثال: Africa/Cairo',
    note: 'ملاحظة إضافية',
    notePlaceholder: 'أي تفاصيل تساعد الفريق',
    submitViewing: 'إرسال طلب المعاينة',
    cancel: 'إلغاء',
    close: 'إغلاق',
    contactValidation: 'اكتب رسالة قبل إرسال الطلب.',
    viewingValidation: 'أدخل وقتاً مستقبلياً ومنطقة زمنية صحيحة.',
    actionLoading: 'جارٍ الإرسال',
    actionSuccessTitle: 'تم إرسال الطلب',
    actionSuccessBody: 'تم حفظ طلبك في النظام للمراجعة.',
    actionPermissionTitle: 'يلزم تسجيل الدخول',
    actionPermissionBody: 'سجّل الدخول بحساب باحث عن عقار لإرسال الطلب.',
    actionPermissionLink: 'تسجيل الدخول',
    actionErrorTitle: 'تعذر إرسال الطلب',
    actionErrorBody: 'تحقق من الاتصال وحاول مرة أخرى.',
    retryLabel: 'إعادة المحاولة',
    loadingTitle: 'جارٍ تحميل تفاصيل العقار',
    loadingBody: 'يتم تجهيز البيانات المنشورة.',
    emptyTitle: 'لا توجد تفاصيل متاحة',
    emptyBody: 'لا تتوفر تفاصيل منشورة لهذا العقار حالياً.',
    errorTitle: 'تعذر تحميل تفاصيل العقار',
    errorBody: 'تحقق من الرابط والاتصال ثم حاول مرة أخرى.',
    retryTitle: 'خدمة العقار غير متاحة مؤقتاً',
    retryBody: 'يمكنك إعادة المحاولة عند توفر الاتصال.',
    permissionTitle: 'لا يمكن عرض هذه التفاصيل',
    permissionBody: 'لم يسمح الخادم بالوصول إلى تفاصيل العقار العامة.',
    permissionLink: 'العودة إلى الصفحة الرئيسية',
    notFoundTitle: 'العقار غير موجود',
    notFoundBody: 'ربما تم إخفاء العقار أو لم يعد منشوراً.',
    notFoundLink: 'تصفح العقارات'
  },
  en: {
    backToResults: 'Back to results',
    sale: 'For sale',
    rent: 'For rent',
    property: 'Property',
    unit: 'Unit',
    code: 'Code',
    price: 'Price',
    area: 'Area',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    floor: 'Floor',
    sqm: 'sqm',
    galleryTitle: 'Property gallery',
    imageUnavailable: 'Image unavailable',
    mediaUnavailable: 'No public media is available for this property yet.',
    mediaItem: position => `Media item ${position}`,
    sourceTitle: 'Property source',
    publishedSource: 'Approved published source',
    sourceTypes: {
      individual_broker: 'Individual broker',
      brokerage_office: 'Brokerage office',
      developer_company: 'Developer company'
    },
    projectTitle: 'Project and developer',
    projectUnavailable: 'No published project is linked to this property.',
    projectDescription: 'Project overview',
    descriptionTitle: 'Property description',
    noDescription: 'No published description is available for this property.',
    relatedTitle: 'Similar properties',
    contactTitle: 'Ask about this property',
    contactBody: 'Send a contact request through your property-seeker account.',
    messageLabel: 'Your message',
    messagePlaceholder: 'Write your question or the details you need',
    submitContact: 'Send request',
    requestViewing: 'Request a viewing',
    viewingTitle: 'Request a property viewing',
    viewingBody: 'Choose a suitable time and the team will review your request.',
    requestedAt: 'Date and time',
    timezone: 'Time zone',
    timezonePlaceholder: 'Example: Africa/Cairo',
    note: 'Additional note',
    notePlaceholder: 'Any detail that may help the team',
    submitViewing: 'Send viewing request',
    cancel: 'Cancel',
    close: 'Close',
    contactValidation: 'Write a message before sending the request.',
    viewingValidation: 'Enter a future time and a valid time zone.',
    actionLoading: 'Sending',
    actionSuccessTitle: 'Request sent',
    actionSuccessBody: 'Your request was saved for review.',
    actionPermissionTitle: 'Sign-in required',
    actionPermissionBody: 'Sign in with a property-seeker account to send a request.',
    actionPermissionLink: 'Sign in',
    actionErrorTitle: 'Request could not be sent',
    actionErrorBody: 'Check the connection and try again.',
    retryLabel: 'Retry',
    loadingTitle: 'Loading property details',
    loadingBody: 'Preparing the published property data.',
    emptyTitle: 'No property details available',
    emptyBody: 'No published details are available for this property yet.',
    errorTitle: 'Property details could not load',
    errorBody: 'Check the address and connection, then try again.',
    retryTitle: 'The property service is temporarily unavailable',
    retryBody: 'You can retry when the connection is available.',
    permissionTitle: 'These details are unavailable',
    permissionBody: 'The server did not allow access to the public property details.',
    permissionLink: 'Return to the homepage',
    notFoundTitle: 'Property not found',
    notFoundBody: 'It may have been hidden or is no longer published.',
    notFoundLink: 'Browse properties'
  },
  'zh-CN': {
    backToResults: '返回搜索结果',
    sale: '出售',
    rent: '出租',
    property: '房产',
    unit: '单元',
    code: '编号',
    price: '价格',
    area: '面积',
    bedrooms: '卧室',
    bathrooms: '浴室',
    floor: '楼层',
    sqm: '平方米',
    galleryTitle: '房产图库',
    imageUnavailable: '图片不可用',
    mediaUnavailable: '此房产暂时没有可用的公开媒体。',
    mediaItem: position => `媒体项目 ${position}`,
    sourceTitle: '房产来源',
    publishedSource: '已批准的公开来源',
    sourceTypes: {
      individual_broker: '个人经纪人',
      brokerage_office: '经纪公司',
      developer_company: '开发商公司'
    },
    projectTitle: '项目和开发商',
    projectUnavailable: '此房产没有关联的已发布项目。',
    projectDescription: '项目介绍',
    descriptionTitle: '房产描述',
    noDescription: '此房产暂无已发布的描述。',
    relatedTitle: '相似房产',
    contactTitle: '咨询此房产',
    contactBody: '通过购房者账户发送联系请求。',
    messageLabel: '您的留言',
    messagePlaceholder: '写下您的问题或需要了解的内容',
    submitContact: '发送请求',
    requestViewing: '预约看房',
    viewingTitle: '预约看房',
    viewingBody: '选择合适的时间，团队会审核您的请求。',
    requestedAt: '日期和时间',
    timezone: '时区',
    timezonePlaceholder: '例如：Africa/Cairo',
    note: '附加备注',
    notePlaceholder: '任何有助于团队处理的信息',
    submitViewing: '发送看房请求',
    cancel: '取消',
    close: '关闭',
    contactValidation: '发送请求前请填写留言。',
    viewingValidation: '请输入未来时间和有效时区。',
    actionLoading: '发送中',
    actionSuccessTitle: '请求已发送',
    actionSuccessBody: '您的请求已保存并等待审核。',
    actionPermissionTitle: '需要登录',
    actionPermissionBody: '请使用购房者账户登录后发送请求。',
    actionPermissionLink: '登录',
    actionErrorTitle: '请求无法发送',
    actionErrorBody: '请检查连接后重试。',
    retryLabel: '重试',
    loadingTitle: '正在加载房产详情',
    loadingBody: '正在准备已发布的房产数据。',
    emptyTitle: '暂无房产详情',
    emptyBody: '此房产暂时没有可用的已发布详情。',
    errorTitle: '房产详情无法加载',
    errorBody: '请检查地址和连接后重试。',
    retryTitle: '房产服务暂时不可用',
    retryBody: '连接恢复后可以再次尝试。',
    permissionTitle: '详情不可用',
    permissionBody: '服务器不允许访问公开房产详情。',
    permissionLink: '返回首页',
    notFoundTitle: '找不到房产',
    notFoundBody: '房产可能已隐藏或不再发布。',
    notFoundLink: '浏览房产'
  }
};

export function getPublicPropertyDetailsCopy(locale: SupportedLocale): PublicPropertyDetailsCopy {
  return copyByLocale[locale];
}
