import { localizeCopy } from '../localization/copy-catalog.ts';
import type { PropertyData, PropertyStatus, SupportedLocale } from '@sadat-real-estate/contracts';

export type ProviderPropertyValidationIssue = 'location' | 'price' | 'contact' | 'status';
export type ProviderPropertyStateStatus = Extract<PropertyStatus, 'pending_review' | 'rejected' | 'approved' | 'published' | 'hidden'>;

export interface ProviderPropertyStateCopy {
  readonly validation: {
    readonly title: string;
    readonly body: string;
    readonly notesTitle: string;
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
    readonly publishedWarning: string;
  };
  readonly actions: {
    readonly back: string;
    readonly contactSupport: string;
    readonly myProperties: string;
    readonly viewProperty: string;
    readonly viewPublic: string;
    readonly supportUnavailable: string;
    readonly retry: string;
  };
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderPropertyStateCopy>> = {
  ar: {
    validation: {
      title: 'العقار يحتاج إلى تعديل',
      body: 'راجع ملاحظات فريق المنصة وقم بإجراء التعديلات المطلوبة.',
      notesTitle: 'ملاحظات فريق المراجعة:',
      reasonLabel: 'سبب المراجعة',
      reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا للمراجعة.',
      issueLabels: { location: 'الموقع', price: 'السعر', contact: 'بيانات التواصل', status: 'الحالة' },
      back: 'العودة لاحقًا',
      edit: 'بدء التعديل',
      editUnavailable: 'الإجراء غير متاح من حالة الخادم الحالية.',
      safeTitle: 'ملخص آمن',
      safeBody: 'يعرض هذا الملخص بيانات العقار المسموح بها لمقدم الخدمة فقط، ولا يعرض ملاحظات الإدارة أو التعيينات أو بيانات التدقيق.'
    },
    statuses: {
      pending_review: { title: 'تم إرسال العقار للمراجعة', body: 'سيراجع فريق عقارات السادات بيانات العقار في أقرب وقت ممكن، وسيتم إشعارك بالنتيجة.', reasonLabel: 'سبب الإرسال', reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا.' },
      rejected: { title: 'تعذر اعتماد العقار', body: 'للأسف، لم يستوفِ هذا العقار معايير الإدراج في المنصة.', reasonLabel: 'سبب الرفض:', reasonUnavailable: 'لم يرسل الخادم سببًا للقرار.' },
      approved: { title: 'تم اعتماد العقار', body: 'تم اعتماد العقار من فريق المراجعة، ولم يقدّم الخادم إجراء نشر لمقدم الخدمة.', reasonLabel: 'سبب الاعتماد', reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا.' },
      published: { title: 'تم نشر العقار', body: 'العقار متاح للعرض العام على منصة عقارات السادات.', reasonLabel: 'آخر سبب للمراجعة', reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا.' },
      hidden: { title: 'العقار غير ظاهر حاليًا', body: 'العقار محفوظ في حسابك لكنه غير متاح للعرض العام وفق حالته الحالية.', reasonLabel: 'سبب الحالة', reasonUnavailable: 'لم يرسل الخادم سببًا إضافيًا.' }
    },
    labels: { reference: 'المرجع', submittedAt: 'تاريخ الإرسال', reviewedAt: 'تاريخ المراجعة', status: 'الحالة', views: 'المشاهدات', unavailable: 'غير متاح', safeTitle: 'بيانات آمنة', safeBody: 'يظهر هذا العرض فقط بيانات عقد العقار المسموح بها لمقدم الخدمة.', publishedWarning: 'تعديل البيانات الأساسية للعقار المنشور (السعر، الوصف، الموقع) قد يعيد العقار لمرحلة المراجعة مجددًا.' },
    actions: { back: 'العودة إلى عقاراتي', contactSupport: 'التواصل مع الدعم', myProperties: 'عقاراتي', viewProperty: 'عرض العقار', viewPublic: 'عرض الصفحة العامة', supportUnavailable: 'لا يتوفر مسار دعم في العقد الحالي.', retry: 'إعادة المحاولة' }
  },
  en: {
    validation: {
      title: 'Property needs changes',
      body: 'Review the platform team notes and make the requested changes.',
      notesTitle: 'Review team notes:',
      reasonLabel: 'Review reason',
      reasonUnavailable: 'The server did not provide an additional review reason.',
      issueLabels: { location: 'Location', price: 'Price', contact: 'Contact data', status: 'Status' },
      back: 'Come back later',
      edit: 'Start editing',
      editUnavailable: 'This action is unavailable in the current server state.',
      safeTitle: 'Safe summary',
      safeBody: 'This summary renders only provider-permitted property data; administrator notes, assignments, and audit data are excluded.'
    },
    statuses: {
      pending_review: { title: 'Property submitted for review', body: 'The Sadat Real Estate review team will review the property data as soon as possible and notify you of the result.', reasonLabel: 'Submission reason', reasonUnavailable: 'The server did not provide an additional reason.' },
      rejected: { title: 'Property approval failed', body: 'Unfortunately, this property did not meet the platform listing criteria.', reasonLabel: 'Rejection reason:', reasonUnavailable: 'The server did not provide a decision reason.' },
      approved: { title: 'Property approved', body: 'The review team approved the property, but the provider contract does not expose a publish action.', reasonLabel: 'Approval reason', reasonUnavailable: 'The server did not provide an additional reason.' },
      published: { title: 'Property published', body: 'The property is available for public viewing on the Sadat Real Estate platform.', reasonLabel: 'Latest review reason', reasonUnavailable: 'The server did not provide an additional reason.' },
      hidden: { title: 'Property is currently hidden', body: 'The property remains in your account but is not available for public viewing in its current state.', reasonLabel: 'State reason', reasonUnavailable: 'The server did not provide an additional reason.' }
    },
    labels: { reference: 'Reference', submittedAt: 'Submitted at', reviewedAt: 'Reviewed at', status: 'Status', views: 'Views', unavailable: 'Unavailable', safeTitle: 'Safe data', safeBody: 'This view contains only provider-permitted property contract data.', publishedWarning: 'Editing a published property’s core data (price, description, or location) may return it to review.' },
    actions: { back: 'Back to my properties', contactSupport: 'Contact support', myProperties: 'My properties', viewProperty: 'View property', viewPublic: 'View public page', supportUnavailable: 'A support route is not available in the current contract.', retry: 'Retry' }
  },};

export function getProviderPropertyStateCopy(locale: SupportedLocale): ProviderPropertyStateCopy {
  return localizeCopy('provider_property/state-copy#getProviderPropertyStateCopy', locale, copyByLocale[locale]);
}

export function getProviderPropertyValidationIssues(property: PropertyData): readonly ProviderPropertyValidationIssue[] {
  const issues: ProviderPropertyValidationIssue[] = [];
  if (property.locationId === undefined && property.mapUrl === undefined && property.coordinates === undefined) issues.push('location');
  if (property.price === undefined) issues.push('price');
  if (property.contact?.phone === undefined && property.contact?.whatsappNumber === undefined && property.contact?.email === undefined) issues.push('contact');
  if (!property.active || !['draft', 'needs_changes'].includes(property.status)) issues.push('status');
  return issues;
}
