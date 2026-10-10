import type { AuditJsonValue, AuditLogData, SupportedLocale } from '@sadat-real-estate/contracts';
import { permissionLabel } from '../admin_rbac/permission-label.ts';

const fields: Record<string, readonly [string, string]> = {
  name: ['الاسم', 'Name'], displayName: ['اسم الحساب', 'Account name'], description: ['الوصف', 'Description'],
  active: ['نشط', 'Active'], status: ['الحالة', 'Status'], accessMode: ['مستوى الصلاحيات', 'Access mode'],
  accessLevel: ['نوع حساب الإدارة', 'Administrator type'], permissions: ['الصلاحيات', 'Permissions'],
  version: ['الإصدار', 'Version'], schemaVersion: ['إصدار البيانات', 'Schema version'],
  platformName: ['اسم المنصة', 'Platform name'], title: ['العنوان', 'Title'], price: ['السعر', 'Price'],
  displayOrder: ['الترتيب', 'Display order'], deleted: ['الحذف', 'Deleted'], publishedAt: ['وقت النشر', 'Published at'],
  ar: ['العربية', 'Arabic'], en: ['الإنجليزية', 'English'], 'zh-CN': ['الصينية', 'Chinese'],
  roleIds: ['المناصب المرتبطة', 'Assigned roles'], visibility: ['الظهور', 'Visibility'], categoryId: ['معرّف التصنيف', 'Category ID']
};
const values: Record<string, readonly [string, string]> = {
  custom: ['صلاحيات مخصصة', 'Custom permissions'], view_only: ['عرض فقط', 'View only'],
  super_admin: ['المسؤول الأعلى', 'Super Admin'], standard_admin: ['مسؤول قياسي', 'Standard Admin'],
  verified: ['موثق', 'Verified'], suspended: ['معطل', 'Suspended'], active: ['نشط', 'Active'],
  draft: ['مسودة', 'Draft'], pending_review: ['قيد المراجعة', 'Pending review'], published: ['منشور', 'Published'],
  archived: ['مؤرشف', 'Archived'], rejected: ['مرفوض', 'Rejected'], hidden: ['مخفي', 'Hidden'],
  '[REDACTED]': ['بيانات محجوبة', 'Hidden data']
};
export interface AuditChange { readonly path: string; readonly before: AuditJsonValue | undefined; readonly after: AuditJsonValue | undefined }
const object = (value: AuditJsonValue | undefined): value is Record<string, AuditJsonValue> => value !== null && typeof value === 'object' && !Array.isArray(value);
const permissions = (value: AuditJsonValue | undefined): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const same = (before: AuditJsonValue | undefined, after: AuditJsonValue | undefined, key: string) => key === 'permissions' && permissions(before) && permissions(after)
  ? JSON.stringify([...new Set(before)].sort()) === JSON.stringify([...new Set(after)].sort()) : JSON.stringify(before) === JSON.stringify(after);

export function auditChanges(before: AuditLogData['before'], after: AuditLogData['after']): AuditChange[] {
  const changes: AuditChange[] = [];
  function walk(left: AuditJsonValue | undefined, right: AuditJsonValue | undefined, path: string, depth: number) {
    if (changes.length >= 200 || same(left, right, path.split('.').at(-1) ?? '')) return;
    if (depth < 6 && (object(left) || left === undefined) && (object(right) || right === undefined)) {
      const a = object(left) ? left : {}; const b = object(right) ? right : {};
      for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) walk(a[key], b[key], path ? `${path}.${key}` : key, depth + 1);
    } else changes.push({ path, before: left, after: right });
  }
  walk(before, after, '', 0);
  return changes;
}

function valueText(value: AuditJsonValue | undefined, locale: SupportedLocale): string {
  const ar = locale === 'ar';
  if (value === undefined || value === null) return ar ? 'غير موجود' : 'Not set';
  if (typeof value === 'boolean') return value ? ar ? 'نعم' : 'Yes' : ar ? 'لا' : 'No';
  if (typeof value === 'number') return new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(value);
  if (typeof value === 'string') return values[value]?.[ar ? 0 : 1] ?? (value || (ar ? 'فارغ' : 'Empty'));
  if (Array.isArray(value)) return value.map(item => valueText(item, locale)).join('، ') || (ar ? 'لا يوجد' : 'None');
  return Object.entries(value).map(([key, item]) => `${fields[key]?.[ar ? 0 : 1] ?? key}: ${valueText(item, locale)}`).join(' · ');
}

export function AuditChanges({ log, locale }: { readonly log: AuditLogData; readonly locale: SupportedLocale }) {
  const ar = locale === 'ar'; const index = ar ? 0 : 1;
  const changes = auditChanges(log.before, log.after);
  return <section className="admin-audit-changes" aria-labelledby="audit-changes-title"><h3 id="audit-changes-title">{ar ? 'إيه اللي اتعدل؟' : 'What changed?'}</h3>
    <p>{ar ? 'الحقول التالية تغيّرت في البيانات المحفوظة. التفاصيل المحجوبة أو غير المسجلة لا يمكن مقارنتها.' : 'These fields changed in the saved data. Hidden or unrecorded details cannot be compared.'}</p>
    {changes.length === 200 ? <p>{ar ? 'المقارنة تعرض حتى 200 حقل. راجع التفاصيل التقنية لبقية البيانات المسجلة.' : 'The comparison displays up to 200 fields. Check technical details for the remaining recorded data.'}</p> : null}
    {changes.length === 0 ? <p>{ar ? 'لا توجد فروق ظاهرة في البيانات المسجلة لهذا الإجراء.' : 'No visible differences in the recorded data for this action.'}</p> : changes.map(change => {
      const label = change.path.split('.').map(key => fields[key]?.[index] ?? key).join(' / ');
      const isPermissions = change.path.split('.').at(-1) === 'permissions' && (change.before === undefined || permissions(change.before)) && (change.after === undefined || permissions(change.after));
      const before = isPermissions && permissions(change.before) ? change.before.filter(item => !permissions(change.after) || !change.after.includes(item)) : [];
      const after = isPermissions && permissions(change.after) ? change.after.filter(item => !permissions(change.before) || !change.before.includes(item)) : [];
      return <article className="admin-audit-changes__field" key={change.path}><h4>{label}</h4><div className="admin-audit-changes__values">{(['before', 'after'] as const).map(side => <section key={side}><h5>{isPermissions ? side === 'before' ? ar ? 'صلاحيات اتشالت' : 'Permissions removed' : ar ? 'صلاحيات اتضافت' : 'Permissions added' : side === 'before' ? ar ? 'قبل' : 'Before' : ar ? 'بعد' : 'After'}</h5>{isPermissions ? (side === 'before' ? before : after).length ? <ul>{(side === 'before' ? before : after).map(permission => <li key={permission}>{permissionLabel(permission, locale)}</li>)}</ul> : <p>{ar ? 'لا يوجد' : 'None'}</p> : <p>{valueText(change[side], locale)}</p>}</section>)}</div></article>;
    })}
  </section>;
}
