import type { RequestStatus, RequestType, SupportedLocale } from '@sadat-real-estate/contracts';

export interface SeekerRequestsCopy {
  readonly list: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly count: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly requestId: string;
    readonly type: string;
    readonly status: string;
    readonly submitted: string;
    readonly details: string;
    readonly previous: string;
    readonly next: string;
    readonly pagination: string;
  };
  readonly detail: {
    readonly eyebrow: string;
    readonly title: string;
    readonly summary: string;
    readonly timeline: string;
    readonly type: string;
    readonly status: string;
    readonly submitted: string;
    readonly updated: string;
    readonly property: string;
    readonly project: string;
    readonly message: string;
    readonly note: string;
    readonly unavailable: string;
    readonly back: string;
  };
  readonly states: {
    readonly loading: { readonly title: string; readonly body: string };
    readonly retry: { readonly title: string; readonly body: string };
    readonly error: { readonly title: string; readonly body: string };
    readonly permission: { readonly title: string; readonly body: string };
    readonly notFound: { readonly title: string; readonly body: string };
  };
  readonly statuses: Readonly<Record<RequestStatus, string>>;
  readonly types: Readonly<Record<RequestType, string>>;
  readonly retry: string;
}

const copy: Readonly<Record<SupportedLocale, SeekerRequestsCopy>> = {
  ar: {
    list: {
      eyebrow: 'مساحة الباحث عن عقار',
      title: 'طلباتي',
      description: 'تابع طلبات البحث والتواصل والمعاينة التي تخص حسابك فقط.',
      count: 'طلب',
      emptyTitle: 'لا توجد طلبات بعد',
      emptyBody: 'ستظهر طلباتك هنا عند إرسال طلب بحث أو تواصل من حسابك.',
      requestId: 'رقم الطلب',
      type: 'نوع الطلب',
      status: 'الحالة',
      submitted: 'تاريخ الإرسال',
      details: 'عرض التفاصيل',
      previous: 'الصفحة السابقة',
      next: 'الصفحة التالية',
      pagination: 'صفحات الطلبات'
    },
    detail: {
      eyebrow: 'تفاصيل الطلب',
      title: 'تفاصيل طلبك',
      summary: 'ملخص الطلب',
      timeline: 'مسار الطلب',
      type: 'نوع الطلب',
      status: 'الحالة الحالية',
      submitted: 'تاريخ الإرسال',
      updated: 'آخر تحديث',
      property: 'العقار المرتبط',
      project: 'المشروع المرتبط',
      message: 'رسالتك',
      note: 'ملاحظتك',
      unavailable: 'لا توجد تفاصيل إضافية في العقد المتاح.',
      back: 'العودة إلى الطلبات'
    },
    states: {
      loading: { title: 'جارٍ تحميل الطلبات', body: 'يتم جلب بيانات طلباتك من المنصة.' },
      retry: { title: 'تعذر تحميل الطلبات', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      error: { title: 'الطلبات غير متاحة', body: 'تعذر قراءة بيانات الطلبات. حاول لاحقًا.' },
      permission: { title: 'يلزم تسجيل الدخول', body: 'هذه البيانات متاحة لحساب الباحث الموثق فقط.' },
      notFound: { title: 'الطلب غير موجود', body: 'لا يمكن العثور على هذا الطلب ضمن طلبات حسابك.' }
    },
    statuses: {
      new: 'جديد', under_review: 'قيد المراجعة', contacted: 'تم التواصل', scheduled: 'مجدول', needs_information: 'يحتاج معلومات', in_progress: 'قيد التنفيذ', resolved: 'تم الحل', cancelled: 'ملغى', closed: 'مغلق'
    },
    types: { contact: 'طلب تواصل', viewing: 'طلب معاينة', property_search: 'بحث عن عقار', provider_customer: 'طلب عميل' },
    retry: 'إعادة المحاولة'
  },
  en: {
    list: {
      eyebrow: 'Seeker workspace',
      title: 'My requests',
      description: 'Track only the property-search, contact, and viewing requests owned by your account.',
      count: 'requests',
      emptyTitle: 'No requests yet',
      emptyBody: 'Your requests will appear here after you send a search or contact request.',
      requestId: 'Request ID',
      type: 'Request type',
      status: 'Status',
      submitted: 'Submitted',
      details: 'View details',
      previous: 'Previous page',
      next: 'Next page',
      pagination: 'Request pages'
    },
    detail: {
      eyebrow: 'Request details',
      title: 'Your request details',
      summary: 'Request summary',
      timeline: 'Request timeline',
      type: 'Request type',
      status: 'Current status',
      submitted: 'Submitted',
      updated: 'Last updated',
      property: 'Linked property',
      project: 'Linked project',
      message: 'Your message',
      note: 'Your note',
      unavailable: 'No additional details are available in the implemented contract.',
      back: 'Back to requests'
    },
    states: {
      loading: { title: 'Loading requests', body: 'Your request data is being retrieved from the platform.' },
      retry: { title: 'Requests could not load', body: 'Check the connection and try again.' },
      error: { title: 'Requests are unavailable', body: 'The request data could not be read. Try again later.' },
      permission: { title: 'Sign-in required', body: 'This data is available only to a verified seeker account.' },
      notFound: { title: 'Request not found', body: 'This request is not available within your account-owned requests.' }
    },
    statuses: {
      new: 'New', under_review: 'Under review', contacted: 'Contacted', scheduled: 'Scheduled', needs_information: 'Needs information', in_progress: 'In progress', resolved: 'Resolved', cancelled: 'Cancelled', closed: 'Closed'
    },
    types: { contact: 'Contact request', viewing: 'Viewing request', property_search: 'Property search', provider_customer: 'Customer request' },
    retry: 'Retry'
  },
  'zh-CN': {
    list: {
      eyebrow: '求购者工作区',
      title: '我的请求',
      description: '仅查看属于当前账户的找房、联系和看房请求。',
      count: '个请求',
      emptyTitle: '暂时没有请求',
      emptyBody: '发送找房或联系请求后，它们会显示在这里。',
      requestId: '请求编号',
      type: '请求类型',
      status: '状态',
      submitted: '提交时间',
      details: '查看详情',
      previous: '上一页',
      next: '下一页',
      pagination: '请求分页'
    },
    detail: {
      eyebrow: '请求详情',
      title: '请求详情',
      summary: '请求摘要',
      timeline: '请求流程',
      type: '请求类型',
      status: '当前状态',
      submitted: '提交时间',
      updated: '最近更新',
      property: '关联房源',
      project: '关联项目',
      message: '你的留言',
      note: '你的备注',
      unavailable: '当前契约没有提供更多详情。',
      back: '返回请求列表'
    },
    states: {
      loading: { title: '正在加载请求', body: '正在从平台获取你的请求数据。' },
      retry: { title: '无法加载请求', body: '请检查连接后重试。' },
      error: { title: '请求暂不可用', body: '无法读取请求数据，请稍后重试。' },
      permission: { title: '需要登录', body: '只有已验证的求购者账户才能查看这些数据。' },
      notFound: { title: '未找到请求', body: '该请求不属于当前账户或已不可用。' }
    },
    statuses: {
      new: '新请求', under_review: '审核中', contacted: '已联系', scheduled: '已安排', needs_information: '需要信息', in_progress: '处理中', resolved: '已解决', cancelled: '已取消', closed: '已关闭'
    },
    types: { contact: '联系请求', viewing: '看房请求', property_search: '找房请求', provider_customer: '客户请求' },
    retry: '重试'
  }
};

export function getSeekerRequestsCopy(locale: SupportedLocale): SeekerRequestsCopy {
  return copy[locale];
}
