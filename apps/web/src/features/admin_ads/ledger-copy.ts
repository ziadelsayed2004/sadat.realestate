import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { localizeCopy } from '../localization/copy-catalog.ts';

export function getAdLedgerCopy(locale: SupportedLocale) {
  return localizeCopy('admin_ads/ledger-copy#getAdLedgerCopy', locale, locale === 'ar' ? {
    title: 'سجل إجراءات الإعلان والدفع',
    help: 'كل صف يسجل خطوة حدثت في الطلب، وليس دفعة جديدة. ظهور نفس الطلب أكثر من مرة طبيعي: إصدار عرض السعر، قبول العميل، إرسال الإيصال، ثم قرار الإدارة. لا تجمع مبالغ هذه الصفوف كإجمالي التحصيل.',
    sources: { quote: 'عرض السعر', payment_proof: 'إيصال الدفع', schedule: 'موعد عرض الإعلان' },
    treatment: 'سجل متابعة، ليس قيدًا محاسبيًا',
    noAmount: 'لا يوجد مبلغ مسجل لهذه الخطوة',
    record: 'رقم السجل', request: 'فتح طلب الإعلان', action: 'الإجراء الذي تم', meaning: 'معنى السجل',
    guide: 'شرح المراجعة المالية في دليل الاستخدام',
    kinds: { quote_issued: 'إرسال عرض السعر للعميل', quote_accepted: 'موافقة العميل على عرض السعر', quote_rejected: 'رفض العميل لعرض السعر', quote_cancelled: 'إلغاء عرض السعر', payment_proof_uploaded: 'إرسال العميل إيصال الدفع', payment_proof_approved: 'اعتماد الإدارة لإيصال الدفع', payment_proof_rejected: 'رفض الإدارة لإيصال الدفع', scheduled: 'تحديد موعد عرض الإعلان', active: 'بدء فترة عرض الإعلان', ended: 'انتهاء فترة عرض الإعلان' }
  } : {
    title: 'Advertisement and payment activity',
    help: 'Each row records a request step, not a new payment. The same request can appear several times: quote issued, customer acceptance, receipt submission and review. Do not add these row amounts as collected revenue.',
    sources: { quote: 'Price quote', payment_proof: 'Payment receipt', schedule: 'Advertisement display window' },
    treatment: 'Activity record, not an accounting entry',
    noAmount: 'No amount recorded for this step',
    record: 'Activity reference', request: 'Open advertising request', action: 'Completed action', meaning: 'Record meaning',
    guide: 'Financial review explained in the user guide',
    kinds: { quote_issued: 'Quote sent to customer', quote_accepted: 'Customer accepted the quote', quote_rejected: 'Customer rejected the quote', quote_cancelled: 'Quote cancelled', payment_proof_uploaded: 'Customer submitted a payment receipt', payment_proof_approved: 'Administrator approved the receipt', payment_proof_rejected: 'Administrator rejected the receipt', scheduled: 'Advertisement display scheduled', active: 'Advertisement display window started', ended: 'Advertisement display window ended' }
  });
}
