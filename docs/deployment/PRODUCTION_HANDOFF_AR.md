# دليل تسليم ورفع Production — عقارات السادات

تاريخ المراجعة: 2026-09-03. الهدف: `elsadatrealestate.com` على VPS
`72.62.235.228`، مع بريد الإرسال `info@elsadatrealestate.com`.

## الحالة المثبتة الآن

- سجلا DNS من النوع A للدومين الأساسي و`www` يشيران إلى `72.62.235.228`.
- اتصال SSH يصل إلى الخادم، لكن المصادقة من بيئة التطوير الحالية مرفوضة لعدم وجود المفتاح الخاص.
- طلب `https://elsadatrealestate.com/health` انتهى بمهلة؛ HTTPS والخدمات لم يُثبت تشغيلها بعد.
- `npm run lint` و`npm run typecheck` و`npm run build` نجحت محليًا.
- OpenAPI وPostman صالحان، واختبارات Auth المركزة واختبارات واجهات Auth/Developers/Listing نجحت.

## ملف البيئة الصحيح

المصدر الوحيد هو `/.env.production.example`. لا تنشئ نسخة مختلفة داخل `apps/api`
حتى لا يحدث اختلاف بين إعداد API وإعداد خدمات systemd. على جهاز موثوق:

```bash
npm run production:prepare
```

ينشئ الأمر `/.env.production` بصلاحية `0600` ويولد تلقائيًا أسرار JWT والتنزيل
وكلمات MongoDB ومفتاح replica set. القيمة الوحيدة التي يجب إدخالها يدويًا هي
`SMTP_PASSWORD` الخاصة بصندوق Hostinger. لا ترفع هذا الملف إلى GitHub.

على الخادم:

```bash
sudo install -o root -g elsadat -m 0640 .env.production \
  /etc/elsadatrealestate/production.env
sudo -u elsadat env PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env \
  node scripts/production-preflight.mjs
```

النتيجة المطلوبة: `PRODUCTION_PREFLIGHT_OK`.

## البيانات الحساسة المطلوبة من مالك المشروع

لا تُرسل القيم التالية في المحادثة أو تضعها في المستودع:

1. SSH private key لمستخدم تشغيل بصلاحية sudo، أو إضافة public key الخاص بالمشغل إلى الخادم.
2. كلمة مرور `info@elsadatrealestate.com`، وتوضع فقط في
   `/etc/elsadatrealestate/production.env` تحت `SMTP_PASSWORD`.
3. كلمة مرور أول Super Admin يختارها المالك وقت bootstrap؛ لا توجد كلمة مرور Production افتراضية.
4. تأكيد أن نسخة Hostinger الاحتياطية مفعلة ومكان نسخة MongoDB المشفرة خارج نفس الـVPS.

لا نحتاج كلمة مرور MongoDB أو مفاتيح التوقيع من العميل؛ `production:prepare` يولدها.

## أول تثبيت على Ubuntu

```bash
git clone --depth 1 --branch main \
  https://github.com/ziadelsayed2004/sadat.realestate.git /root/sadat-release
cd /root/sadat-release
sudo bash deploy/native/install-ubuntu.sh
npm run production:prepare
# عدّل SMTP_PASSWORD محليًا ثم ثبّت الملف كما في القسم السابق
sudo PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env \
  bash deploy/native/configure-mongodb.sh
sudo -u elsadat bash deploy/native/deploy-release.sh /root/sadat-release
sudo systemctl enable --now elsadat-api elsadat-web elsadat-backup.timer elsadat-healthcheck.timer
sudo bash deploy/native/enable-https.sh
sudo nginx -t
```

ثم نفّذ:

```bash
curl -fsS http://127.0.0.1:3000/ready
curl -fsS http://127.0.0.1:4173/health
curl -fsSIL https://elsadatrealestate.com/
SMOKE_BASE_URL=https://elsadatrealestate.com npm run production:smoke
```

## أول Super Admin

البريد المقترح للمالك يحدده العميل، ولا يُستخدم بريد الإرسال تلقائيًا كحساب Admin.
بعد تشغيل الخدمات، اتبع قسم “First Super Admin” في
`HOSTINGER_UBUNTU_RUNBOOK.md`. كلمة المرور 8 أحرف على الأقل، ولا توجد بيانات
Production جاهزة أو منشورة.

## حسابات التجربة المحلية فقط

هذه الحسابات تنتهي بـ`.invalid` ولا تعمل على Production:

