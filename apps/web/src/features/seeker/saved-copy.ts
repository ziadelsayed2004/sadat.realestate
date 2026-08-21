import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface SeekerSavedCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly count: string;
  readonly view: string;
  readonly remove: string;
  readonly removing: string;
  readonly savedAt: string;
  readonly imageUnavailable: string;
  readonly sale: string;
  readonly rent: string;
  readonly property: string;
  readonly unit: string;
  readonly area: string;
  readonly bedrooms: string;
  readonly bathrooms: string;
  readonly floor: string;
  readonly sqm: string;
  readonly pagination: string;
  readonly previous: string;
  readonly next: string;
  readonly empty: { readonly title: string; readonly body: string };
  readonly states: {
    readonly loading: { readonly title: string; readonly body: string };
    readonly retry: { readonly title: string; readonly body: string };
    readonly error: { readonly title: string; readonly body: string };
    readonly permission: { readonly title: string; readonly body: string };
  };
  readonly mutation: {
    readonly removed: string;
    readonly alreadyRemoved: string;
    readonly unavailable: string;
    readonly permission: string;
    readonly error: string;
  };
  readonly retry: string;
}

const copy: Readonly<Record<SupportedLocale, SeekerSavedCopy>> = {
  ar: {
    eyebrow: 'مساحة الباحث عن عقار',
    title: 'العقارات المحفوظة',
    description: 'راجع العقارات التي حفظتها في حسابك.',
    count: 'عقار محفوظ',
    view: 'عرض العقار',
    remove: 'إزالة',
    removing: 'جارٍ الإزالة…',
    savedAt: 'تاريخ الحفظ',
    imageUnavailable: 'الصورة غير متاحة',
    sale: 'بيع',
    rent: 'إيجار',
    property: 'عقار',
    unit: 'وحدة',
    area: 'المساحة',
    bedrooms: 'غرف',
    bathrooms: 'حمامات',
    floor: 'الطابق',
    sqm: 'م²',
    pagination: 'صفحات العقارات المحفوظة',
    previous: 'الصفحة السابقة',
    next: 'الصفحة التالية',
    empty: { title: 'لا توجد عقارات محفوظة', body: 'ستظهر العقارات التي تحفظها هنا.' },
    states: {
      loading: { title: 'جارٍ تحميل العقارات المحفوظة', body: 'يتم جلب العقارات المحفوظة من المنصة.' },
      retry: { title: 'تعذر تحميل العقارات المحفوظة', body: 'تحقق من الاتصال وحاول مرة أخرى.' },
      error: { title: 'العقارات المحفوظة غير متاحة', body: 'تعذر قراءة العقارات المحفوظة. حاول لاحقاً.' },
      permission: { title: 'يلزم تسجيل الدخول', body: 'العقارات المحفوظة متاحة لحساب الباحث الموثق فقط.' }
    },
    mutation: {
      removed: 'تمت إزالة العقار من المحفوظات.',
      alreadyRemoved: 'العقار غير موجود في المحفوظات.',
      unavailable: 'هذا العقار غير متاح حالياً.',
      permission: 'انتهت صلاحية الجلسة. سجل الدخول وحاول مرة أخرى.',
      error: 'تعذر تحديث المحفوظات. حاول مرة أخرى.'
    },
    retry: 'إعادة المحاولة'
  },
  en: {
    eyebrow: 'Seeker workspace',
    title: 'Saved properties',
    description: 'Review the properties saved to your account.',
    count: 'saved properties',
    view: 'View property',
    remove: 'Remove',
    removing: 'Removing…',
    savedAt: 'Saved on',
    imageUnavailable: 'Image unavailable',
    sale: 'For sale',
    rent: 'For rent',
    property: 'Property',
    unit: 'Unit',
    area: 'Area',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    floor: 'Floor',
    sqm: 'sqm',
    pagination: 'Saved property pages',
    previous: 'Previous page',
    next: 'Next page',
    empty: { title: 'No saved properties', body: 'Properties you save will appear here.' },
    states: {
      loading: { title: 'Loading saved properties', body: 'Saved properties are being retrieved from the platform.' },
      retry: { title: 'Saved properties could not load', body: 'Check the connection and try again.' },
      error: { title: 'Saved properties are unavailable', body: 'The saved property data could not be read. Try again later.' },
      permission: { title: 'Sign-in required', body: 'Saved properties are available only to a verified seeker account.' }
    },
    mutation: {
      removed: 'Property removed from saved properties.',
      alreadyRemoved: 'Property was already absent from saved properties.',
      unavailable: 'This property is no longer available.',
      permission: 'Your session has expired. Sign in and try again.',
      error: 'Saved properties could not be updated. Try again.'
    },
    retry: 'Retry'
  },
  'zh-CN': {
    eyebrow: '求购者工作区',
    title: '已保存房产',
    description: '查看已保存到当前账户的房产。',
    count: '个已保存房产',
    view: '查看房产',
    remove: '移除',
    removing: '正在移除…',
    savedAt: '保存时间',
    imageUnavailable: '图片不可用',
    sale: '出售',
    rent: '出租',
    property: '房产',
    unit: '单元',
    area: '面积',
    bedrooms: '卧室',
    bathrooms: '卫生间',
    floor: '楼层',
    sqm: '平方米',
    pagination: '已保存房产分页',
    previous: '上一页',
    next: '下一页',
    empty: { title: '暂无已保存房产', body: '保存的房产会显示在这里。' },
    states: {
      loading: { title: '正在加载已保存房产', body: '正在从平台获取已保存房产。' },
      retry: { title: '无法加载已保存房产', body: '请检查连接后重试。' },
      error: { title: '已保存房产暂不可用', body: '无法读取已保存房产，请稍后重试。' },
      permission: { title: '需要登录', body: '只有已验证的求购者账户才能查看已保存房产。' }
    },
    mutation: {
      removed: '房产已从已保存列表中移除。',
      alreadyRemoved: '房产已不在已保存列表中。',
      unavailable: '该房产目前不可用。',
      permission: '会话已过期，请登录后重试。',
      error: '无法更新已保存房产，请重试。'
    },
    retry: '重试'
  }
};

export function getSeekerSavedCopy(locale: SupportedLocale): SeekerSavedCopy {
  return copy[locale];
}
