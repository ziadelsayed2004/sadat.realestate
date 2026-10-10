import type { SupportedLocale } from '@sadat-real-estate/contracts';

export type AdminSidebarIcon = 'overview' | 'users' | 'providers' | 'properties' | 'requests' | 'content' | 'advertising' | 'commissions' | 'notifications' | 'audit' | 'settings';
type AdminSidebarItem = {
  readonly id: string;
  readonly path: string;
  readonly matchers: readonly string[];
  readonly icon: AdminSidebarIcon;
  readonly label: Readonly<Record<SupportedLocale, string>>;
};
type AdminSidebarGroup = {
  readonly id: string;
  readonly label: Readonly<Record<SupportedLocale, string>>;
  readonly items: readonly AdminSidebarItem[];
};

const sidebarItem = (id: string, path: string, icon: AdminSidebarIcon, ar: string, en: string, matchers: readonly string[] = [path]): AdminSidebarItem => ({
  id,
  path,
  matchers,
  icon,
  label: { ar, en }
});

export const sidebarGroups: readonly AdminSidebarGroup[] = [
  { id: 'home', label: { ar: 'الرئيسية', en: 'Home' }, items: [sidebarItem('overview', '/admin', 'overview', 'نظرة عامة', 'Overview', ['/admin', '/admin/overview']), sidebarItem('user-guide', '/admin/user-guide', 'content', 'دليل الاستخدام', 'User guide')] },
  {
    id: 'accounts',
    label: { ar: 'المستخدمون والحسابات', en: 'Users and accounts' },
    items: [
      sidebarItem('users', '/admin/users', 'users', 'جميع المستخدمين', 'All users'),
      sidebarItem('seekers', '/admin/property-seekers', 'users', 'الباحثون عن عقار', 'Property seekers'),
      sidebarItem('providers', '/admin/providers', 'providers', 'مقدمو العقارات', 'Property providers'),
      sidebarItem('verification', '/admin/verification', 'requests', 'قائمة التوثيق', 'Verification queue'),
      sidebarItem('account-reports', '/admin/account-reports', 'requests', 'بلاغات الحسابات', 'Account reports'),
      sidebarItem('account-restrictions', '/admin/account-restrictions', 'settings', 'قيود الحسابات', 'Account restrictions')
    ]
  },
  {
    id: 'properties',
    label: { ar: 'إدارة العقارات', en: 'Property management' },
    items: [
      sidebarItem('properties', '/admin/properties', 'properties', 'العقارات', 'Properties'),
      sidebarItem('property-review', '/admin/properties/review', 'properties', 'مراجعة العقارات', 'Property review'),
      sidebarItem('property-duplicates', '/admin/properties/possible-duplicates', 'properties', 'عقارات مكررة محتملة', 'Possible duplicates'),
      sidebarItem('property-reports', '/admin/property-reports', 'requests', 'بلاغات العقارات', 'Property reports'),
      sidebarItem('projects', '/admin/projects', 'content', 'المشروعات', 'Projects', ['/admin/projects']),
      sidebarItem('project-review', '/admin/projects/review', 'content', 'مراجعة المشروعات', 'Project review'),
      sidebarItem('categories', '/admin/property-categories', 'settings', 'التصنيفات وأنواع العقارات', 'Property categories'),
      sidebarItem('locations', '/admin/locations', 'settings', 'المناطق والأحياء', 'Locations and districts'),
      sidebarItem('features', '/admin/features', 'settings', 'المميزات والخدمات', 'Features and services')
    ]
  },
  {
    id: 'requests',
    label: { ar: 'الطلبات والعمليات', en: 'Requests and operations' },
    items: [
      sidebarItem('requests', '/admin/requests', 'requests', 'كل الطلبات', 'All requests'),
      sidebarItem('customer-requests', '/admin/customer-requests', 'requests', 'طلبات العملاء', 'Customer requests'),
      sidebarItem('overdue-requests', '/admin/overdue-requests', 'requests', 'الطلبات المتأخرة', 'Overdue requests'),
      sidebarItem('contact-requests', '/admin/contact-requests', 'requests', 'طلبات التواصل', 'Contact requests'),
      sidebarItem('viewing-requests', '/admin/viewing-requests', 'requests', 'طلبات المعاينة', 'Viewing requests'),
      sidebarItem('search-requests', '/admin/search-requests', 'requests', 'طلبات البحث عن عقار', 'Property search requests'),
      sidebarItem('request-issues', '/admin/request-issues', 'requests', 'بلاغات ومشكلات الطلبات', 'Request issues')
    ]
  },
  {
    id: 'content',
    label: { ar: 'المحتوى والكوميونيتي', en: 'Content and community' },
    items: [
      sidebarItem('articles', '/admin/articles', 'content', 'المقالات', 'Articles'),
      sidebarItem('article-categories', '/admin/article-categories', 'content', 'تصنيفات المقالات', 'Article categories'),
      sidebarItem('community', '/admin/community', 'content', 'الكوميونيتي', 'Community', ['/admin/community']),
      sidebarItem('community-comments', '/admin/community/comments', 'content', 'أرشيف التعليقات', 'Archived comments'),
      sidebarItem('community-reports', '/admin/community/moderation', 'requests', 'بلاغات المجتمع', 'Community reports'),
      sidebarItem('about', '/admin/content/about', 'content', 'النبذة عن المنصة', 'About the platform'),
      sidebarItem('team', '/admin/content/team', 'content', 'فريق العمل', 'Team'),
      sidebarItem('population', '/admin/content/population-counter', 'content', 'عدّاد سكان مدينة السادات', 'Sadat population counter')
    ]
  },
  {
    id: 'revenue',
    label: { ar: 'الإعلانات والمدفوعات', en: 'Advertising and payments' },
    items: [
      sidebarItem('advertising', '/admin/ads/requests', 'advertising', 'طلبات الإعلانات', 'Ad requests', ['/admin/ads/requests', '/admin/advertising']),
      sidebarItem('featured-ads', '/admin/ads/featured', 'advertising', 'إعلانات الرئيسية المميزة', 'Featured homepage ads'),
      sidebarItem('banners', '/admin/banners', 'advertising', 'بانرات أعلى الصفحة', 'Homepage hero banners'),
      sidebarItem('approved-proofs', '/admin/ads/payment-proofs/approved', 'advertising', 'إثباتات الدفع المعتمدة', 'Approved payment proofs'),
      sidebarItem('payment-review', '/admin/ads/payments/pending-review', 'advertising', 'مراجعة المدفوعات', 'Payment review'),
      sidebarItem('ad-calendar', '/admin/ads/calendar', 'advertising', 'تقويم الإعلانات', 'Ad calendar'),
      sidebarItem('payment-proofs', '/admin/ads/payment-proofs/pending', 'requests', 'إثباتات الدفع', 'Payment proofs'),
      sidebarItem('financial-review', '/admin/ads/financial-review', 'commissions', 'الملخص المالي', 'Financial summary'),
      sidebarItem('commission-policies', '/admin/commissions', 'commissions', 'سياسات العمولات', 'Commission policies'),
      sidebarItem('commission-assignments', '/admin/commissions/account', 'commissions', 'تعيين العمولات', 'Commission assignments'),
      sidebarItem('commission-exceptions', '/admin/commissions/exceptions', 'commissions', 'استثناءات العمولات', 'Commission exceptions'),
      sidebarItem('commission-confirmations', '/admin/commissions/confirmations', 'commissions', 'تأكيد السياسات', 'Policy confirmations')
    ]
  },
  {
    id: 'experience',
    label: { ar: 'تجربة المنصة', en: 'Platform experience' },
    items: [
      sidebarItem('tips', '/admin/content/tips', 'content', 'نصائح عقارات السادات', 'Property tips'),
      sidebarItem('homepage', '/admin/content/homepage', 'overview', 'إدارة الصفحة الرئيسية', 'Homepage management'),
      sidebarItem('contact-social', '/admin/settings/contact', 'notifications', 'بيانات التواصل والسوشيال', 'Contact and social'),
      sidebarItem('seo', '/admin/settings/seo', 'settings', 'إعدادات SEO', 'SEO settings')
    ]
  },
  {
    id: 'system',
    label: { ar: 'النظام', en: 'System' },
    items: [
      sidebarItem('admin-users', '/admin/admin-users', 'users', 'المستخدمون الإداريون', 'Admin users'),
      sidebarItem('roles', '/admin/roles', 'settings', 'الأدوار والصلاحيات', 'Roles and permissions'),
      sidebarItem('notifications', '/admin/notifications', 'notifications', 'إشعارات الإدارة', 'Admin notifications'),
      sidebarItem('audit', '/admin/audit-logs', 'requests', 'سجل الإجراءات', 'Action log'),
      sidebarItem('settings', '/admin/settings', 'settings', 'الإعدادات العامة', 'General settings', ['/admin/settings'])
    ]
  }
] as const;
