# حسابات العرض على Production

هذا الدليل ينشئ حسابات عرض حقيقية عبر نفس مسار التسجيل وOTP المستخدم للعميل. لا يشغّل
`db:seed` ولا يضع أي بريد أو كلمة مرور داخل Git.

## قبل الإنشاء

أنشئ ثلاثة عناوين بريد يمكن استلام الرسائل عليها، أو استخدم عناوين حقيقية يملكها فريق العرض:

- بريد مستقل لأول Super Admin.
- بريد لحساب Seeker.
- بريد لحساب Provider.

لا تفترض أن `info+seeker@elsadatrealestate.com` يعمل إلا بعد اختباره؛ دعم plus-addressing
يعتمد على إعداد خدمة البريد. الأفضل إنشاء mailbox أو forwarder واضح من hPanel لكل حساب عرض.

## أول Super Admin

شغّل أمر الـbootstrap الموجود في قسم `First Super Admin` داخل
`HOSTINGER_UBUNTU_RUNBOOK.md`. الأمر يعمل مرة واحدة فقط، ويقرأ البريد وكلمة المرور دون
كتابتهما في المستودع. استخدم كلمة مرور من 8 إلى 128 حرفًا تشمل حرفًا كبيرًا وصغيرًا ورقمًا
ورمزًا.

## Seeker وProvider

من مجلد الإصدار الحالي على الخادم:

```bash
cd /opt/elsadatrealestate/current
export DEMO_ACCOUNT_CONFIRM=CREATE_PRODUCTION_DEMO_ACCOUNT
sudo -u elsadat --preserve-env=DEMO_ACCOUNT_CONFIRM \
  bash deploy/native/create-demo-account.sh seeker
sudo -u elsadat --preserve-env=DEMO_ACCOUNT_CONFIRM \
  bash deploy/native/create-demo-account.sh provider
unset DEMO_ACCOUNT_CONFIRM
```

كل أمر يطلب البريد وكلمة المرور وOTP تفاعليًا من TTY. كلمة المرور لا تُطبع ولا تُمرر كوسيط
لسطر الأوامر ولا تُحفظ في ملف مؤقت. حساب Provider يبدأ كطلب `draft`؛ أكمل بياناته من
واجهة Provider ثم ارسله للمراجعة، وبعد ذلك وافق عليه من Admin إذا كان العرض يحتاج حالة
Provider معتمدة.

## تسليم بيانات الدخول للعميل

سجل بيانات الدخول في مدير كلمات مرور أو قناة سرية، وليس في ملف داخل المشروع. غيّر كلمات
مرور حسابات العرض أو عطّل الحسابات بعد انتهاء العرض. لا تستخدم بريد الإرسال
`info@elsadatrealestate.com` تلقائيًا كحساب Admin أو كحساب عرض.

## كلمة مرور SMTP

القيمة المطلوبة هي كلمة مرور صندوق البريد نفسه `info@elsadatrealestate.com`، وليست كلمة
مرور hPanel أو SSH أو VPS. ضعها فقط على الخادم في:

```text
/etc/elsadatrealestate/production.env
```

بالشكل التالي، مع إبقائها بين علامات اقتباس مفردة إذا احتوت رموزًا خاصة:

```dotenv
SMTP_USER=info@elsadatrealestate.com
SMTP_PASSWORD='ضع_هنا_كلمة_مرور_صندوق_البريد'
```

بعد الحفظ:

```bash
sudo chown root:elsadat /etc/elsadatrealestate/production.env
sudo chmod 0640 /etc/elsadatrealestate/production.env
sudo -u elsadat env PRODUCTION_ENV_FILE=/etc/elsadatrealestate/production.env \
  node scripts/production-preflight.mjs
```

ثم نفّذ فحص SMTP وإرسال رسالة اختبار كما هو موضح في runbook. إذا غيّرت كلمة مرور البريد
من hPanel، يجب تحديث `SMTP_PASSWORD` في الملف وإعادة تشغيل API.
