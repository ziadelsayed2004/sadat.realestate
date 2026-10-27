import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function CommissionHelp({ locale }: { locale: SupportedLocale }) {
  const ar = locale === 'ar';
  return <details className="admin-commissions__panel admin-commissions__help">
    <summary>{ar ? 'إزاي أحدد عمولة كل نوع حساب؟' : 'How do I set each account category’s commission?'}</summary>
    <ol>
      <li>{ar ? 'مالك العقار: من «إنشاء سياسة» اضغط «تجهيز سياسة مالك العقار ٢٪»، راجع البداية واحفظ المسودة، ثم اكتب سبب الاعتماد واضغط «اعتماد وتفعيل السياسة».' : 'Property owner: create a policy, use the 2% owner preset, review its start date and save. Enter an approval reason, then approve and activate it.'}</li>
      <li>{ar ? 'المكتب: من «إنشاء سياسة» اضغط «تجهيز سياسة المكتب ١٫٥٪»، ثم احفظ واعتمد.' : 'Office: use the 1.5% office preset, then save and approve.'}</li>
      <li>{ar ? 'شركة التطوير: افتح «الحساب»، اختر اسم الشركة وحدد نسبتها حسب الاتفاق واحفظ. كرر لكل شركة. تخصيص الحساب يسبق سياسة الفئة.' : 'Developer: open Account, choose the company and save its agreed rate. Repeat for each company; its agreement takes precedence over category policies.'}</li>
      <li>{ar ? 'الاستثناء: لاتفاق خاص مع حساب محدد. حفظه مسودة لا يطبّقه؛ لازم «اعتماد وتفعيل الاستثناء»، وتكون فترة سريانه بدأت ولم تنتهِ. الاستثناء المعتمد يسبق تخصيص الحساب وسياسة الفئة، والإعفاء يعني بدون عمولة.' : 'Exception: a special agreement for one account. A saved draft does not apply until approved and inside its effective period. An active exception overrides account and category agreements; Exempt means no commission.'}</li>
    </ol>
    <p>{ar ? 'الإيجار خانة مستقلة داخل كل اتفاق: 0.5 يعني نصف شهر من قيمة الإيجار الشهري. غيّرها إلى 1 لشهر أو القيمة المتفق عليها. تقدر تعدّل البيع والإيجار من «تعديل عمولة البيع والإيجار» في قائمة السياسات، أو من تخصيص حساب الشركة. السجلات القديمة التي لم تحدد عمولة إيجار تظهر «لم يُحدد» حتى تعديلها.' : 'Each agreement has a separate rental field: 0.5 means half a month of monthly rent. Use 1 for a full month or enter the agreed value. Edit both terms in the policy list or the company account agreement. Older records without a rental term show “not specified” until edited.'}</p>
    <p>{ar ? 'رمز السياسة يتولد تلقائيًا. اختيار الفئة يغنيك عن كتابة مفتاح نطاق. السياسة العامة بديل للحسابات التي ليس لها اتفاق أو سياسة فئة؛ لا تحدد نسبة للمطورين بشكل عام لو اتفاق كل شركة مختلف.' : 'Policy codes are generated automatically. Choose a category instead of typing a scope key. The default is a fallback; avoid a general developer rate when each company has a separate agreement.'}</p>
    <a href={`/admin/user-guide?lang=${locale}#guide-commission-policy`}>{ar ? 'دليل العمولات' : 'Commission guide'}</a>
  </details>;
}
