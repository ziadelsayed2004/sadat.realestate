import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { localizeCopy } from '../localization/copy-catalog.ts';

export function getBannerControlCopy(locale: SupportedLocale) {
  return localizeCopy('admin_home/banner-controls-copy#getBannerControlCopy', locale, locale === 'ar' ? {
    edit: 'تعديل', publish: 'نشر / جدولة', stop: 'إيقاف العرض', archive: 'أرشفة', confirm: 'تأكيد الأرشفة',
    setup: 'عرض بانرات الرئيسية', enable: 'تشغيل العرض وتجهيز الموضع', disable: 'إيقاف جميع بانرات الرئيسية',
    placementsTitle: 'مواضع الإعلان وكود كل موضع', placementName: 'الموضع', placementCode: 'الكود الذي ترسله للمعلن', placementState: 'الحالة', placementActive: 'نشط', placementInactive: 'غير نشط', noPlacements: 'لا توجد مواضع إعلان مجهزة. تشغيل العرض يجهّز موضع الرئيسية.', placementHelp: 'الكود يحدد مكان العرض ولا يُباع كترخيص. أرسل كود موضع نشط للمعلن، وراجع المواضع والأنواع المسموحة في إعدادات الإعلانات.', advertisingSettings: 'إعدادات المواضع والأنواع المسموحة',
    on: 'عرض البانرات مفعّل', off: 'عرض البانرات متوقف', setupError: 'تعذر تحميل إعدادات البانرات. أعد المحاولة.',
    upload: 'إضافة صور من الجهاز', uploadHint: 'حتى 20 صورة، بصيغة PNG أو JPEG أو WebP، وحتى 10 ميجابايت لكل صورة. تُفحص الصور وتُقرأ أبعادها تلقائيًا.',
    draftSaved: 'تم حفظ المسودة. للنشر اضغط «نشر / جدولة».', published: 'تم اعتماد النشر. يظهر البانر خلال موعد عرضه ويختفي عند النهاية.',
    mediaRequired: 'أضف صورة صالحة قبل النشر.', expired: 'موعد نهاية البانر انتهى. عدّل المواعيد قبل النشر.',
    conflict: 'يوجد بانر منشور في نفس الموضع والموعد، أو عدّل مستخدم آخر البيانات. راجع القائمة والمواعيد وأعد المحاولة.',
    reason: 'سبب التغيير', failed: 'تعذر تنفيذ التغيير. راجع الصورة وإعدادات العرض والصلاحيات ثم أعد المحاولة.',
    archiveNote: 'الأرشفة نهائية لهذا البانر وتزيله من العرض. يمكنك إيقافه مؤقتًا بدلًا من أرشفته.',
    previous: 'السابق', next: 'التالي', configureHint: 'شغّل العرض مرة واحدة، ثم احفظ الصورة والبيانات وانشر البانر. المسودات لا تظهر للزوار.'
  } : {
    edit: 'Edit', publish: 'Publish / schedule', stop: 'Stop display', archive: 'Archive', confirm: 'Confirm archive',
    setup: 'Homepage banner display', enable: 'Enable display and set up placement', disable: 'Stop all homepage banners',
    placementsTitle: 'Advertising placements and their codes', placementName: 'Placement', placementCode: 'Code to share with the advertiser', placementState: 'Status', placementActive: 'Active', placementInactive: 'Inactive', noPlacements: 'No placements are configured. Enabling display prepares the homepage placement.', placementHelp: 'A code identifies the display location; it is not a licence for sale. Share an active code and check the allowed placements and types in advertising settings.', advertisingSettings: 'Allowed placements and advertising types',
    on: 'Banner display enabled', off: 'Banner display stopped', setupError: 'Banner settings could not load. Retry.',
    upload: 'Add images from device', uploadHint: 'Up to 20 images: PNG, JPEG or WebP, up to 10 MB each. Images are scanned and dimensions detected automatically.',
    draftSaved: 'Draft saved. Select “Publish / schedule” to publish.', published: 'Publication approved. The banner appears during its display window and disappears at the end.',
    mediaRequired: 'Attach a valid image before publishing.', expired: 'The end date has passed. Edit the dates before publishing.',
    conflict: 'Another banner occupies this placement and time, or another user changed the record. Review the list and dates, then retry.',
    reason: 'Change reason', failed: 'The change could not complete. Check the image, display settings and permissions, then retry.',
    archiveNote: 'Archiving is final for this banner and removes it from display. Stop display instead for a temporary pause.',
    previous: 'Previous', next: 'Next', configureHint: 'Enable display once, save the image and details, then publish. Drafts are never shown to visitors.'
  });
}
