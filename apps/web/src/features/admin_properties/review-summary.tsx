import type { ReactNode } from 'react';
import type { PropertyData, SupportedLocale } from '@sadat-real-estate/contracts';
import { replaceLocaleInUrl } from '../localization/index.ts';
import { localizedText } from '../public/model.ts';
import { AdminPropertyCover } from './photo.tsx';
import type { AdminPropertiesAuthorizationSource } from './data.ts';
import { getAdminPropertiesCopy } from './copy.ts';

export function PropertyReviewSummary({ property, locale, authorization, apiOrigin, status }: { property: PropertyData; locale: SupportedLocale; authorization?: AdminPropertiesAuthorizationSource | undefined; apiOrigin?: string | undefined; status: ReactNode }) {
  const ar = locale === 'ar', copy = getAdminPropertiesCopy(locale);
  const context = property.reviewContext, organization = context?.organization, project = context?.project;
  const sourceKind = organization?.kind ?? property.source.sourceType;
  const sourceLabel = ({ developer_company: ar ? 'شركة تطوير' : 'Developer company', brokerage_office: ar ? 'مكتب وساطة' : 'Brokerage office', individual_broker: ar ? 'وسيط فردي' : 'Individual broker' })[sourceKind];
  const link = (path: string, label: string) => <a key={path} href={replaceLocaleInUrl(path, locale)}>{label}</a>;
  return <article className="admin-properties__detail-card admin-property-review-summary">
    <div className="admin-property-review-summary__media"><AdminPropertyCover property={property} locale={locale} authorization={authorization} apiOrigin={apiOrigin} /></div>
    <div className="admin-property-review-summary__body">
      <div className="admin-property-review-summary__badges">{status}<span>{property.transactionType === 'sale' ? ar ? 'للبيع' : 'For sale' : ar ? 'للإيجار' : 'For rent'}</span><span>{property.kind === 'unit' ? ar ? 'وحدة عقارية' : 'Property unit' : ar ? 'عقار' : 'Property'}</span></div>
      <h2>{localizedText(property.name, locale)}</h2>
      {project ? <section className="admin-property-review-summary__project" aria-label={ar ? 'ارتباط العقار بالمشروع' : 'Property project affiliation'}>
        <p>{ar ? 'تابع للمشروع / الكمبوند' : 'Part of project / compound'}</p><h3>{localizedText(project.name, locale)}</h3>
        <p>{ar ? 'حالة المشروع: ' : 'Project status: '}{copy.status[project.status]}</p>
        <nav aria-label={ar ? 'روابط المشروع' : 'Project links'}>{project.adminPath ? link(project.adminPath, ar ? 'مراجعة المشروع بالإدارة' : 'Review project in administration') : null}{project.publicPath ? link(project.publicPath, ar ? 'فتح المشروع في الموقع' : 'Open public project') : null}</nav>
      </section> : property.projectId ? <p className="admin-property-review-summary__notice" role="note">{ar ? 'العقار مرتبط بمشروع، لكن بيانات المشروع غير متاحة أو الربط لا يطابق جهة العقار. راجع الارتباط قبل الاعتماد.' : 'This property references a project whose details are unavailable or do not match its organization. Check the association before approval.'}</p> : <p className="admin-property-review-summary__standalone">{property.parentPropertyId ? ar ? 'وحدة مرتبطة بعقار رئيسي' : 'Unit linked to a main property' : ar ? 'إعلان مستقل غير مرتبط بمشروع' : 'Standalone listing without a project'}</p>}
      <section className="admin-property-review-summary__source" aria-label={copy.columns.source}><p>{ar ? 'مقدّم العقار' : 'Property provider'} · {sourceLabel}</p>{organization ? <h3>{localizedText(organization.name, locale)}</h3> : null}
        {organization ? <nav aria-label={ar ? 'روابط مقدم العقار ومشروعاته' : 'Provider and project links'}>{organization.adminPath ? link(organization.adminPath, ar ? 'ملف مقدم العقار بالإدارة' : 'Provider administration profile') : null}{organization.publicPath ? link(organization.publicPath, ar ? 'الملف في الموقع' : 'Public profile') : null}{organization.projectsPath ? link(organization.projectsPath, ar ? 'المشروعات المنشورة' : 'Published projects') : null}</nav> : null}
      </section>
      <p>{copy.columns.active}: {property.active ? copy.active : copy.inactive}</p>
      {property.reviewReason ? <p>{copy.columns.reason}: {property.reviewReason}</p> : null}
      <details className="admin-property-review-summary__technical"><summary>{ar ? 'بيانات السجل التقنية' : 'Technical record details'}</summary><dl><div><dt>{copy.columns.id}</dt><dd><code>{property.id}</code></dd></div><div><dt>{ar ? 'حساب مقدم العقار' : 'Provider account'}</dt><dd><code>{property.source.providerId}</code></dd></div><div><dt>{copy.columns.version}</dt><dd>{property.version}</dd></div></dl></details>
      <nav className="admin-properties__detail-links" aria-label={ar ? 'فحص العقار' : 'Property checks'}>{link(`/admin/properties/possible-duplicates?propertyId=${property.id}`, copy.openDuplicates)}{link(`/admin/property-reports?propertyId=${property.id}`, copy.openReports)}</nav>
    </div>
  </article>;
}
