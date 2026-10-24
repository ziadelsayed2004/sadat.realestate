export function settingsFieldHelp(locale: 'ar' | 'en', key: string): string | undefined {
  const help: Record<string, [string, string]> = {
    requires_admin_review: ['مفعّل: العقار يمر على الإدارة قبل النشر. إيقافه يلغي اشتراط المراجعة، ولا يغيّر العقارات المنشورة سابقًا.', 'Enabled: properties require administrative review before publication. Existing published properties are unchanged.'],
    publication_after_approval: ['تلقائي: يُنشر العقار بعد اعتماده. يدوي: الاعتماد وحده لا ينشره وتحتاج إجراء النشر.', 'Automatic publishes after approval; manual requires a separate publish action.'],
    automatic_expiry: ['مدة صلاحية النشر. عند انتهائها يختفي العقار من العرض العام دون حذف بياناته. «بلا انتهاء» يبقيه حتى أرشفته.', 'Publication lifetime. Expired properties disappear publicly without deleting their records. Never keeps them until archived.'],
    max_images: ['من 1 إلى 50 صورة لكل عقار. الافتراضي 50؛ لا يحذف الصور المرفوعة سابقًا.', '1–50 images per property; default 50. Existing images are not deleted.'],
    accepted_image_formats: ['اكتب image/jpeg وimage/png، كل صيغة في سطر. صيغ العقارات المدعومة حاليًا JPG وPNG.', 'One MIME type per line: image/jpeg and image/png. Property uploads currently support JPG and PNG.'],
    max_image_size_mb: ['الحد لكل صورة من 1 إلى 10 ميجابايت، والافتراضي 10.', 'Per-image limit, 1–10 MB; default 10.'],
    blocked_word_review: ['يفعّل فحص الكلمات أدناه في منشورات المجتمع؛ اختر بعدها مراجعة المنشور أو رفضه.', 'Checks community posts for the words below, then holds or rejects matching posts.'],
    blocked_words: ['كلمة أو عبارة في كل سطر؛ اتركها فارغة إذا لم ترد قائمة حظر.', 'One word or phrase per line. Leave empty for no word list.'],
    blocked_word_action: ['مراجعة: ينتظر قرار الإدارة. رفض: يُرفض المنشور المطابق لقائمة الكلمات.', 'Review holds matching posts for administration; reject refuses them.'],
    daily_post_limit: ['عدد منشورات المجتمع لكل حساب يوميًا، من 1 إلى 100. فارغ = بلا حد يومي إضافي.', 'Community posts per account per day, 1–100. Empty means no additional daily limit.'],
    moderation_wait_hours: ['مهلة المتابعة للمراجعة من 1 إلى 168 ساعة؛ لا تعني الموافقة التلقائية. فارغ = بلا مهلة محددة.', 'Review follow-up period, 1–168 hours. It does not auto-approve posts. Empty means no specified period.'],
    show_population_counter: ['يظهر عداد السكان عند توفر قيمة منشورة. الأرقام نفسها تُعدّل من رابط إحصاءات المدينة أعلاه.', 'Shows population when a published value exists. Edit the values using the city statistics link above.']
  };
  return help[key]?.[locale === 'ar' ? 0 : 1];
}
