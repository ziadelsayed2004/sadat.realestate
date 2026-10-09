import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';

export function userCreateFeedback(error: unknown, locale: SupportedLocale): { message: string; emailConflict: boolean } {
  const ar = locale === 'ar';
  const code = error instanceof ApiClientError ? error.apiError?.code : undefined;
  if (code === 'ADMINISTRATOR_EMAIL_CONFLICT') return { emailConflict: true, message: ar
    ? 'الإيميل ده مستخدم بالفعل في المنصة. لو حساب إداري، افتحه من قائمة الحسابات وعدّل صلاحياته. لو حساب عميل أو مقدّم عقار، استخدم إيميلًا مختلفًا لحساب الموظف.'
    : 'This email is already used on the platform. If it belongs to an administrator, open that account and edit its permissions. If it belongs to a customer or property provider, use a different email for the employee account.' };
  if (code === 'ADMINISTRATOR_ROLE_INVALID') return { emailConflict: false, message: ar
    ? 'المنصب المختار لم يعد متاحًا. راجع المناصب واختر منصبًا نشطًا قبل إعادة الحفظ.'
    : 'The selected role is no longer available. Review the roles and choose an active role before saving again.' };
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return { emailConflict: false, message: ar
    ? 'ليس لديك صلاحية إضافة حساب إداري، أو انتهت جلسة الدخول. سجّل الدخول بحساب يملك صلاحية إدارة الموظفين.'
    : 'You cannot add an administrator, or your session expired. Sign in with an account that can manage employees.' };
  if (error instanceof ApiClientError && error.status === 409) return { emailConflict: false, message: ar
    ? 'تعذر إنشاء الحساب بسبب تعارض في البيانات. راجع الإيميل والمنصب المختار، ثم حاول مرة أخرى.'
    : 'The account could not be created because its details conflict with an existing record. Check the email and selected role, then try again.' };
  if (error instanceof ApiClientError && error.status === 400) return { emailConflict: false, message: ar
    ? 'راجع الاسم والإيميل والمنصب، وكلمة المرور: 8 أحرف على الأقل بحرف إنجليزي كبير وصغير ورقم ورمز.'
    : 'Check the name, email, role and password: at least 8 characters with uppercase, lowercase, a number and a symbol.' };
  return { emailConflict: false, message: ar ? 'تعذر إنشاء الحساب. بياناتك ما زالت في النموذج؛ حاول مرة أخرى.' : 'Could not create the account. Your details remain in the form; try again.' };
}
