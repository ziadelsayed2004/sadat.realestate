import { ApiClientError } from '../contracts/index.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function paymentProofError(error: unknown, locale: SupportedLocale, fallback: string): string {
  if (!(error instanceof ApiClientError)) return fallback;
  const ar = locale === 'ar';
  const code = error.apiError?.code ?? error.code;
  if (code === 'DOUBLE_EXTENSION_REJECTED' || code === 'INVALID_FILENAME') return ar ? 'اسم الملف غير مقبول. استخدم اسمًا بسيطًا بامتداد PDF أو JPG أو PNG ثم أعد الإرسال.' : 'The filename is not accepted. Use a simple name ending in PDF, JPG or PNG and resend.';
  if (['INVALID_FILE_SIGNATURE', 'FILE_TYPE_NOT_ALLOWED', 'ENCRYPTED_PDF_REJECTED', 'EMPTY_FILE'].includes(code)) return ar ? 'الملف غير صالح أو نوعه لا يطابق امتداده. اختر صورة JPG أو PNG سليمة أو PDF غير محمي بكلمة مرور.' : 'The file is invalid or does not match its extension. Choose a valid JPG, PNG or a PDF without password protection.';
  if (error.status === 413 || code === 'FILE_TOO_LARGE') return ar ? 'حجم الملف أكبر من ١٠ ميجابايت. اختر ملفًا أصغر وأعد الإرسال.' : 'The file exceeds 10 MB. Choose a smaller file and resend.';
  if (error.status === 401) return ar ? 'انتهت جلسة الدخول. سجّل الدخول مجددًا ثم أعد إرسال الإثبات.' : 'Your session expired. Sign in again and resend the receipt.';
  if (error.status === 403) return ar ? 'لا تملك صلاحية إرسال إثبات دفع لهذا الطلب.' : 'You do not have permission to submit payment proof for this request.';
  if (error.status === 409) return ar ? 'حالة الطلب تغيرت أو لم يعد ينتظر الدفع. حدّث الصفحة وراجع تفاصيل الطلب قبل الإرسال.' : 'The request changed or is no longer awaiting payment. Refresh and review its details before submitting.';
  if (error.status === 429) return ar ? 'تم إرسال محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.' : 'Too many attempts. Wait briefly and retry.';
  if (error.status === 503) return ar ? 'خدمة استقبال أو فحص إثبات الدفع غير متاحة الآن. الملف ما زال مختارًا؛ أعد المحاولة لاحقًا.' : 'Receipt upload or scanning is unavailable. Your file remains selected; retry later.';
  if (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED') return ar ? 'تعذر الاتصال. الملف ما زال مختارًا؛ تحقق من الإنترنت وأعد الإرسال.' : 'Connection failed. Your file remains selected; check your connection and resend.';
  return fallback;
}
