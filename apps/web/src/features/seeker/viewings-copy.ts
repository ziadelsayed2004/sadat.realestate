import type { SupportedLocale, ViewingStatus } from '@sadat-real-estate/contracts';

export type SeekerViewingTab = 'upcoming' | 'past' | 'cancelled';

export interface SeekerViewingsCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly count: string;
  readonly tabs: Readonly<Record<SeekerViewingTab, string>>;
  readonly property: string;
  readonly location: string;
  readonly source: string;
  readonly openProperty: string;
  readonly date: string;
  readonly time: string;
  readonly timezone: string;
  readonly note: string;
  readonly details: string;
  readonly hideDetails: string;
  readonly requestViewing: string;
  readonly requestViewingTitle: string;
  readonly reschedule: string;
  readonly cancel: string;
  readonly cancelConfirm: string;
  readonly submit: string;
  readonly save: string;
  readonly close: string;
  readonly propertyId: string;
  readonly requestedAt: string;
  readonly formTimezone: string;
  readonly formNote: string;
  readonly required: string;
  readonly invalidProperty: string;
  readonly invalidDate: string;
  readonly invalidTimezone: string;
  readonly invalidNote: string;
  readonly empty: Readonly<Record<SeekerViewingTab, { readonly title: string; readonly body: string }>>;
  readonly states: {
    readonly loading: { readonly title: string; readonly body: string };
    readonly retry: { readonly title: string; readonly body: string };
    readonly error: { readonly title: string; readonly body: string };
    readonly permission: { readonly title: string; readonly body: string };
  };
  readonly mutation: {
    readonly saving: string;
    readonly created: string;
    readonly updated: string;
    readonly cancelled: string;
    readonly conflict: string;
    readonly notFound: string;
    readonly error: string;
  };
  readonly statuses: Readonly<Record<ViewingStatus, string>>;
  readonly retry: string;
}

