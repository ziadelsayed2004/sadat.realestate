import { useEffect, useState } from 'react';
import type {
  PublicOrganizationProfile,
  PublicOrganizationProperty,
  PublicOrganizationProject,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from './components.tsx';
import {
  defaultPublicDeveloperProfileLoader,
  publicDeveloperProfileSlugFromUrl,
  type PublicDeveloperProfileLoader
} from './developers-data.ts';
import { getPublicDevelopersCopy, type PublicDevelopersCopy } from './developers-copy.ts';
import { localizedText } from './model.ts';
import './developers.css';

export type PublicDeveloperProfileInitialState = 'loading' | 'retry' | 'not_found';
export type PublicDeveloperProfileViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'> | 'not_found';

export interface PublicDeveloperProfileProps {
  readonly url?: string;
  readonly locale: SupportedLocale;
  readonly initialData?: PublicOrganizationProfile | undefined;
  readonly initialState?: PublicDeveloperProfileInitialState | undefined;
  readonly load?: PublicDeveloperProfileLoader | undefined;
}

type LocalizedValue = NonNullable<PublicOrganizationProfile['locations']>[number];
type IconName = 'arrow' | 'calendar' | 'check' | 'location' | 'mail' | 'phone' | 'project' | 'shield' | 'unit' | 'whatsapp';

function errorState(error: unknown): PublicDeveloperProfileViewState {
  if (error instanceof ApiClientError && error.status === 404) return 'not_found';
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function stateCopy(state: Exclude<PublicDeveloperProfileViewState, 'success' | 'not_found'>, copy: PublicDevelopersCopy): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
  }
}

function safePublicUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed = new URL(value, 'http://sadat-real-estate.local');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

function kindLabel(kind: PublicOrganizationProfile['kind'], copy: PublicDevelopersCopy): string {
  return kind === 'developer_company' ? copy.developerCompany : copy.brokerageOffice;
}

function propertyLabel(property: PublicOrganizationProperty, copy: PublicDevelopersCopy): string {
  return property.kind === 'property' ? copy.property : copy.unit;
}

function localizedValues(values: readonly LocalizedValue[] | undefined, locale: SupportedLocale): string[] {
  return (values ?? []).flatMap(value => {
    const label = localizedText(value, locale);
    return label === undefined ? [] : [label];
  });
}

