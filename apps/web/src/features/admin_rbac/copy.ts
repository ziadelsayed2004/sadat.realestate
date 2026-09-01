import type { SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminRbacState } from './views.tsx';

export interface AdminRbacCopy {
  readonly eyebrow: string;
  readonly users: string;
  readonly roles: string;
  readonly usersDescription: string;
  readonly rolesDescription: string;
  readonly addUser: string;
  readonly createRole: string;
  readonly edit: string;
  readonly save: string;
  readonly saving: string;
  readonly retry: string;
  readonly back: string;
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly email: string;
  readonly displayName: string;
  readonly accessLevel: string;
  readonly status: string;
  readonly version: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly roleName: string;
  readonly description: string;
  readonly accessMode: string;
  readonly permissions: string;
  readonly active: string;
  readonly permissionCatalog: string;
  readonly noActions: string;
  readonly noUsers: string;
  readonly noRoles: string;
  readonly filterStatus: string;
  readonly filterAccess: string;
  readonly all: string;
  readonly activeStatus: string;
  readonly disabledStatus: string;
  readonly superAdmin: string;
  readonly standardAdmin: string;
  readonly custom: string;
  readonly viewOnly: string;
  readonly enable: string;
  readonly disable: string;
  readonly validation: string;
  readonly saved: string;
  readonly states: Readonly<Record<AdminRbacState, { readonly title: string; readonly body: string }>>;
  readonly directionNote: string;
}

const english: AdminRbacCopy = {
  eyebrow: 'Administration access', users: 'Administrator users', roles: 'Roles and permissions',
  usersDescription: 'Manage administrator accounts from the protected API projection.', rolesDescription: 'Build approved roles from the server permission catalog.',
  addUser: 'Add administrator', createRole: 'Create role', edit: 'Edit', save: 'Save changes', saving: 'Saving', retry: 'Retry', back: 'Back',
  reason: 'Change reason', reasonPlaceholder: 'Enter a clear reason (at least 3 characters)', reasonRequired: 'A change reason is required.',
  email: 'Email', displayName: 'Display name', accessLevel: 'Access level', status: 'Status', version: 'Version', createdAt: 'Created', updatedAt: 'Updated',
  roleName: 'Role name', description: 'Description', accessMode: 'Access mode', permissions: 'Permissions', active: 'Active', permissionCatalog: 'Permission catalog',
  noActions: 'No actions are available for this account.', noUsers: 'No administrator users were returned.', noRoles: 'No roles were returned.',
  filterStatus: 'Filter by status', filterAccess: 'Filter by access level', all: 'All', activeStatus: 'Active', disabledStatus: 'Disabled',
  superAdmin: 'Super Admin', standardAdmin: 'Standard Admin', custom: 'Custom', viewOnly: 'View Only', enable: 'Enable', disable: 'Disable',
  validation: 'Check the fields and try again.', saved: 'Saved from the protected API projection.',
  states: {
    loading: { title: 'Loading administration access', body: 'Fetching the safe administrator projection.' },
    empty: { title: 'Nothing is available yet', body: 'The protected API returned no records.' },
    error: { title: 'The data could not load', body: 'Check the connection and try again.' },
    retry: { title: 'Connection temporarily unavailable', body: 'Retry without losing the current screen.' },
    permission: { title: 'Access is not permitted', body: 'The API did not grant the required administrator permission.' },
    not_found: { title: 'Record not found', body: 'The requested administrator or role is not available.' },
    conflict: { title: 'Version conflict', body: 'This record changed after it was loaded. Retry after reviewing the latest projection.' },
    success: { title: 'Administration access ready', body: 'Values are rendered from the protected API projection.' }
  },
  directionNote: 'English uses LTR; Arabic uses RTL. Approved scope is Admin Desktop.'
};

const arabic: AdminRbacCopy = {
  ...english,
  eyebrow: 'صلاحيات الإدارة', users: 'مستخدمو الإدارة', roles: 'الأدوار والصلاحيات', usersDescription: 'إدارة حسابات المسؤولين من الإسقاط المحمي للواجهة البرمجية.', rolesDescription: 'إنشاء الأدوار من كتالوج الصلاحيات المعتمد من الخادم.', addUser: 'إضافة مسؤول', createRole: 'إنشاء دور', edit: 'تعديل', save: 'حفظ التغييرات', saving: 'جارٍ الحفظ', retry: 'إعادة المحاولة', back: 'رجوع', reason: 'سبب التغيير', reasonPlaceholder: 'اكتب سبباً واضحاً لا يقل عن ثلاثة أحرف', reasonRequired: 'سبب التغيير مطلوب.', email: 'البريد الإلكتروني', displayName: 'الاسم الظاهر', accessLevel: 'مستوى الوصول', status: 'الحالة', version: 'الإصدار', createdAt: 'تاريخ الإنشاء', updatedAt: 'آخر تحديث', roleName: 'اسم الدور', description: 'الوصف', accessMode: 'نمط الوصول', permissions: 'الصلاحيات', active: 'نشط', permissionCatalog: 'كتالوج الصلاحيات', noActions: 'لا توجد إجراءات متاحة لهذا الحساب.', noUsers: 'لم يعرض الخادم مستخدمي إدارة.', noRoles: 'لم يعرض الخادم أدواراً.', filterStatus: 'التصفية حسب الحالة', filterAccess: 'التصفية حسب مستوى الوصول', all: 'الكل', activeStatus: 'نشط', disabledStatus: 'معطل', superAdmin: 'مسؤول أعلى', standardAdmin: 'مسؤول قياسي', custom: 'مخصص', viewOnly: 'عرض فقط', enable: 'تفعيل', disable: 'تعطيل', validation: 'تحقق من الحقول ثم أعد المحاولة.', saved: 'تم الحفظ من الإسقاط المحمي للواجهة البرمجية.', directionNote: 'العربية RTL — النطاق المعتمد هو سطح مكتب الإدارة.'
};

const copyByLocale: Readonly<Record<SupportedLocale, AdminRbacCopy>> = { ar: arabic, en: english,};

export function getAdminRbacCopy(locale: SupportedLocale): AdminRbacCopy {
  return copyByLocale[locale];
}
