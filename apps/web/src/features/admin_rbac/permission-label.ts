import type { SupportedLocale } from '@sadat-real-estate/contracts';

const resources: Record<string, [string, string]> = {
  'account-reports': ['بلاغات الحسابات', 'Account reports'], ads: ['الإعلانات', 'Advertising'], audit: ['سجل التدقيق', 'Audit log'], banners: ['البانرات', 'Banners'], commissions: ['العمولات', 'Commissions'], community: ['المجتمع', 'Community'], content: ['محتوى الموقع', 'Website content'], documents: ['المستندات', 'Documents'], features: ['المميزات والخدمات', 'Amenities'], locations: ['المواقع', 'Locations'], overview: ['لوحة التحكم', 'Dashboard'], payments: ['المدفوعات', 'Payments'], projects: ['المشاريع', 'Projects'], properties: ['العقارات', 'Properties'], 'property-reports': ['بلاغات العقارات', 'Property reports'], providers: ['عارضو العقارات', 'Providers'], 'request-issues': ['مشكلات الطلبات', 'Request issues'], requests: ['طلبات العملاء', 'Customer requests'], roles: ['المناصب والصلاحيات', 'Roles'], settings: ['الإعدادات', 'Settings'], staff: ['موظفو الإدارة', 'Administrator staff'], taxonomy: ['أنواع العقارات', 'Property types'], users: ['الحسابات', 'Accounts'], viewings: ['المعاينات', 'Viewings']
};
const actions: Record<string, [string, string]> = { view: ['عرض', 'View'], manage: ['إدارة وتعديل', 'Manage'], review: ['مراجعة واعتماد', 'Review'], publish: ['نشر', 'Publish'], price: ['تسعير', 'Price'], schedule: ['جدولة', 'Schedule'], moderate: ['مراجعة المحتوى', 'Moderate'], assign: ['تعيين مسؤول', 'Assign'], notes: ['إضافة ملاحظات', 'Add notes'] };

export function permissionLabel(permission: string, locale: SupportedLocale): string {
  if (permission === 'admin:providers.visibility.manage') return locale === 'ar' ? 'إدارة اشتراك ظهور المكاتب' : 'Manage office identity subscriptions';
  const [resource, action] = permission.replace(/^admin:/, '').split('.');
  const index = locale === 'ar' ? 0 : 1;
  return `${resources[resource ?? '']?.[index] ?? resource} — ${actions[action ?? '']?.[index] ?? action}`;
}