const copy: Readonly<Record<SupportedLocale, SeekerViewingsCopy>> = {
  ar: {
    eyebrow: 'مساحة الباحث عن عقار',
    title: 'مواعيد المعاينة',
    description: 'تابع مواعيد معاينة العقارات المرتبطة بحسابك فقط.',
    count: 'مواعيد',
    tabs: { upcoming: 'القادمة', past: 'السابقة', cancelled: 'الملغاة' },
    property: 'العقار',
    location: 'الموقع',
    source: 'المزوّد',
    openProperty: 'عرض العقار',
    date: 'التاريخ',
    time: 'الوقت',
    timezone: 'المنطقة الزمنية',
    note: 'ملاحظتك',
    details: 'عرض التفاصيل',
    hideDetails: 'إخفاء التفاصيل',
    requestViewing: 'طلب موعد معاينة',
    requestViewingTitle: 'طلب موعد معاينة جديد',
    reschedule: 'إعادة الجدولة',
    cancel: 'إلغاء الموعد',
    cancelConfirm: 'هل تريد إلغاء هذا الموعد؟',
    submit: 'إرسال الطلب',
    save: 'حفظ الموعد',
    close: 'إغلاق',
    propertyId: 'معرّف العقار',
    requestedAt: 'موعد المعاينة',
    formTimezone: 'المنطقة الزمنية',
    formNote: 'ملاحظة اختيارية',
    required: 'هذا الحقل مطلوب.',
    invalidProperty: 'أدخل معرّف عقار صالحاً.',
    invalidDate: 'اختر موعداً مستقبلياً صالحاً.',
    invalidTimezone: 'أدخل منطقة زمنية صالحة.',
    invalidNote: 'يجب ألا تتجاوز الملاحظة 1000 حرف.',
    empty: {
      upcoming: { title: 'لا توجد مواعيد قادمة', body: 'ستظهر مواعيد المعاينة القادمة المرتبطة بحسابك هنا.' },
      past: { title: 'لا توجد مواعيد سابقة', body: 'ستظهر مواعيد المعاينة المكتملة هنا.' },
      cancelled: { title: 'لا توجد مواعيد ملغاة', body: 'ستظهر المواعيد التي ألغيتها هنا.' }
    },
    states: {
      loading: { title: 'جارٍ تحميل المواعيد', body: 'يتم جلب مواعيد المعاينة من المنصة.' },
      retry: { title: 'تعذر تحميل المواعيد', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      error: { title: 'المواعيد غير متاحة', body: 'تعذر قراءة مواعيد المعاينة. حاول لاحقاً.' },
      permission: { title: 'يلزم تسجيل الدخول', body: 'هذه البيانات متاحة لحساب الباحث الموثق فقط.' }
    },
    mutation: {
      saving: 'جارٍ حفظ التغيير…',
      created: 'تم إرسال طلب المعاينة.',
      updated: 'تم تحديث موعد المعاينة.',
      cancelled: 'تم إلغاء موعد المعاينة.',
      conflict: 'تغير هذا الموعد أو لم يعد متاحاً. حدّث القائمة وحاول مرة أخرى.',
      notFound: 'لم يعد هذا الموعد متاحاً ضمن مواعيد حسابك.',
      error: 'تعذر حفظ التغيير. تحقق من البيانات وحاول مرة أخرى.'
    },
    statuses: { requested: 'قيد الطلب', confirmed: 'مؤكد', rescheduled: 'أعيدت جدولته', cancelled: 'ملغى', completed: 'مكتمل' },
    retry: 'إعادة المحاولة'
  },
  en: {
    eyebrow: 'Seeker workspace',
    title: 'Viewing appointments',
    description: 'Track only the property viewing appointments connected to your account.',
    count: 'appointments',
    tabs: { upcoming: 'Upcoming', past: 'Past', cancelled: 'Cancelled' },
    property: 'Property',
    location: 'Location',
    source: 'Provider',
    openProperty: 'View property',
    date: 'Date',
    time: 'Time',
    timezone: 'Timezone',
    note: 'Your note',
    details: 'View details',
    hideDetails: 'Hide details',
    requestViewing: 'Request a viewing',
    requestViewingTitle: 'Request a new viewing',
    reschedule: 'Reschedule',
    cancel: 'Cancel appointment',
    cancelConfirm: 'Cancel this appointment?',
    submit: 'Submit request',
    save: 'Save appointment',
    close: 'Close',
    propertyId: 'Property ID',
    requestedAt: 'Viewing time',
    formTimezone: 'Timezone',
    formNote: 'Optional note',
    required: 'This field is required.',
    invalidProperty: 'Enter a valid property ID.',
    invalidDate: 'Choose a valid future appointment time.',
    invalidTimezone: 'Enter a valid timezone.',
    invalidNote: 'The note must be 1,000 characters or fewer.',
    empty: {
      upcoming: { title: 'No upcoming appointments', body: 'Upcoming viewing appointments connected to your account will appear here.' },
      past: { title: 'No past appointments', body: 'Completed viewing appointments will appear here.' },
      cancelled: { title: 'No cancelled appointments', body: 'Appointments cancelled by your account will appear here.' }
    },
    states: {
      loading: { title: 'Loading appointments', body: 'Your viewing appointments are being retrieved from the platform.' },
      retry: { title: 'Appointments could not load', body: 'Check the connection and try again.' },
      error: { title: 'Appointments are unavailable', body: 'The viewing appointment data could not be read. Try again later.' },
      permission: { title: 'Sign-in required', body: 'This data is available only to a verified seeker account.' }
    },
    mutation: {
      saving: 'Saving your change…',
      created: 'Viewing request submitted.',
      updated: 'Viewing appointment updated.',
      cancelled: 'Viewing appointment cancelled.',
      conflict: 'This appointment changed or is no longer available. Refresh and try again.',
      notFound: 'This appointment is no longer available within your account.',
      error: 'The change could not be saved. Check the details and try again.'
    },
    statuses: { requested: 'Requested', confirmed: 'Confirmed', rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed' },
    retry: 'Retry'
  },};

export function getSeekerViewingsCopy(locale: SupportedLocale): SeekerViewingsCopy {
  return copy[locale];
}
