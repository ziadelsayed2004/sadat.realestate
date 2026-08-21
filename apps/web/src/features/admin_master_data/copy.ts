import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminMasterDataTab = 'categories' | 'locations' | 'features';
export type AdminMasterDataState = 'loading' | 'empty' | 'success' | 'error' | 'retry' | 'permission';
export type AdminMasterDataKind = 'category' | 'type' | 'location' | 'neighborhood' | 'feature' | 'service';

export interface AdminMasterDataCopy {
  readonly eyebrow: string;
  readonly titles: Readonly<Record<AdminMasterDataTab, string>>;
  readonly descriptions: Readonly<Record<AdminMasterDataTab, string>>;
  readonly tabs: Readonly<Record<AdminMasterDataTab, string>>;
  readonly navigationLabel: string;
  readonly add: string;
  readonly edit: string;
  readonly delete: string;
  readonly save: string;
  readonly cancel: string;
  readonly close: string;
  readonly retry: string;
  readonly confirmDelete: string;
  readonly count: (value: number) => string;
  readonly columns: Readonly<Record<'name' | 'kind' | 'parent' | 'order' | 'active' | 'updated' | 'actions', string>>;
  readonly kinds: Readonly<Record<AdminMasterDataKind, string>>;
  readonly labels: Readonly<Record<'nameAr' | 'nameEn' | 'nameZh' | 'slug' | 'kind' | 'parent' | 'category' | 'group' | 'order' | 'active' | 'reason' | 'latitude' | 'longitude', string>>;
  readonly placeholders: Readonly<Record<'nameAr' | 'nameEn' | 'nameZh' | 'slug' | 'parent' | 'category' | 'group' | 'reason' | 'latitude' | 'longitude', string>>;
  readonly states: Readonly<Record<AdminMasterDataState, { readonly title: string; readonly body: string }>>;
  readonly mutation: Readonly<Record<'created' | 'updated' | 'deleted' | 'validation' | 'failed', string>>;
  readonly unavailable: string;
  readonly noParent: string;
  readonly noGroup: string;
  readonly noActions: string;
  readonly active: string;
  readonly inactive: string;
  readonly directionNote: string;
}

