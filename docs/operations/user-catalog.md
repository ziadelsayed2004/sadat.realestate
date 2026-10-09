# كتالوج استخدام عقارات السادات

إصدار 9 أكتوبر 2026. الشرح والروابط مستخرجان من دليل الاستخدام داخل الموقع.

افتح [الكتالوج التفاعلي بالعربية](user-catalog.ar.html) في المتصفح: اختَر نوع الحساب، ثم «شرح الخطوات» أو «فتح الصفحة». يوجد بحث وفهرس وطباعة للنتائج.

| الحساب | الدليل داخل الموقع | نسخة القراءة |
| --- | --- | --- |
| العميل / الباحث عن عقار | [دليل الباحث](https://elsadatrealestate.com/seeker/user-guide?lang=ar) | [دليل الباحث](user-guide-seeker.ar.md) |
| عارض العقار الفردي | [دليل الفرد](https://elsadatrealestate.com/provider/user-guide?lang=ar&audience=individual_broker) | [دليل الفرد](user-guide-individual.ar.md) |
| مكتب الوساطة | [دليل المكتب](https://elsadatrealestate.com/provider/user-guide?lang=ar&audience=brokerage_office) | [دليل المكتب](user-guide-office.ar.md) |
| شركة التطوير | [دليل الشركة](https://elsadatrealestate.com/provider/user-guide?lang=ar&audience=developer) | [دليل الشركة](user-guide-company.ar.md) |
| مدير المنصة | [دليل الإدارة](https://elsadatrealestate.com/admin/user-guide?lang=ar&audience=owner-admin) | [دليل المدير](owner-user-guide.ar.md) |
| الموظف الإداري | [دليل الموظف](https://elsadatrealestate.com/admin/user-guide?lang=ar&audience=staff-admin) | [دليل الموظف](user-guide-staff.ar.md) |

الروابط تتطلب حسابًا بالدور المناسب. اختيار نوع حساب في الكتالوج يغيّر الشرح فقط. التصفح العام للعقارات متاح من [العقارات](https://elsadatrealestate.com/properties?lang=ar)، وطلبات التواصل والمعاينة تُتابع من حساب الباحث.

لإعادة توليد الكتالوج والنسخ بعد تحديث الشرح:

```powershell
node --import tsx scripts/export-owner-user-guide.mjs
```

كتالوج التسليم السابق في `docs/quality` يحتفظ بمراجع الشاشات وأدلة التحقق القديمة؛ هذا الكتالوج هو مرجع الاستخدام المحدّث.
