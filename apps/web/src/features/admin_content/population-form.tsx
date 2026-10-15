import type { CmsAdminContentData, CmsAdminPopulationValue, SupportedLocale } from '@sadat-real-estate/contracts';
import { getAdminCmsCopy } from './copy.ts';
import { CityStatisticsEditor } from './city-statistics.tsx';

export function PopulationValueForm({ population, locale, loadStatistics, saveStatistic, errorMessage }: {
  readonly population: CmsAdminPopulationValue | undefined;
  readonly locale: SupportedLocale;
  readonly onSave: (input: unknown) => Promise<void>;
  readonly errorMessage: (error: unknown) => string;
  readonly loadStatistics?: () => Promise<CmsAdminContentData>;
  readonly saveStatistic?: (input: unknown) => Promise<CmsAdminContentData>;
}) {
  const copy = getAdminCmsCopy(locale);
  const automatic = population?.automatic === true;
  const available = automatic && population.status === 'available' && population.value !== undefined;
  return <><section className="admin-content__editor" data-testid="admin-cms-population-editor">
    <div className="admin-content__editor-heading"><div><p className="admin-content__eyebrow">{copy.eyebrow}</p><h2>{copy.namespace.population}</h2></div></div>
    <p>{locale === 'ar' ? 'عدد السكان يتحدث تلقائيًا من World Population Review. تراجع المنصة المصدر كل 24 ساعة، وتحتفظ بآخر تقدير صحيح إذا تعذر الاتصال.' : 'Population updates automatically from World Population Review. The platform checks the source every 24 hours and retains the last verified estimate if the source is unavailable.'}</p>
    {available ? <>
      <p><strong>{new Intl.NumberFormat(locale).format(population.value!)}</strong> {locale === 'ar' ? 'نسمة' : 'residents'}</p>
      <p>{locale === 'ar' ? 'تقدير السكان لسنة' : 'Population estimate for'} {population.sourceYear}</p>
      {population.checkedAt ? <p>{locale === 'ar' ? 'آخر تحقق من المصدر:' : 'Last source check:'} <time dateTime={population.checkedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(population.checkedAt))}</time></p> : null}
    </> : <p role="status">{locale === 'ar' ? 'لم يتم جلب تقدير السكان بعد. سيظهر العدد بعد نجاح الاتصال بالمصدر.' : 'The population estimate has not been retrieved yet. It will appear after a successful source check.'}</p>}
    <p><a href="https://worldpopulationreview.com/cities/egypt/sadat-city" target="_blank" rel="noreferrer">{locale === 'ar' ? 'عرض مصدر عدد السكان' : 'View population source'}</a></p>
    <p className="admin-content__muted">{locale === 'ar' ? 'المباني وباقي الإحصائيات تظل قابلة للتعديل يدويًا من إعدادات محتوى المنصة.' : 'Buildings and other statistics remain editable manually in the platform content settings.'}</p>
  </section>{loadStatistics && saveStatistic ? <CityStatisticsEditor locale={locale} population={available ? population.value : undefined} load={loadStatistics} save={saveStatistic} errorMessage={errorMessage} /> : null}</>;
}