function ProfileIcon({ name }: { readonly name: IconName }) {
  const common = { className: 'public-developer-profile__icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, focusable: 'false' as const, 'aria-hidden': true };
  switch (name) {
    case 'check':
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case 'arrow':
      return <svg {...common}><path d="M5 12h13m-5-5 5 5-5 5" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></svg>;
    case 'location':
      return <svg {...common}><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
    case 'mail':
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
    case 'phone':
      return <svg {...common}><path d="M7 4h3l1.5 4-2 1.5a13 13 0 0 0 5 5l1.5-2 4 1.5v3c0 1.1-.9 2-2 2C10.8 19.5 4.5 13.2 4.5 5c0-1.1.9-2 2-2Z" /></svg>;
    case 'project':
      return <svg {...common}><path d="M4 20V7l8-4 8 4v13M8 20v-6h8v6M8 9h.01M12 9h.01M16 9h.01" /></svg>;
    case 'shield':
      return <svg {...common}><path d="m12 3 7 3v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case 'unit':
      return <svg {...common}><path d="M5 20V8l7-4 7 4v12M9 20v-4h6v4M9 10h.01M12 10h.01M15 10h.01" /></svg>;
    case 'whatsapp':
      return <svg {...common}><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4.1A8 8 0 1 1 20 11.5Z" /><path d="M9 8.5c.2-.3.4-.3.7-.2l1 .5c.2.1.3.3.2.5l-.5.7c.5.8 1.1 1.4 2 1.8l.7-.6c.2-.1.4-.1.6 0l.9.5c.3.2.3.4.2.7-.2.6-.7 1-1.4 1-1.1-.1-2.4-.8-3.4-1.7-1.1-1-1.8-2.2-1.8-3.1 0-.4.3-.7.8-1.1Z" /></svg>;
  }
}

function StateNotice({
  state,
  copy,
  onRetry
}: {
  readonly state: Exclude<PublicDeveloperProfileViewState, 'success' | 'not_found'>;
  readonly copy: PublicDevelopersCopy;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <section className="public-developer-profile__state" data-state={state}>
      <UxStateView state={state} title={text.title} message={text.body} retryLabel={copy.retryLabel} onRetry={onRetry}>
        {state === 'empty' || state === 'error' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
        {state === 'permission' ? <a className="public-developer-profile__state-link" href="/">{copy.permissionLink}</a> : null}
      </UxStateView>
    </section>
  );
}

function NotFoundNotice({ copy }: { readonly copy: PublicDevelopersCopy }) {
  return (
    <section className="public-developer-profile__state" data-state="not_found" role="alert">
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundBody}</p>
      <a className="public-developer-profile__state-link" href="/developers">{copy.notFoundLink}</a>
    </section>
  );
}

function ProfileHero({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const title = localizedText(data.name, locale) ?? data.slug;
  const description = localizedText(data.description, locale) ?? copy.noDescription;
  const locations = localizedValues(data.locations, locale);
  return (
    <>
      <section className="public-developer-profile__hero" aria-label={title}>
        <div className="public-developer-profile__hero-media">
          <PublicMediaImage src={data.imageUrl} alt={title} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} loading="eager" />
        </div>
      </section>
      <section className="public-developer-profile__identity" aria-labelledby="public-developer-profile-title">
        <div className="public-developer-profile__identity-actions">
          <a className="public-developer-profile__identity-action public-developer-profile__identity-action--primary" href="#developer-contact">
            <span>{copy.contactDeveloper}</span><ProfileIcon name="phone" />
          </a>
          <a className="public-developer-profile__identity-action public-developer-profile__identity-action--secondary" href="#developer-properties">
            <span>{copy.availableUnitsAction}</span><ProfileIcon name="unit" />
          </a>
        </div>
        <div className="public-developer-profile__identity-copy">
          <div className="public-developer-profile__identity-heading">
            <div className="public-developer-profile__badges">
              <span className="public-developer-profile__verified"><ProfileIcon name="check" />{copy.verified}</span>
              <span className="public-developer-profile__kind">{kindLabel(data.kind, copy)}</span>
            </div>
            <h1 id="public-developer-profile-title">{title}</h1>
          </div>
          <p>{description}</p>
          {locations.length > 0 ? <div className="public-developer-profile__identity-locations">{locations.map(location => <span key={location}>{location}</span>)}</div> : null}
        </div>
        <div className="public-developer-profile__identity-logo">
          {data.logoUrl ? <PublicMediaImage src={data.logoUrl} alt="" loading="eager" fallback={<span className="public-developer-profile__identity-logo-fallback" />} /> : <span className="public-developer-profile__identity-logo-fallback" aria-hidden="true" />}
          <span className="public-developer-profile__identity-logo-check"><ProfileIcon name="check" /></span>
          <a className="public-developer-profile__back" href="/developers">{copy.backToDirectory}</a>
        </div>
      </section>
    </>
  );
}

function ProfileMetric({ value, label, icon }: { readonly value: number; readonly label: string; readonly icon: IconName }) {
  return (
    <div className="public-developer-profile__metric">
      <ProfileIcon name={icon} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProfileAside({ data, copy }: { readonly data: PublicOrganizationProfile; readonly copy: PublicDevelopersCopy }) {
  const stats = data.stats;
  const areas = stats.activeAreas ?? data.activeAreas?.length ?? 0;
  const phone = data.contactPhone;
  const whatsapp = safePublicUrl(data.whatsappUrl);
  const contactCardTitle = copy.profileContact === 'التواصل' ? 'معلومات التواصل' : copy.profileContact;
  return (
    <aside className="public-developer-profile__aside">
      <section className="public-developer-profile__activity" aria-labelledby="developer-activity-title">
        <h2 id="developer-activity-title"><ProfileIcon name="project" />{copy.activitySummary}</h2>
        <div className="public-developer-profile__metrics">
          <ProfileMetric value={stats.availableUnits ?? stats.availableProperties} label={copy.availableUnits} icon="check" />
          <ProfileMetric value={stats.totalUnits ?? stats.availableProperties} label={copy.totalUnits} icon="unit" />
          <ProfileMetric value={stats.soldUnits ?? 0} label={copy.soldUnits} icon="unit" />
          <ProfileMetric value={stats.reservedUnits ?? 0} label={copy.reservedUnits} icon="calendar" />
          <ProfileMetric value={areas} label={copy.activeAreas} icon="location" />
          <ProfileMetric value={stats.publishedProjects} label={copy.projects} icon="project" />
        </div>
        <dl className="public-developer-profile__activity-meta">
          {stats.lastUpdated ? <div><dt>{copy.lastUpdated}</dt><dd>{stats.lastUpdated}</dd></div> : null}
          <div><dt>{copy.profileKind}</dt><dd>{kindLabel(data.kind, copy)}</dd></div>
          <div><dt>{copy.verified}</dt><dd><span className="public-developer-profile__verified-mini"><ProfileIcon name="check" />{copy.verified}</span></dd></div>
        </dl>
      </section>
      <section className="public-developer-profile__contact-card" aria-labelledby="developer-contact-card-title">
        <h2 id="developer-contact-card-title"><ProfileIcon name="phone" />{contactCardTitle}</h2>
        {phone ? <a href={'tel:' + phone}><ProfileIcon name="phone" />{phone}</a> : null}
        {whatsapp ? <a href={whatsapp}><ProfileIcon name="whatsapp" />{copy.contactWhatsapp}</a> : null}
        {!phone && !whatsapp ? <p>{copy.profileContactUnavailable}</p> : null}
        <a className="public-developer-profile__aside-cta" href="#developer-contact">{copy.sendInquiry}<ProfileIcon name="arrow" /></a>
      </section>
      <aside className="public-developer-profile__advisory" aria-label={copy.advisoryTitle}>
        <ProfileIcon name="shield" />
        <div><strong>{copy.advisoryTitle}</strong><p>{copy.advisoryBody}</p></div>
      </aside>
    </aside>
  );
}

function DetailTags({ title, values, icon }: { readonly title: string; readonly values: readonly string[]; readonly icon: IconName }) {
  if (values.length === 0) return null;
  return (
    <div className="public-developer-profile__detail-group">
      <h3><ProfileIcon name={icon} />{title}</h3>
      <div className="public-developer-profile__tags">{values.map(value => <span key={value}>{value}</span>)}</div>
    </div>
  );
}

function ProjectCard({ project, locale, copy }: { readonly project: PublicOrganizationProject; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const name = localizedText(project.name, locale) ?? project.slug;
  const description = localizedText(project.description, locale);
  const website = safePublicUrl(project.website);
  const projectUrl = website ?? '/properties?projectId=' + encodeURIComponent(project.id);
  const values: ReadonlyArray<readonly [string, string | undefined]> = [
    [copy.projectStatus, localizedText(project.statusLabel, locale)],
    [copy.projectUnits, project.unitCount === undefined ? undefined : String(project.unitCount)],
    [copy.projectArea, localizedText(project.areaLabel, locale)],
    [copy.projectPrice, localizedText(project.priceLabel, locale)],
    [copy.projectDelivery, localizedText(project.deliveryLabel, locale)]
  ];
  return (
    <article className="public-developer-profile__project-card">
      <div className="public-developer-profile__project-media">
        <PublicMediaImage src={project.imageUrl} alt={name} fallback={<span className="public-developer-profile__project-media-fallback" />} />
        {localizedText(project.statusLabel, locale) ? <span className="public-developer-profile__project-status">{localizedText(project.statusLabel, locale)}</span> : null}
      </div>
      <div className="public-developer-profile__project-content">
        {localizedText(project.locationName, locale) ? <span className="public-developer-profile__project-location"><ProfileIcon name="location" />{localizedText(project.locationName, locale)}</span> : null}
        <h3>{name}</h3>
        {description ? <p>{description}</p> : null}
        <div className="public-developer-profile__project-meta">
          {values.slice(1).map(([label, value]) => value ? <span key={label}><strong>{value}</strong><small>{label}</small></span> : null)}
        </div>
        {localizedText(project.priceLabel, locale) ? <p className="public-developer-profile__project-price">{localizedText(project.priceLabel, locale)}</p> : null}
        <a className="public-developer-profile__project-link" href={projectUrl} rel={website ? 'noreferrer' : undefined}>{copy.viewProject}<ProfileIcon name="arrow" /></a>
      </div>
    </article>
  );
}

function ProjectsSection({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return (
    <section className="public-developer-profile__section public-developer-profile__projects-section" id="developer-projects" aria-labelledby="public-developer-projects-title">
      <h2 id="public-developer-projects-title">{copy.profileProjects}</h2>
      {data.projects.length === 0 ? <p className="public-developer-profile__empty">{copy.noProjects}</p> : <div className="public-developer-profile__project-grid">{data.projects.map(project => <ProjectCard key={project.id} project={project} locale={locale} copy={copy} />)}</div>}
    </section>
  );
}

function PropertiesSection({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return (
    <section className="public-developer-profile__section public-developer-profile__properties-section" id="developer-properties" aria-labelledby="public-developer-properties-title">
      <div className="public-developer-profile__section-heading">
        <h2 id="public-developer-properties-title">{copy.availableUnitsTitle}</h2>
        {data.properties.length > 0 ? <a href="#developer-contact">{copy.availableUnitsAction}<ProfileIcon name="arrow" /></a> : null}
      </div>
      {data.properties.length === 0 ? <p className="public-developer-profile__empty public-developer-profile__empty--units"><ProfileIcon name="unit" />{copy.availableUnitsEmpty}</p> : (
        <div className="public-developer-profile__property-grid">
          {data.properties.map(property => {
            const name = localizedText(property.name, locale) ?? property.slug;
            return (
              <article className="public-developer-profile__property-card" key={property.id}>
                <PublicMediaImage src={property.imageUrl} alt={name} fallback={<span className="public-developer-profile__property-media-fallback" />} />
                <div className="public-developer-profile__badges"><span>{property.transactionType === 'sale' ? copy.sale : copy.rent}</span><span>{propertyLabel(property, copy)}</span></div>
                <h3><a className="public-developer-profile__project-link" href={'/properties/' + encodeURIComponent(property.slug)}>{name}</a></h3>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProfileOverview({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const description = localizedText(data.description, locale) ?? copy.noDescription;
  return (
    <section className="public-developer-profile__section public-developer-profile__overview-section" id="developer-overview" aria-labelledby="developer-overview-title">
      <h2 id="developer-overview-title">{copy.descriptionTitle}</h2>
      <div className="public-developer-profile__overview-card">
        <p>{description}</p>
        <div className="public-developer-profile__details">
          <DetailTags title={copy.activeAreasTitle} values={localizedValues(data.activeAreas, locale)} icon="location" />
          <DetailTags title={copy.projectTypesTitle} values={localizedValues(data.projectTypes, locale)} icon="project" />
          <DetailTags title={copy.propertyTypesTitle} values={localizedValues(data.propertyTypes, locale)} icon="unit" />
          <DetailTags title={copy.paymentPlansTitle} values={localizedValues(data.paymentPlans, locale)} icon="calendar" />
        </div>
      </div>
    </section>
  );
}

function ContactSection({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const whatsapp = safePublicUrl(data.whatsappUrl);
  return (
    <section className="public-developer-profile__contact" id="developer-contact" aria-labelledby="developer-contact-title">
      <h2 id="developer-contact-title">{copy.profileContact} {localizedText(data.name, locale) ?? data.slug}</h2>
      <form className="public-developer-profile__inquiry" action="/auth/login" method="get">
        <input type="hidden" name="returnTo" value={'/developers/' + data.slug + '#developer-contact'} />
        <label>{copy.fieldName}<input name="name" autoComplete="name" required /></label>
        <label>{copy.fieldPhone}<input name="phone" type="tel" autoComplete="tel" required placeholder="0100xxxxxxxx" /></label>
        <label className="public-developer-profile__inquiry-wide">{copy.fieldEmail}<input name="email" type="email" autoComplete="email" placeholder="example@mail.com" /></label>
        <label>{copy.fieldRequestType}<select name="requestType" defaultValue=""><option value=""> </option><option value="unit">{copy.availableUnits}</option><option value="project">{copy.profileProjects}</option></select></label>
        <label>{copy.fieldPreferredTime}<select name="preferredTime" defaultValue=""><option value=""> </option><option value="morning">09:00 - 12:00</option><option value="evening">16:00 - 20:00</option></select></label>
        <label className="public-developer-profile__inquiry-wide">{copy.fieldMessage}<textarea name="message" rows={4} required placeholder={copy.formNote} /></label>
        <div className="public-developer-profile__inquiry-actions">
          <button type="submit">{copy.sendInquiry}<ProfileIcon name="arrow" /></button>
          {whatsapp ? <a href={whatsapp} className="public-developer-profile__whatsapp-button"><ProfileIcon name="whatsapp" />{copy.contactWhatsapp}</a> : null}
        </div>
        <p className="public-developer-profile__form-note">{copy.formNote}</p>
      </form>
    </section>
  );
}

function ProfileSuccess({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return (
    <div className="public-developer-profile__content">
      <ProfileHero data={data} locale={locale} copy={copy} />
      <nav className="public-developer-profile__tabs" aria-label={copy.profileOverview}>
        <a className="is-active" href="#developer-overview">{copy.profileOverview}</a>
        <a href="#developer-projects">{copy.profileProjects}</a>
        <a href="#developer-properties">{copy.availableUnitsTitle}</a>
        <a href="#developer-contact">{copy.profileContact}</a>
      </nav>
      <div className="public-developer-profile__layout">
        <ProfileAside data={data} copy={copy} />
        <main className="public-developer-profile__main">
          <ProfileOverview data={data} locale={locale} copy={copy} />
          <ProjectsSection data={data} locale={locale} copy={copy} />
          <PropertiesSection data={data} locale={locale} copy={copy} />
          <ContactSection data={data} locale={locale} copy={copy} />
        </main>
      </div>
    </div>
  );
}

function Footer({ locale, copy }: { readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return <PublicSiteFooter locale={locale} description={copy.footerDescription} />;
}

export function PublicDeveloperProfile({
  url,
  locale,
  initialData,
  initialState,
  load = defaultPublicDeveloperProfileLoader
}: PublicDeveloperProfileProps) {
  const copy = getPublicDevelopersCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? '/developers' : window.location.href);
  const slug = publicDeveloperProfileSlugFromUrl(sourceUrl);
  const initialView: PublicDeveloperProfileViewState = initialData !== undefined ? 'success' : initialState ?? 'loading';
  const [data, setData] = useState<PublicOrganizationProfile | undefined>(initialData);
  const [view, setView] = useState<PublicDeveloperProfileViewState>(initialView);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    if (slug === undefined) {
      setView('not_found');
      return;
    }
    const controller = new AbortController();
    setView('loading');
    void load(slug, controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView('success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load, slug]);

  const retry = () => setAttempt(value => value + 1);

  return (
    <div className="public-developer-profile" data-page="public-developer-profile" data-developer-profile-state={view}>
      <PublicSiteHeader locale={locale} copy={getPublicHomepageCopy(locale)} activePath="/developers" />
      {view === 'success' && data !== undefined ? <ProfileSuccess data={data} locale={locale} copy={copy} /> : view === 'not_found' ? <NotFoundNotice copy={copy} /> : view === 'success' ? <StateNotice state="empty" copy={copy} onRetry={retry} /> : <StateNotice state={view} copy={copy} onRetry={retry} />}
      <Footer locale={locale} copy={copy} />
    </div>
  );
}
