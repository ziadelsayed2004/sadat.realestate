import type { SupportedLocale, ViewingStatus } from '@sadat-real-estate/contracts';

export interface ProviderViewingsCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly countSuffix: string;
  readonly filtersLabel: string;
  readonly statusLabel: string;
  readonly allStatuses: string;
  readonly apply: string;
  readonly clear: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly columns: Readonly<Record<'customer' | 'property' | 'date' | 'timezone' | 'status' | 'actions', string>>;
  readonly customerReference: string;
  readonly propertyReference: string;
  readonly note: string;
  readonly statuses: Readonly<Record<ViewingStatus, string>>;
  readonly actions: Readonly<Record<'confirm' | 'reschedule' | 'cancel' | 'complete' | 'none', string>>;
  readonly dialog: {
    readonly confirmTitle: string;
    readonly rescheduleTitle: string;
    readonly cancelTitle: string;
    readonly completeTitle: string;
    readonly confirmDescription: string;
    readonly rescheduleDescription: string;
    readonly cancelDescription: string;
    readonly completeDescription: string;
    readonly date: string;
    readonly timezone: string;
    readonly reason: string;
    readonly reasonHelp: string;
    readonly confirm: string;
    readonly cancel: string;
    readonly close: string;
  };
  readonly feedback: Readonly<Record<'confirmed' | 'rescheduled' | 'cancelled' | 'completed', string>>;
  readonly errors: Readonly<Record<'validation' | 'generic' | 'conflict', string>>;
  readonly pagination: string;
  readonly previous: string;
  readonly next: string;
}

const copy: Readonly<Record<SupportedLocale, ProviderViewingsCopy>> = {
  ar: {
    eyebrow: 'إدارة المعاينات',
    title: 'مواعيد المعاينات',
    description: 'راجع مواعيد معاينة العقارات التابعة لك ونفّذ الإجراءات التي يسمح بها النظام.',
    countSuffix: 'مواعيد',
    filtersLabel: 'تصفية المعاينات',
    statusLabel: 'الحالة',
    allStatuses: 'كل الحالات',
    apply: 'تطبيق',
    clear: 'مسح الفلاتر',
    emptyTitle: 'لا توجد معاينات بعد',
    emptyBody: 'ستظهر المواعيد المرتبطة بعقاراتك هنا عند توفرها.',
    columns: { customer: 'العميل', property: 'العقار', date: 'موعد المعاينة', timezone: 'المنطقة الزمنية', status: 'الحالة', actions: 'الإجراءات' },
    customerReference: 'مرجع العميل',
    propertyReference: 'مرجع العقار',
    note: 'ملاحظة العميل',
    statuses: { requested: 'مطلوب', confirmed: 'مؤكد', rescheduled: 'أعيدت جدولته', cancelled: 'ملغى', completed: 'مكتمل' },
    actions: { confirm: 'تأكيد الموعد', reschedule: 'إعادة الجدولة', cancel: 'إلغاء', complete: 'تسجيل كمكتمل', none: 'لا توجد إجراءات متاحة' },
    dialog: { confirmTitle: 'تأكيد موعد المعاينة', rescheduleTitle: 'إعادة جدولة المعاينة', cancelTitle: 'إلغاء المعاينة', completeTitle: 'إكمال المعاينة', confirmDescription: 'سيتم تحديث الحالة وفقًا لإصدار السجل الحالي.', rescheduleDescription: 'أدخل الموعد والمنطقة الزمنية الجديدة.', cancelDescription: 'أدخل سببًا واضحًا لإلغاء الموعد.', completeDescription: 'سجّل المعاينة كمكتملة وفقًا للحالة الحالية.', date: 'موعد المعاينة', timezone: 'المنطقة الزمنية', reason: 'السبب', reasonHelp: 'السبب مطلوب للإلغاء.', confirm: 'حفظ التغيير', cancel: 'إلغاء', close: 'إغلاق' },
    feedback: { confirmed: 'تم تأكيد الموعد.', rescheduled: 'تمت إعادة جدولة الموعد.', cancelled: 'تم إلغاء الموعد.', completed: 'تم تسجيل المعاينة كمكتملة.' },
    errors: { validation: 'راجع الحقول المطلوبة قبل الحفظ.', generic: 'تعذر تحديث الموعد. حاول مرة أخرى.', conflict: 'تغير الموعد على الخادم. أعد تحميل القائمة قبل المحاولة.' },
    pagination: 'صفحات المعاينات',
    previous: 'الصفحة السابقة',
    next: 'الصفحة التالية'
  },
  en: {
    eyebrow: 'Viewing management',
    title: 'Viewing appointments',
    description: 'Review appointments for properties owned by your provider account and use only the actions returned by the API.',
    countSuffix: 'appointments',
    filtersLabel: 'Filter viewing appointments',
    statusLabel: 'Status',
    allStatuses: 'All statuses',
    apply: 'Apply',
    clear: 'Clear filters',
    emptyTitle: 'No viewing appointments yet',
    emptyBody: 'Appointments linked to your owned properties will appear here when available.',
    columns: { customer: 'Customer', property: 'Property', date: 'Viewing time', timezone: 'Timezone', status: 'Status', actions: 'Actions' },
    customerReference: 'Customer reference',
    propertyReference: 'Property reference',
    note: 'Customer note',
    statuses: { requested: 'Requested', confirmed: 'Confirmed', rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed' },
    actions: { confirm: 'Confirm', reschedule: 'Reschedule', cancel: 'Cancel', complete: 'Mark complete', none: 'No actions available' },
    dialog: { confirmTitle: 'Confirm viewing appointment', rescheduleTitle: 'Reschedule viewing appointment', cancelTitle: 'Cancel viewing appointment', completeTitle: 'Complete viewing appointment', confirmDescription: 'The status will be updated against the current record version.', rescheduleDescription: 'Enter the new viewing time and timezone.', cancelDescription: 'Enter a clear reason for cancelling this appointment.', completeDescription: 'Mark this viewing as completed using the current record version.', date: 'Viewing time', timezone: 'Timezone', reason: 'Reason', reasonHelp: 'A reason is required for cancellation.', confirm: 'Save change', cancel: 'Cancel', close: 'Close' },
    feedback: { confirmed: 'Viewing appointment confirmed.', rescheduled: 'Viewing appointment rescheduled.', cancelled: 'Viewing appointment cancelled.', completed: 'Viewing appointment marked complete.' },
    errors: { validation: 'Review the required fields before saving.', generic: 'The appointment could not be updated. Try again.', conflict: 'The appointment changed on the server. Reload the list before trying again.' },
    pagination: 'Viewing appointment pages',
    previous: 'Previous page',
    next: 'Next page'
  },};

export function getProviderViewingsCopy(locale: SupportedLocale): ProviderViewingsCopy {
  return copy[locale];
}
