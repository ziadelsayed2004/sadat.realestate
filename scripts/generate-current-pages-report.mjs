import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = JSON.parse(await readFile(new URL('docs/quality/ALL_PAGES_REVIEW_2026-09-05.json', root), 'utf8'));
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const groups = Object.entries(Object.groupBy(source.rows, row => row.surface));
const measuredDesktop = source.rows.filter(row => row.currentDesktopParityPercent != null).length;
const measuredResponsive = source.rows.filter(row => row.currentResponsiveParityPercent != null).length;
const publicRows = source.rows.filter(row => row.surface === 'public');
const footerEvidence = source.followUp.publicFooterResponsive;

const assessmentFor = row => row.surface === 'public'
  ? `${row.responsiveAssessment} — الفوتر المشترك فقط: ناجح ضمن 72/72 حالة على 12 صفحة ولغتين وثلاثة مقاسات؛ لا يمثل قياس الصفحة كاملة.`
  : row.responsiveAssessment;

const tableRows = source.rows.map(row => `<tr data-surface="${escape(row.surface)}">
  <td><strong>${escape(row.id)}</strong><br>${escape(row.name)}</td>
  <td><code>${escape(row.route)}</code></td>
  <td>${row.currentDesktopParityPercent == null ? 'غير مقاسة حاليًا' : `${escape(row.currentDesktopParityPercent)}%`}</td>
  <td>${row.currentResponsiveParityPercent == null ? 'غير مقاسة حاليًا' : `${escape(row.currentResponsiveParityPercent)}%`}</td>
  <td>${row.metrics.length ? row.metrics.map(metric => `${escape(metric.diff)}% اختلاف تاريخي — ${escape(metric.method)}`).join('<br>') : 'لا يوجد قياس مسجل'}</td>
  <td>${escape(row.latestAssessment ?? row.backendAssessment)}<br><small>اكتمال الرحلة على الإنتاج غير مثبت إلا في حدود الدليل المذكور.</small></td>
  <td>${escape(assessmentFor(row))}</td>
</tr>`).join('');

