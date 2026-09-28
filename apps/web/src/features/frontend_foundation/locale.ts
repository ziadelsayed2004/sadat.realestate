import { localizeCopy } from '../localization/copy-catalog.ts';
import {
  DEFAULT_CONTENT_LOCALE,
  LOCALE_DIRECTIONS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TextDirection
} from '@sadat-real-estate/contracts';
import type { Surface } from '../../routes/route-table.js';
import type { FoundationState } from './state-model.js';

const supportedLocaleSet = new Set<string>(SUPPORTED_LOCALES);

export interface FoundationCopy {
  readonly brand: string;
  readonly shellTitle: string;
  readonly shellDescription: string;
  readonly unavailable: string;
  readonly retryLabel: string;
  readonly localeLabel: string;
  readonly routeLabel: string;
  readonly loginLabel: string;
  readonly homeLabel: string;
  readonly forbiddenTitle: string;
  readonly forbiddenBody: string;
  readonly adminHeader: {
    readonly search: string;
    readonly searchLabel: string;
    readonly role: string;
    readonly menu: string;
    readonly closeMenu: string;
  };
  readonly surfaceLabels: Readonly<Record<Surface, string>>;
  readonly states: Readonly<Record<FoundationState, { readonly title: string; readonly body: string }>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, FoundationCopy>> = {
  ar: {
    brand: 'عقارات السادات',
    shellTitle: 'عقارات السادات',
    shellDescription: 'اكتشف العقارات والمشروعات والمقالات في مدينة السادات.',
    unavailable: 'لا توجد بيانات واجهة متاحة لهذا المسار بعد.',
    retryLabel: 'إعادة المحاولة',
    localeLabel: 'اللغة',
    routeLabel: 'المسار',
    loginLabel: 'تسجيل الدخول',
    homeLabel: 'العودة إلى الموقع',
    forbiddenTitle: 'هذا القسم غير متاح لحسابك',
    forbiddenBody: 'يمكنك العودة إلى الموقع أو استخدام حساب لديه صلاحية الوصول إلى هذا القسم.',
    adminHeader: { search: 'ابحث عن مستخدم، عقار، مشروع، مقال أو طلب', searchLabel: 'بحث الإدارة', role: 'مدير النظام', menu: 'فتح قائمة الإدارة', closeMenu: 'إغلاق قائمة الإدارة' },
    surfaceLabels: { public: 'عام', auth: 'تسجيل الدخول', seeker: 'الباحث عن عقار', provider: 'مزود العقار', admin: 'الإدارة' },
    states: {
      loading: { title: 'جارٍ التحميل', body: 'يتم تجهيز الواجهة.' },
      empty: { title: 'لا توجد بيانات بعد', body: 'ستظهر البيانات هنا عند إضافتها.' },
      error: { title: 'تعذر العثور على الصفحة', body: 'تحقق من الرابط وحاول مرة أخرى.' },
      retry: { title: 'تعذر تحميل الواجهة', body: 'يمكنك المحاولة مرة أخرى عندما يتوفر الاتصال.' },
      success: { title: 'تم التحميل', body: 'تم تحميل الواجهة بنجاح.' },
      permission: { title: 'يتطلب هذا القسم تسجيل الدخول', body: 'سجّل الدخول للمتابعة إلى حسابك.' }
    }
  },
  en: {
    brand: 'Sadat Real Estate',
    shellTitle: 'Sadat Real Estate',
    shellDescription: 'Discover properties, projects and articles in Sadat City.',
    unavailable: 'No screen data is available for this route yet.',
    retryLabel: 'Retry',
    localeLabel: 'Locale',
    routeLabel: 'Route',
    loginLabel: 'Sign in',
    homeLabel: 'Back to website',
    forbiddenTitle: 'This section is unavailable for your account',
    forbiddenBody: 'Return to the website or use an account with permission to access this section.',
    adminHeader: { search: 'Search for a user, property, project, article or request', searchLabel: 'Admin search', role: 'System administrator', menu: 'Open admin menu', closeMenu: 'Close admin menu' },
    surfaceLabels: { public: 'Public', auth: 'Authentication', seeker: 'Seeker', provider: 'Provider', admin: 'Administration' },
    states: {
      loading: { title: 'Loading', body: 'Preparing the interface.' },
      empty: { title: 'No data yet', body: 'Data will appear here when it is added.' },
      error: { title: 'Page not found', body: 'Check the address and try again.' },
      retry: { title: 'The interface could not load', body: 'You can try again when the connection is available.' },
      success: { title: 'Loaded', body: 'The interface loaded successfully.' },
      permission: { title: 'Authentication required', body: 'Sign in to continue to your account.' }
    }
  },};

function normalizeLocale(value: unknown): SupportedLocale | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (supportedLocaleSet.has(trimmed)) return trimmed as SupportedLocale;
  const normalized = trimmed.toLowerCase();
  if (normalized.startsWith('ar')) return 'ar';
  if (normalized.startsWith('en')) return 'en';
  return undefined;
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return normalizeLocale(value) !== undefined;
}

export function resolveLocale(explicitLocale?: string | null, acceptLanguage?: string | null): SupportedLocale {
  const explicit = normalizeLocale(explicitLocale);
  if (explicit !== undefined) return explicit;
  for (const candidate of (acceptLanguage ?? '').split(',')) {
    const locale = normalizeLocale(candidate.split(';', 1)[0]);
    if (locale !== undefined) return locale;
  }
  return DEFAULT_CONTENT_LOCALE;
}

export function directionForLocale(locale: SupportedLocale): TextDirection {
  return LOCALE_DIRECTIONS[locale];
}

export function getFoundationCopy(locale: SupportedLocale): FoundationCopy {
  return localizeCopy('frontend_foundation/locale#getFoundationCopy', locale, copyByLocale[locale]);
}
