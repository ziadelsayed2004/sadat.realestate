# مراجعة بيانات التجارب قبل بدء الإنتاج

التنظيف المطلوب يحتفظ بحساب الأدمن الرئيسي وكلمة مروره وصلاحية Super Admin، وإعدادات الموقع والمراجع غير التجريبية مثل المناطق وأنواع العقارات. يحذف باقي الحسابات والمحتوى، بما فيه العقارات والمشروعات والمقالات والإعلانات والاشتراكات التي أضيفت يدويًا للتجربة. تُلغى جميع الجلسات القديمة ويلزم الأدمن تسجيل الدخول مرة بعد التنظيف. هذا مختلف عن تحديث الموقع اليومي.

**التحديث المعتاد، دون تنظيف البيانات:**

```bash
cd /root/sadat-release &&
git pull --ff-only origin main &&
sudo bash deploy/native/recover-disk-space.sh &&
sudo bash deploy/native/manage-production.sh update
```

بعد نشر إصدار التنظيف الجديد، يستخدم أمر المعاينة بريد الأدمن الرئيسي الذي حددته: `info@elsadatrealestate.com`. هذا الأمر للقراءة فقط، ولا يحذف شيئًا. الملف يحتوي أسماء وعناوين المحتوى وبريد الحسابات المرشحة للحذف؛ احتفظ به داخل `/root` ولا تنشره للعامة.

```bash
umask 077
sudo -u elsadat env \
  PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env \
  KEEP_ADMIN_EMAIL='info@elsadatrealestate.com' \
  npm --prefix /opt/elsadatrealestate/current run production:launch:plan \
  > /root/sadat-launch-preview.txt
```

راجع `keptAdminId` وقائمة `candidates` وأعداد كل مجموعة. وجود مجموعة غير معروفة يوقف الأمر قبل أي حذف؛ يلزم مراجعتها وتصنيفها. إعدادات الموقع وصور الإعدادات المحتفظ بها تظل موجودة. حقول كلمات المرور والتوكنات والمستندات الخاصة لا تُطبع في المعاينة.

**لا تستخدم أمر التنفيذ قبل مراجعة القائمة.** بعد الموافقة على جميع عناصرها، انسخ `previewHash` من المعاينة مع البريد نفسه:

```bash
cd /root/sadat-release &&
sudo env \
  KEEP_ADMIN_EMAIL='info@elsadatrealestate.com' \
  PRODUCTION_LAUNCH_PREVIEW_SHA256='APPROVED_PREVIEW_HASH_HERE' \
  PRODUCTION_LAUNCH_CONFIRM=PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN \
  bash deploy/native/manage-production.sh launch
```

التنفيذ يوقف استقبال الكتابات، ويأخذ نسخة MongoDB والملفات الخاصة ويتحقق من البصمات، ثم يقارن البيانات بالمعاينة داخل معاملة قاعدة البيانات. إذا تغيّرت البيانات تتوقف العملية قبل الحذف وتحتاج معاينة جديدة. تُحذف الملفات التي لم تعد مرتبطة ببيانات محتفظ بها؛ صور إعدادات التصنيفات تبقى. تُحفظ النسخة الاحتياطية في `/var/backups/elsadatrealestate`، ثم تُعاد الخدمات وتُفحص صحتها. عملية التنظيف تتطلب توقفًا مؤقتًا؛ أمر `update` منفصل عنها ولا يحذف البيانات.

بعد التنفيذ: سجل دخول الأدمن مجددًا، راجع إعدادات العرض والتواصل والتصنيفات وصورها، وتأكد أن القوائم الفعلية فارغة وأن تسجيل حساب جديد وإضافة عقار يعملان. لا تستخدم `demo` بعد التنظيف لأنه يضيف بيانات تجربة جديدة.