const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>التقرير الحالي لجميع الصفحات</title>
<style>body{font:16px/1.8 Tahoma,Arial;background:#f7f8fa;color:#19243d;margin:0}main{max-width:1600px;margin:auto;padding:24px}section{background:#fff;border:1px solid #ddd;padding:20px;margin:18px 0;border-radius:12px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.card{background:#edf3f2;border-radius:10px;padding:16px}.card strong{display:block;font-size:28px;color:#146759}.ok{color:#146759}.warn{color:#8b5b00}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ddd;padding:12px;text-align:right;vertical-align:top}th{background:#edf3f2;position:sticky;top:0}.scroll{overflow:auto;max-height:75vh}code{direction:ltr;display:inline-block;overflow-wrap:anywhere}small{color:#666}a{color:#146759}input{font:inherit;padding:10px;width:min(520px,90%)}@media(max-width:700px){main{padding:12px}section{padding:14px}table{font-size:12px}td,th{padding:8px}}@media print{input{display:none}.scroll{max-height:none;overflow:visible}main{padding:0}}</style></head>
<body><main>
<h1>تقرير كل الصفحات — آخر حالة مثبتة</h1>
<p>6 سبتمبر 2026 · ${source.rows.length} شاشة/حالة. المرجع البصري المعتمد هو ملف Figma <code>Odl1Epn2u6lIEuIMmABT7o</code>، ودليل المستخدم مرجع للآلية مع اعتماد البريد الإلكتروني وOTP بدل التسجيل القديم بالهاتف.</p>
<section><h2>الخلاصة بالأرقام</h2><div class="cards">
<div class="card"><strong>${source.rows.length}</strong>إجمالي الشاشات/الحالات المسجلة</div><div class="card"><strong>${measuredDesktop}/${source.rows.length}</strong>نسب Figma الحالية المقاسة للديسكتوب</div><div class="card"><strong>${measuredResponsive}/${source.rows.length}</strong>نسب Figma الحالية المقاسة للريسبونسيف</div><div class="card"><strong>72/72</strong>فحص الفوتر العام: 12 صفحة × لغتين × 3 مقاسات</div></div>
<p class="warn"><strong>لا توجد حتى الآن نسبة مطابقة حديثة موثوقة للصفحات الكاملة؛ «غير مقاسة» لا تعني 0% ولا 100%.</strong> القياسات التاريخية تعرض فرقًا قديمًا فقط، ولا يصح تحويلها إلى نسبة حالية بطرحها من 100.</p><p>${groups.map(([name, values]) => `${escape(name)}: ${values.length}`).join(' · ')}</p></section>
<section><h2>تحديث الفوتر العام PUB-01 إلى PUB-12</h2><p class="ok"><strong>تم إصلاح الفوتر المشترك والتحقق منه على كل صفحات Public الاثنتي عشرة.</strong></p>
<p>طابق التنفيذ بنية عقدتي Figma: الديسكتوب <code>6017:11365</code> والموبايل <code>6129:7924</code> داخل الشاشة <code>6017:110792</code>. أُصلح ترتيب RTL، وتقسيم الأعمدة 4/2/1 للديسكتوب/التابلت/الموبايل، وصف المتابعة والحقوق، والروابط الحافظة للغة، وأيقونات التواصل والنسخة المختصرة للموبايل.</p><p>${escape(footerEvidence.validation)}</p>
<p><a href="public-footer-responsive-2026-09-06/results.json">نتائج 72 حالة</a> · <a href="public-footer-responsive-2026-09-06/PUB-01-ar-desktop.png">لقطة ديسكتوب عربي</a> · <a href="public-footer-responsive-2026-09-06/PUB-01-ar-tablet.png">لقطة تابلت عربي</a> · <a href="public-footer-responsive-2026-09-06/PUB-01-ar-mobile.png">لقطة موبايل عربي</a></p><p class="warn">هذا يثبت الفوتر المشترك فقط؛ لا يمنح ${publicRows.length} صفحة Public نسبة مطابقة كاملة قبل قياس باقي محتوى كل صفحة.</p></section>
<section><h2>رحلة العارض الفردي</h2><p>الإيميل وOTP هما المسار الحالي. الاختبارات المحلية أثبتت أن المستند الاختياري لا يمنع المراجعة، وأن اكتمال الموقع الرئيسي ومناطق الخدمة والمستندات المطلوبة هو الشرط. لقطة الإنتاج التي قدّمها صاحب المشروع في 6 سبتمبر أثبتت وصول الطلب إلى «قيد المراجعة»؛ لذلك عطل زر المتابعة الظاهر سابقًا مغلق في هذه الرحلة بحدود الدليل المتاح.</p><p class="warn">المتبقي: اختبار قرار الإدارة قبولًا ورفضًا، ثم سلوك الحساب بعد القرار. اللقطة المقدمة ليست إعادة تشغيل مستقلة للرحلة بواسطة هذا التدقيق.</p></section>
<section><h2>كل الصفحات — صفحة بصفحة</h2><input id="q" aria-label="بحث الصفحات" placeholder="ابحث بالكود أو اسم الصفحة أو المسار"><p id="count">${source.rows.length} شاشة/حالة</p><div class="scroll"><table><thead><tr><th>الشاشة</th><th>المسار</th><th>مطابقة ديسكتوب الحالية</th><th>مطابقة ريسبونسيف الحالية</th><th>القياس التاريخي — ليس نسبة حالية</th><th>الآلية والباك إند</th><th>التحقق الريسبونسيف</th></tr></thead><tbody>${tableRows}</tbody></table></div></section>
<section><h2>المتبقي قبل إعلان 100%</h2><p>قياس بصري حديث ومضبوط لكل شاشة على الديسكتوب والتابلت والموبايل وباللغتين، ثم إغلاق الفروق واحدةً واحدة. وظيفيًا يلزم استكمال رحلات اعتماد أنواع مقدمي العقار، ونشر العقار وظهوره العام، والطلبات والمعاينات بين الأدوار، والإعلانات والدفع والعمولات والصلاحيات على بيئة إنتاج أو بيئة مطابقة لها ببيانات حقيقية قابلة للتتبع.</p><p><a href="Sadat_Real_Estate_Client_User_Guide_FINAL_AR.html">دليل المستخدم</a> · <a href="ALL_PAGES_REVIEW_2026-09-05_AR.html">السجل التاريخي التفصيلي</a></p></section>
</main><script>document.querySelector('#q').addEventListener('input',event=>{let count=0;for(const row of document.querySelectorAll('tbody tr')){row.hidden=!row.textContent.toLowerCase().includes(event.target.value.toLowerCase());if(!row.hidden)count+=1;}document.querySelector('#count').textContent=count+' شاشة/حالة';});</script></body></html>`;

await writeFile(new URL('docs/quality/ALL_PAGES_CURRENT_AR.html', root), html);
console.log(JSON.stringify({ rows: source.rows.length, groups: groups.map(([group, rows]) => ({ group, count: rows.length })), currentMeasuredDesktop: measuredDesktop, currentMeasuredResponsive: measuredResponsive, publicFooterCases: 72 }));
