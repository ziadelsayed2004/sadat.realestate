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
  },
  'zh-CN': {
    eyebrow: '看房预约管理',
    title: '看房预约',
    description: '查看您账户所属房产的预约，并仅执行 API 返回的可用操作。',
    countSuffix: '个预约',
    filtersLabel: '筛选看房预约',
    statusLabel: '状态',
    allStatuses: '全部状态',
    apply: '应用',
    clear: '清除筛选',
    emptyTitle: '暂无看房预约',
    emptyBody: '与您所属房产关联的预约将在可用时显示在这里。',
    columns: { customer: '客户', property: '房产', date: '看房时间', timezone: '时区', status: '状态', actions: '操作' },
    customerReference: '客户参考',
    propertyReference: '房产参考',
    note: '客户备注',
    statuses: { requested: '已请求', confirmed: '已确认', rescheduled: '已改期', cancelled: '已取消', completed: '已完成' },
    actions: { confirm: '确认', reschedule: '改期', cancel: '取消', complete: '标记完成', none: '没有可用操作' },
    dialog: { confirmTitle: '确认看房预约', rescheduleTitle: '重新安排看房', cancelTitle: '取消看房预约', completeTitle: '完成看房预约', confirmDescription: '系统将根据当前记录版本更新状态。', rescheduleDescription: '请输入新的看房时间和时区。', cancelDescription: '请输入取消预约的明确原因。', completeDescription: '根据当前记录版本将预约标记为已完成。', date: '看房时间', timezone: '时区', reason: '原因', reasonHelp: '取消预约时必须填写原因。', confirm: '保存更改', cancel: '取消', close: '关闭' },
    feedback: { confirmed: '看房预约已确认。', rescheduled: '看房预约已改期。', cancelled: '看房预约已取消。', completed: '看房预约已标记为完成。' },
    errors: { validation: '保存前请检查必填字段。', generic: '无法更新预约，请重试。', conflict: '服务器上的预约已发生变化。请重新加载列表后再试。' },
    pagination: '看房预约分页',
    previous: '上一页',
    next: '下一页'
  }
};

export function getProviderViewingsCopy(locale: SupportedLocale): ProviderViewingsCopy {
  return copy[locale];
}