const copies: Readonly<Record<SupportedLocale, AdminMasterDataCopy>> = {
  ar: {
    eyebrow: 'إدارة البيانات الأساسية',
    titles: { categories: 'أنواع وتصنيفات العقارات', locations: 'المواقع والأحياء', features: 'المميزات والخدمات' },
    descriptions: {
      categories: 'إدارة التصنيفات والأنواع المستخدمة في العقارات والمشروعات.',
      locations: 'إدارة التسلسل الجغرافي للمحافظات والمدن والأحياء.',
      features: 'إدارة المميزات والخدمات المتاحة في بيانات العقارات والمشروعات.'
    },
    tabs: { categories: 'التصنيفات', locations: 'المواقع', features: 'المميزات والخدمات' },
    navigationLabel: 'تبويبات إدارة البيانات الأساسية',
    add: 'إضافة عنصر', edit: 'تعديل', delete: 'حذف', save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق', retry: 'إعادة المحاولة',
    confirmDelete: 'تأكيد حذف العنصر', count: value => `${value.toLocaleString('ar-EG')} عنصر`,
    columns: { name: 'الاسم', kind: 'النوع', parent: 'المجموعة أو الأب', order: 'الترتيب', active: 'الحالة', updated: 'آخر تحديث', actions: 'الإجراءات' },
    kinds: { category: 'تصنيف', type: 'نوع عقار', location: 'موقع', neighborhood: 'حي', feature: 'ميزة', service: 'خدمة' },
    labels: { nameAr: 'الاسم بالعربية', nameEn: 'الاسم بالإنجليزية', nameZh: 'الاسم بالصينية', slug: 'المعرّف المختصر', kind: 'النوع', parent: 'العنصر الأب', category: 'التصنيف الأب', group: 'مجموعة الميزة', order: 'الترتيب', active: 'نشط', reason: 'سبب التغيير', latitude: 'خط العرض', longitude: 'خط الطول' },
    placeholders: { nameAr: 'مثال: مدينة', nameEn: 'Example: City', nameZh: '例如：城市', slug: 'lowercase-slug', parent: 'اختر الموقع الأب', category: 'اختر التصنيف الأب', group: 'building_amenities', reason: 'اذكر سبب الحفظ أو التعديل', latitude: '30.0000', longitude: '31.0000' },
    states: {
      loading: { title: 'جارٍ تحميل البيانات', body: 'نحضر أحدث البيانات من الخادم.' },
      empty: { title: 'لا توجد عناصر بعد', body: 'لا توجد سجلات منشورة في هذا القسم. يمكنك إضافة عنصر عندما تتوفر بيانات معتمدة.' },
      error: { title: 'تعذر تحميل البيانات', body: 'حدث خطأ أثناء الاتصال بالخادم. حاول مرة أخرى.' },
      retry: { title: 'الاتصال غير متاح مؤقتاً', body: 'يمكنك إعادة المحاولة دون تغيير البيانات.' },
      permission: { title: 'الوصول غير متاح', body: 'لا تملك الجلسة الحالية صلاحية إدارة هذه البيانات.' },
      success: { title: 'البيانات جاهزة', body: 'تُعرض السجلات وفق الإسقاط المسموح به من الخادم.' }
    },
    mutation: { created: 'تمت إضافة العنصر.', updated: 'تم تحديث العنصر.', deleted: 'تم حذف العنصر.', validation: 'تحقق من الحقول المطلوبة وسبب التغيير.', failed: 'تعذر حفظ التغيير. أعد المحاولة.' },
    unavailable: 'غير متاح', noParent: 'بدون أب', noGroup: 'بدون مجموعة', noActions: 'لا توجد إجراءات متاحة', active: 'نشط', inactive: 'غير نشط', directionNote: 'العربية RTL — الإدارة معتمدة لسطح المكتب.'
  },
  en: {
    eyebrow: 'Master data administration',
    titles: { categories: 'Property categories & types', locations: 'Locations & neighborhoods', features: 'Features & services' },
    descriptions: {
      categories: 'Manage the categories and types used by properties and projects.',
      locations: 'Manage the geographic hierarchy of locations and neighborhoods.',
      features: 'Manage features and services available to properties and projects.'
    },
    tabs: { categories: 'Categories', locations: 'Locations', features: 'Features & services' },
    navigationLabel: 'Master data sections',
    add: 'Add item', edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', close: 'Close', retry: 'Retry',
    confirmDelete: 'Confirm item deletion', count: value => `${value.toLocaleString('en-US')} items`,
    columns: { name: 'Name', kind: 'Type', parent: 'Parent or group', order: 'Order', active: 'Status', updated: 'Updated', actions: 'Actions' },
    kinds: { category: 'Category', type: 'Property type', location: 'Location', neighborhood: 'Neighborhood', feature: 'Feature', service: 'Service' },
    labels: { nameAr: 'Arabic name', nameEn: 'English name', nameZh: 'Chinese name', slug: 'Slug', kind: 'Type', parent: 'Parent location', category: 'Parent category', group: 'Feature group', order: 'Order', active: 'Active', reason: 'Change reason', latitude: 'Latitude', longitude: 'Longitude' },
    placeholders: { nameAr: 'Example: City', nameEn: 'Example: City', nameZh: '例如：城市', slug: 'lowercase-slug', parent: 'Select parent location', category: 'Select parent category', group: 'building_amenities', reason: 'Explain why this change is needed', latitude: '30.0000', longitude: '31.0000' },
    states: {
      loading: { title: 'Loading master data', body: 'Fetching the latest server-backed records.' },
      empty: { title: 'No items yet', body: 'This section has no available records. Add an approved item when content is ready.' },
      error: { title: 'Master data unavailable', body: 'The server could not return this section. Try again.' },
      retry: { title: 'Connection temporarily unavailable', body: 'Retry without changing the current data.' },
      permission: { title: 'Access unavailable', body: 'The current session is not allowed to manage this data.' },
      success: { title: 'Master data ready', body: 'Records are rendered from the server-approved projection.' }
    },
    mutation: { created: 'Item added.', updated: 'Item updated.', deleted: 'Item deleted.', validation: 'Check required fields and the change reason.', failed: 'The change could not be saved. Try again.' },
    unavailable: 'Unavailable', noParent: 'No parent', noGroup: 'No group', noActions: 'No actions available', active: 'Active', inactive: 'Inactive', directionNote: 'English LTR — this admin surface is approved for desktop.'
  },
  'zh-CN': {
    eyebrow: '基础数据管理',
    titles: { categories: '房产分类与类型', locations: '位置与社区', features: '特色与服务' },
    descriptions: { categories: '管理房产和项目使用的分类与类型。', locations: '管理位置和社区的地理层级。', features: '管理房产和项目可用的特色与服务。' },
    tabs: { categories: '分类', locations: '位置', features: '特色与服务' },
    navigationLabel: '基础数据分区',
    add: '添加项目', edit: '编辑', delete: '删除', save: '保存', cancel: '取消', close: '关闭', retry: '重试',
    confirmDelete: '确认删除项目', count: value => `${value.toLocaleString('zh-CN')} 个项目`,
    columns: { name: '名称', kind: '类型', parent: '父级或分组', order: '排序', active: '状态', updated: '更新时间', actions: '操作' },
    kinds: { category: '分类', type: '房产类型', location: '位置', neighborhood: '社区', feature: '特色', service: '服务' },
    labels: { nameAr: '阿拉伯语名称', nameEn: '英语名称', nameZh: '中文名称', slug: 'Slug', kind: '类型', parent: '父级位置', category: '父级分类', group: '特色分组', order: '排序', active: '启用', reason: '变更原因', latitude: '纬度', longitude: '经度' },
    placeholders: { nameAr: '例如：城市', nameEn: 'Example: City', nameZh: '例如：城市', slug: 'lowercase-slug', parent: '选择父级位置', category: '选择父级分类', group: 'building_amenities', reason: '说明保存或修改原因', latitude: '30.0000', longitude: '31.0000' },
    states: {
      loading: { title: '正在加载基础数据', body: '正在获取服务器中的最新记录。' },
      empty: { title: '暂无项目', body: '此分区暂无可用记录。内容准备好后可添加经过批准的项目。' },
      error: { title: '基础数据不可用', body: '服务器无法返回此分区，请重试。' },
      retry: { title: '连接暂时不可用', body: '可以重试，当前数据不会被修改。' },
      permission: { title: '无法访问', body: '当前会话无权管理这些数据。' },
      success: { title: '基础数据已就绪', body: '记录来自服务器批准的安全投影。' }
    },
    mutation: { created: '项目已添加。', updated: '项目已更新。', deleted: '项目已删除。', validation: '请检查必填字段和变更原因。', failed: '无法保存变更，请重试。' },
    unavailable: '不可用', noParent: '无父级', noGroup: '无分组', noActions: '无可用操作', active: '启用', inactive: '未启用', directionNote: '简体中文 LTR — 此管理界面仅批准桌面端。'
  }
};

export function getAdminMasterDataCopy(locale: SupportedLocale): AdminMasterDataCopy {
  return copies[locale];
}
