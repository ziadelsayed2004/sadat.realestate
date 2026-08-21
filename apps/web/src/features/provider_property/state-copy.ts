import type { PropertyData, PropertyStatus, SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderPropertyValidationIssue = 'location' | 'price' | 'contact' | 'status';
export type ProviderPropertyStateStatus = Extract<PropertyStatus, 'pending_review' | 'rejected' | 'approved' | 'published' | 'hidden'>;

export interface ProviderPropertyStateCopy {
  readonly validation: {
    readonly title: string;
    readonly body: string;
    readonly reasonLabel: string;
    readonly reasonUnavailable: string;
    readonly issueLabels: Readonly<Record<ProviderPropertyValidationIssue, string>>;
    readonly back: string;
    readonly edit: string;
    readonly editUnavailable: string;
    readonly safeTitle: string;
    readonly safeBody: string;
  };
  readonly statuses: Readonly<Record<ProviderPropertyStateStatus, {
    readonly title: string;
    readonly body: string;
    readonly reasonLabel: string;
    readonly reasonUnavailable: string;
  }>>;
  readonly labels: {
    readonly reference: string;
    readonly submittedAt: string;
    readonly reviewedAt: string;
    readonly status: string;
    readonly views: string;
    readonly unavailable: string;
    readonly safeTitle: string;
    readonly safeBody: string;
  };
  readonly actions: {
    readonly back: string;
    readonly viewProperty: string;
    readonly viewPublic: string;
    readonly supportUnavailable: string;
    readonly retry: string;
  };
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderPropertyStateCopy>> = {
  ar: {
    validation: {
      title: 'العقار بحاجة إلى إجراء تعديلات',
      body: 'راجع المتطلبات التالية وأكمل بيانات العقار قبل الإرسال.',
      reasonLabel: 'سبب المراجعة',
      reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا للمراجعة.',
      issueLabels: { location: 'الموقع', price: 'السعر', contact: 'بيانات التواصل', status: 'الحالة' },
      back: 'العودة إلى العقارات',
      edit: 'إجراء التعديل',
      editUnavailable: 'الإجراء غير متاح من حالة الخادم الحالية.',
      safeTitle: 'ملخص آمن',
      safeBody: 'يعرض هذا الملخص بيانات العقار المسموح بها لمقدم الخدمة فقط، ولا يعرض ملاحظات الإدارة أو التعيينات أو بيانات التدقيق.'
    },
    statuses: {
      pending_review: { title: 'تم إرسال العقار للمراجعة', body: 'سيراجع فريق عقارات السادات بيانات العقار في أقرب وقت ممكن، وسيتم إشعارك بالنتيجة.', reasonLabel: 'سبب الإرسال', reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا.' },
      rejected: { title: 'لم يتم اعتماد العقار', body: 'لم يستوف هذا العقار معايير الإدارة في المراجعة الحالية.', reasonLabel: 'سبب الرفض', reasonUnavailable: 'لم يرسل الخادم سببًا للقرار.' },
      approved: { title: 'تم اعتماد العقار', body: 'تم اعتماد العقار من فريق المراجعة، ولم يقدّم الخادم إجراء نشر لمقدم الخدمة.', reasonLabel: 'سبب الاعتماد', reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا.' },
      published: { title: 'تم نشر العقار', body: 'العقار متاح للعرض العام على منصة عقارات السادات.', reasonLabel: 'آخر سبب للمراجعة', reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا.' },
      hidden: { title: 'العقار غير ظاهر حاليًا', body: 'العقار محفوظ في حسابك لكنه غير متاح للعرض العام وفق حالته الحالية.', reasonLabel: 'سبب الحالة', reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا.' }
    },
    labels: { reference: 'المرجع', submittedAt: 'تاريخ الإرسال', reviewedAt: 'تاريخ المراجعة', status: 'الحالة', views: 'المشاهدات', unavailable: 'غير متاح', safeTitle: 'بيانات آمنة', safeBody: 'يظهر هذا العرض فقط بيانات عقد العقار المسموح بها لمقدم الخدمة.' },
    actions: { back: 'العودة إلى عقاراتي', viewProperty: 'عرض العقار', viewPublic: 'عرض الصفحة العامة', supportUnavailable: 'لا يتوفر مسار دعم في العقد الحالي.', retry: 'إعادة المحاولة' }
  },
  en: {
    validation: {
      title: 'Property needs changes',
      body: 'Review the following requirements and complete the property data before submitting.',
      reasonLabel: 'Review reason',
      reasonUnavailable: 'The server did not provide an additional review reason.',
      issueLabels: { location: 'Location', price: 'Price', contact: 'Contact data', status: 'Status' },
      back: 'Back to properties',
      edit: 'Make changes',
      editUnavailable: 'This action is unavailable in the current server state.',
      safeTitle: 'Safe summary',
      safeBody: 'This summary renders only provider-permitted property data; administrator notes, assignments, and audit data are excluded.'
    },
    statuses: {
      pending_review: { title: 'Property submitted for review', body: 'The Sadat Real Estate review team will review the property data as soon as possible and notify you of the result.', reasonLabel: 'Submission reason', reasonUnavailable: 'The server did not provide an additional reason.' },
      rejected: { title: 'Property was not approved', body: 'This property did not meet the administration criteria in the current review.', reasonLabel: 'Rejection reason', reasonUnavailable: 'The server did not provide a decision reason.' },
      approved: { title: 'Property approved', body: 'The review team approved the property, but the provider contract does not expose a publish action.', reasonLabel: 'Approval reason', reasonUnavailable: 'The server did not provide an additional reason.' },
      published: { title: 'Property published', body: 'The property is available for public viewing on the Sadat Real Estate platform.', reasonLabel: 'Latest review reason', reasonUnavailable: 'The server did not provide an additional reason.' },
      hidden: { title: 'Property is currently hidden', body: 'The property remains in your account but is not available for public viewing in its current state.', reasonLabel: 'State reason', reasonUnavailable: 'The server did not provide an additional reason.' }
    },
    labels: { reference: 'Reference', submittedAt: 'Submitted at', reviewedAt: 'Reviewed at', status: 'Status', views: 'Views', unavailable: 'Unavailable', safeTitle: 'Safe data', safeBody: 'This view contains only provider-permitted property contract data.' },
    actions: { back: 'Back to my properties', viewProperty: 'View property', viewPublic: 'View public page', supportUnavailable: 'A support route is not available in the current contract.', retry: 'Retry' }
  },
  'zh-CN': {
    validation: {
      title: '房产需要修改',
      body: '请检查以下要求，并在提交前补全房产信息。',
      reasonLabel: '审核原因',
      reasonUnavailable: '服务器未提供其他审核原因。',
      issueLabels: { location: '位置', price: '价格', contact: '联系信息', status: '状态' },
      back: '返回房产列表',
      edit: '进行修改',
      editUnavailable: '当前服务器状态不支持此操作。',
      safeTitle: '安全摘要',
      safeBody: '此摘要只显示提供方契约允许的房产数据，不包含管理员备注、分配或审计数据。'
    },
    statuses: {
      pending_review: { title: '房产已提交审核', body: '萨达特房地产审核团队会尽快审核房产信息，并通知你结果。', reasonLabel: '提交原因', reasonUnavailable: '服务器未提供其他原因。' },
      rejected: { title: '房产未获批准', body: '此房产未通过本次审核的管理标准。', reasonLabel: '拒绝原因', reasonUnavailable: '服务器未提供决定原因。' },
      approved: { title: '房产已获批准', body: '审核团队已批准此房产，但提供方契约未开放发布操作。', reasonLabel: '批准原因', reasonUnavailable: '服务器未提供其他原因。' },
      published: { title: '房产已发布', body: '此房产已在萨达特房地产平台公开展示。', reasonLabel: '最近审核原因', reasonUnavailable: '服务器未提供其他原因。' },
      hidden: { title: '房产当前已隐藏', body: '房产仍保存在你的账户中，但当前状态不支持公开展示。', reasonLabel: '状态原因', reasonUnavailable: '服务器未提供其他原因。' }
    },
    labels: { reference: '参考号', submittedAt: '提交时间', reviewedAt: '审核时间', status: '状态', views: '浏览量', unavailable: '不可用', safeTitle: '安全数据', safeBody: '此页面只包含提供方契约允许的房产数据。' },
    actions: { back: '返回我的房产', viewProperty: '查看房产', viewPublic: '查看公开页面', supportUnavailable: '当前契约没有提供支持路径。', retry: '重试' }
  }
};

export function getProviderPropertyStateCopy(locale: SupportedLocale): ProviderPropertyStateCopy {
  return copyByLocale[locale];
}

export function getProviderPropertyValidationIssues(property: PropertyData): readonly ProviderPropertyValidationIssue[] {
  const issues: ProviderPropertyValidationIssue[] = [];
  if (property.locationId === undefined) issues.push('location');
  if (property.price === undefined) issues.push('price');
  if (property.contact?.phone === undefined && property.contact?.whatsappNumber === undefined && property.contact?.email === undefined) issues.push('contact');
  if (!property.active || !['draft', 'needs_changes'].includes(property.status)) issues.push('status');
  return issues;
}
