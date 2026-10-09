import type { SupportedLocale, ViewingStatus, ViewingTransition } from '@sadat-real-estate/contracts';

export function viewingHelp(locale: SupportedLocale) {
  return locale === 'ar' ? {
    title: 'إيه دور طلبات المعاينة؟',
    description: 'لما العميل يختار عقارًا ويطلب زيارته في موعد محدد، الطلب بيظهر هنا لتنظيم الزيارة مع مقدّم العقار ومتابعة نتيجتها.',
    steps: ['راجع العقار والعميل والموعد المقترح.', 'اتفق على الموعد، ثم أكّده أو اختَر موعدًا جديدًا.', 'بعد الزيارة سجّل «تمت المعاينة»، أو ألغِ الموعد لو الزيارة لن تتم.'],
    notice: 'حفظ الإجراء يحدّث حالة المعاينة ويُرسل إشعارًا داخل المنصة للعميل ومقدّم العقار المرتبط بالطلب. رسالة الإجراء تظهر لهما.',
    details: 'تفاصيل طلب المعاينة', open: 'التفاصيل والإجراء', customer: 'العميل', unavailable: 'الاسم غير متاح', unnamed: 'عقار بدون اسم',
    time: 'كل المواعيد بتوقيت مصر', proposed: 'الموعد المسجّل',
    statuses: { requested: 'بانتظار التأكيد', confirmed: 'موعد مؤكد', rescheduled: 'موعد جديد ينتظر التأكيد', cancelled: 'ملغاة', completed: 'تمت المعاينة' } satisfies Record<ViewingStatus, string>,
    stateHelp: { requested: 'هذا موعد اقترحه العميل؛ راجع توفره قبل التأكيد.', confirmed: 'تم الاتفاق على هذا الموعد. بعد الزيارة سجّل نتيجتها.', rescheduled: 'تم تغيير الموعد؛ راجع الاتفاق مع العميل ثم أكّده.', cancelled: 'أُلغيت هذه المعاينة ولن تتم في الموعد المسجّل.', completed: 'تم تسجيل اكتمال زيارة العقار.' } satisfies Record<ViewingStatus, string>,
    actionTitle: 'عايز تعمل إيه في المعاينة؟',
    actions: { confirm: 'تأكيد الموعد', reschedule: 'تغيير الموعد', cancel: 'إلغاء المعاينة', complete: 'تمت المعاينة' } satisfies Record<ViewingTransition['action'], string>,
    actionHelp: { confirm: 'العميل ومقدّم العقار متفقان على الموعد المسجّل.', reschedule: 'اختَر تاريخًا ووقتًا جديدين بعد الاتفاق مع العميل.', cancel: 'الزيارة لن تتم. وضّح للعميل سبب الإلغاء.', complete: 'استخدمه بعد أن تتم زيارة العقار بالفعل.' } satisfies Record<ViewingTransition['action'], string>,
    reason: 'رسالة للعميل وسبب الإجراء', reasonHint: 'مطلوبة: من 5 إلى 500 حرف. تظهر في الإشعار للعميل ومقدّم العقار وتُحفظ في سجل الإدارة؛ اكتب رسالة واضحة مناسبة لهما.', reasonPlaceholder: 'اكتب توضيحًا للعميل عن الموعد أو سبب تغييره أو إلغائه…',
    reasonError: 'اكتب رسالة واضحة من 5 إلى 500 حرف لإتمام الإجراء.',
    date: 'التاريخ الجديد', clock: 'الساعة بتوقيت مصر', dateError: 'اختَر تاريخًا ووقتًا في المستقبل، خلال سنة من اليوم.',
    past: 'الموعد المسجّل فات. لو الزيارة لم تتم، اختَر «تغيير الموعد» وحدّد موعدًا جديدًا.',
    saved: 'تم حفظ الإجراء وإرسال إشعار داخل المنصة.', conflict: 'الطلب اتغيّر أو الموعد غير متاح. حدّث القائمة وراجع الحالة قبل إعادة المحاولة. رسالتك ما زالت في النموذج.',
    permission: 'حسابك لا يملك صلاحية إدارة المعاينات. يمكنك مراجعة التفاصيل فقط.', failed: 'تعذر الحفظ. رسالتك والموعد الجديد محفوظان في النموذج؛ حاول مرة أخرى.',
    closed: 'هذه المعاينة انتهت ولا توجد إجراءات أخرى عليها.', technical: 'معلومات السجل', refresh: 'تحديث القائمة', empty: 'لا توجد معاينات في هذه الحالة', emptyHelp: 'تظهر هنا طلبات زيارة العقارات التي يرسلها العملاء. جرّب «الكل» لمراجعة باقي الحالات.'
  } : {
    title: 'What are viewing requests for?',
    description: 'When a customer chooses a property and requests a visit at a specific time, it appears here so you can arrange the visit with the property provider and track its outcome.',
    steps: ['Review the property, customer and proposed appointment.', 'Agree on the time, then confirm it or choose a new appointment.', 'After the visit, record it as completed, or cancel if it will not take place.'],
    notice: 'Saving updates the viewing and sends an in-app notification to the customer and the linked property provider. They can see your action message.',
    details: 'Viewing request details', open: 'Details and action', customer: 'Customer', unavailable: 'Name unavailable', unnamed: 'Unnamed property',
    time: 'All appointments use Egypt time', proposed: 'Recorded appointment',
    statuses: { requested: 'Awaiting confirmation', confirmed: 'Appointment confirmed', rescheduled: 'New time awaiting confirmation', cancelled: 'Cancelled', completed: 'Viewing completed' } satisfies Record<ViewingStatus, string>,
    stateHelp: { requested: 'The customer proposed this appointment. Check availability before confirming.', confirmed: 'This appointment is agreed. Record the outcome after the visit.', rescheduled: 'The appointment changed. Check with the customer, then confirm it.', cancelled: 'This viewing was cancelled and will not take place at the recorded time.', completed: 'The property visit was recorded as completed.' } satisfies Record<ViewingStatus, string>,
    actionTitle: 'What would you like to do?',
    actions: { confirm: 'Confirm appointment', reschedule: 'Change appointment', cancel: 'Cancel viewing', complete: 'Viewing completed' } satisfies Record<ViewingTransition['action'], string>,
    actionHelp: { confirm: 'The customer and provider agree on the recorded appointment.', reschedule: 'Choose a new date and time after checking with the customer.', cancel: 'The visit will not take place. Explain the cancellation to the customer.', complete: 'Use this only after the property visit actually takes place.' } satisfies Record<ViewingTransition['action'], string>,
    reason: 'Customer message and action reason', reasonHint: 'Required: 5–500 characters. Included in the customer and provider notification and the administration log. Write a message suitable for both.', reasonPlaceholder: 'Explain the appointment or why it is changing or being cancelled…',
    reasonError: 'Write a clear message of 5–500 characters to continue.',
    date: 'New date', clock: 'Time in Egypt', dateError: 'Choose a future date and time within the next year.',
    past: 'The recorded appointment has passed. If the visit did not happen, choose “Change appointment” and select a new time.',
    saved: 'Action saved and in-app notification sent.', conflict: 'The request changed or the time is unavailable. Refresh the list and review its status before trying again. Your message stays in the form.',
    permission: 'Your account can review details but cannot manage viewings.', failed: 'Could not save. Your message and new appointment stay in the form. Try again.',
    closed: 'This viewing has ended and has no further actions.', technical: 'Record information', refresh: 'Refresh list', empty: 'No viewings in this status', emptyHelp: 'Customer requests to visit properties appear here. Choose All to review other statuses.'
  };
}

export function ViewingHelp({ locale }: { readonly locale: SupportedLocale }) {
  const copy = viewingHelp(locale);
  return <section className="admin-viewing__help" aria-labelledby="admin-viewing-help-title">
    <h2 id="admin-viewing-help-title">{copy.title}</h2><p>{copy.description}</p>
    <ol>{copy.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="admin-viewing__notice">{copy.notice}</p>
  </section>;
}