| الدور | البريد | الدخول المحلي |
|---|---|---|
| Super Admin | `admin.demo@example.invalid` | `LocalPreview-Admin-Only-2026!` |
| Operations Admin | `admin.operations@example.invalid` | `LocalPreview-Admin-Only-2026!` |
| View-only Admin | `admin.viewer@example.invalid` | `LocalPreview-Admin-Only-2026!` |
| Seeker | `buyer.demo@example.invalid` | OTP من صندوق البريد المحلي |
| Seeker | `seeker.demo@example.invalid` | OTP من صندوق البريد المحلي |
| Provider | `provider.demo@example.invalid` | OTP من صندوق البريد المحلي |
| Broker | `broker.demo@example.invalid` | OTP من صندوق البريد المحلي |
| Office | `office.demo@example.invalid` | OTP من صندوق البريد المحلي |

بيئة `local:up` الأصلية تستخدم SMTP محليًا وتعرض الرسائل على `http://localhost:8025`؛
لذلك الكود عشوائي وليس `000000`. الكود الثابت `000000` يخص فقط تشغيل API مباشرة
مع `OTP_PROVIDER=deterministic-fake` كما هو موضح في `apps/api/.env.example`.

عملاء Production يسجلون ببريد حقيقي وكلمة مرور يختارونها، ثم يؤكدون البريد
بالـOTP المرسل من `info@elsadatrealestate.com`. لا تشغّل `db:seed` في Production.

## تحقق Auth الحقيقي على قاعدة البيانات

في 2026-09-03 تم تشغيل المسارات التالية ضد MongoDB المحلية وSMTP المحلي دون mocks:

- Seeker: إرسال OTP، التحقق، إنشاء الحساب بكلمة مرور، تسجيل الدخول، إرسال OTP
  للاسترجاع، تعيين كلمة مرور جديدة، ثم تسجيل الدخول بالكلمة الجديدة.
- Provider: إرسال OTP، التحقق، إنشاء حساب وطلب بحالة `draft`، ثم تسجيل الدخول.
- تم إصلاح تعارض timestamps في upsert الخاص ببيانات الاعتماد، وهو سبب خطأ 500 الذي
  كان يمنع حفظ كلمة المرور بعد التسجيل.

## مراجعة Figma

تم الوصول مباشرة إلى الملف `Odl1Epn2u6lIEuIMmABT7o` بحساب Figma المتصل.
الملف يحتوي 131 شاشة: Auth 19، Seeker 10، Provider 24، Admin 66، Public 12.
سجل التنفيذ الحالي: 24 verified-without-change، و78 repaired، و28 partial، وشاشة
واحدة blocked-source. لذلك لا يصح اعتماد عبارة “كل الشاشات Pixel-perfect”.

- `ADM-18 /admin/requests` محجوبة لأن الملف الحالي لا يحتوي إطار Figma مطابقًا.
- `ADM-54` ليس له owning frame تاريخي مستقل وفق inventory.
- شاشة Login في Figma تستخدم كلمة مرور قوية من 8 أحرف (`Ah123456#` كمثال مرئي).
- شاشة Provider Type في Figma لا تحتوي حقول كلمة مرور؛ إضافتها في التطبيق تعديل
  وظيفي بطلب المالك، وتحتاج تحديث Figma إذا كان المطلوب تطابق حرفي جديد.
- الأدلة الحالية تثبت تنفيذ المسارات والحالات والاختبارات، لكنها تسجل فروقًا بصرية
  متبقية في 28 شاشة ولا تعتبرها مغلقة.

## بوابة الإطلاق النهائية

لا يعتبر الموقع Production-ready حتى تنجح جميع النقاط التالية على الخادم:

- SSH key ومستخدم sudo غير root للتشغيل اليومي.
- `production-preflight` ثم MongoDB PRIMARY ثم ClamAV ready.
- Nginx وTLS وشهادة تشمل apex و`www`.
- SMTP check ورسالة OTP حقيقية مستلمة.
- Bootstrap لأول Super Admin ثم اختبار تسجيل/دخول Seeker وProvider.
- اختبار upload نظيف واختبار EICAR مرفوض.
- تشغيل backup ثم restore drill مع نسخة مشفرة خارج الخادم.
- تشغيل public smoke وhealthcheck وrollback تجريبي.
- قرار مالك المنتج بشأن 28 فروق Figma و`ADM-18` وتحديث تصميم Provider password.

## التحديثات التالية من GitHub

```bash
sudo -u elsadat env RELEASE_REF=main \
  EXTERNAL_SMOKE_BASE_URL=https://elsadatrealestate.com \
  bash /opt/elsadatrealestate/current/deploy/native/deploy-from-github.sh
```

السكريبت يشغّل التحقق والاختبارات والبناء، يبدل الإصدار atomically، ويعيد الإصدار
السابق إذا فشل readiness.
