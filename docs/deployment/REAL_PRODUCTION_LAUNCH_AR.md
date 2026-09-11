# دليل الانتقال إلى Production الحقيقي

هذا الإجراء يُنفذ مرة واحدة بعد اكتمال اختبارات التسليم. النتيجة المقصودة هي قاعدة تشغيل
نظيفة تحتوي حساب Super Admin الحقيقي فقط، من دون حسابات أو محتوى Demo/QA، مع الاحتفاظ
بسجل migrations والفهارس ونسخة احتياطية قابلة للاستعادة.

## ما تحتفظ به العملية

- مستخدم Admin المطابق لـ`KEEP_ADMIN_EMAIL` بشرط أن يكون `verified` وغير synthetic.
- `admin_profiles` و`admin_credentials` و`admin_bootstrap` و`admin_accounts` المرتبطة به.
- مجموعة `database_migrations` كاملة.
- بنية مجموعات MongoDB وفهارسها؛ العملية تستخدم `deleteMany` داخل transaction ولا تستخدم drop.

تُمسح كل السجلات الأخرى، بما فيها الجلسات وOTP والحسابات والعقارات والمشروعات والإعلانات
والمحتوى والمجتمع والإشعارات والـoutbox وسجلات الاختبار. كما تُمسح محتويات مجلد الرفع الخاص
بعد نجاح نسخة الملفات وفحص checksum. لذلك تنتهي جلسة Admin الحالية ويجب تسجيل الدخول مجددًا.

## ضمانات الإيقاف الآمن

يتوقف `launch` قبل أي حذف إذا لم يتحقق أي شرط من الآتي:

- بيئة التطبيق `production`.
- البريد صالح ويطابق مستخدمًا واحدًا فقط.
- المستخدم Admin مؤكد وله Admin profile وcredential وسجل bootstrap واحد بصلاحية Super Admin.
- النسخة موجودة تحت `/var/backups/elsadatrealestate/<timestamp>`.
- `mongodb.archive.gz` و`private-files.tar.gz` موجودان وغير فارغين.
- قيم الملف `SHA256SUMS` تطابق الملفين.

لا يطبع الأمر URI أو password أو hash. ويعيد تشغيل API وWeb تلقائيًا إذا فشلت خطوة بعد
إيقاف الخدمات.

## التنفيذ

راجع البريد قبل التنفيذ، ثم شغّل:

```bash
cd /root/sadat-release &&
git pull --ff-only origin main &&
git rev-parse --short HEAD &&
sudo env KEEP_ADMIN_EMAIL='admin@example.com' \
  PRODUCTION_LAUNCH_CONFIRM=PURGE_ALL_DATA_EXCEPT_CONFIRMED_SUPER_ADMIN \
  bash /root/sadat-release/deploy/native/manage-production.sh launch
```

لا تضع كلمة المرور في الأمر. بدّل `admin@example.com` ببريد Super Admin الحقيقي فقط.
يجب أن ينتهي الخرج بالأسطر الآتية دون رموز فشل:

```text
NATIVE_BACKUP_OK path=/var/backups/elsadatrealestate/<timestamp> off_server_copy_required=true
PRODUCTION_LAUNCH_PLANNED ...
PRODUCTION_LAUNCH_APPLIED users_after=1 ... synthetic_after=0
PRODUCTION_PRIVATE_FILES_PURGED ...
PRODUCTION_MANAGE_OK mode=launch data=real_launch_admin_only
```

انسخ مجلد النسخة الناتج إلى مخزن مشفر خارج VPS قبل حذف النسخة المحلية وفق سياسة الاحتفاظ.

## التحقق بعد الإطلاق

```bash
sudo systemctl --no-pager --full status elsadat-api.service elsadat-web.service
curl --fail --silent --show-error https://elsadatrealestate.com/ >/dev/null
curl --fail --silent --show-error https://elsadatrealestate.com/ready
curl --fail --silent --show-error https://elsadatrealestate.com/api/v1/public/bootstrap
curl --fail --silent --show-error https://elsadatrealestate.com/api/v1/public/home
```

سجّل الدخول بحساب Admin الحقيقي. يجب أن تكون صفحات القوائم في حالاتها الفارغة، وأن تظل
صفحات الإدارة والصلاحيات متاحة لحساب bootstrap Super Admin.

## الإصدارات اللاحقة

بعد نجاح `launch` لا تستخدم Seed أو سكربتات Demo. انشر التحديثات فقط باستخدام:

```bash
cd /root/sadat-release &&
git pull --ff-only origin main &&
git rev-parse --short HEAD &&
sudo bash /root/sadat-release/deploy/native/manage-production.sh update
```

## الاستعادة عند الضرورة

لا تستعد مباشرة فوق Production. اختبر النسخة أولًا في قاعدة معزولة:

```bash
sudo -i
set -a
source /etc/elsadatrealestate/production.env
set +a
RESTORE_TARGET_DATABASE=sadat_restore_verify \
  /opt/elsadatrealestate/current/deploy/native/restore.sh \
  /var/backups/elsadatrealestate/<timestamp>
exit
```

بعد التحقق من النسخة المعزولة فقط، تتطلب استعادة قاعدة `sadat` نفسها تعيين
`RESTORE_CONFIRM=REPLACE_PRODUCTION` وفق دليل Hostinger.
