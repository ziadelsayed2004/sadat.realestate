import { WhatsAppIcon, usePublicContact } from './contact.tsx';
import { getWhatsAppLink, getWhatsAppUrl } from '../frontend_foundation/config.ts';
import { createPublicPropertyDetailsActions, type PublicPropertyDetailsActions } from './details-data.ts';
import { useContext, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type {
  PublicOrganizationProfile,
  PublicOrganizationProperty,
  PublicOrganizationProject,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { CustomSelect } from '../design_system/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { getPublicHomepageCopy } from './copy.ts';
import { PublicAuthRoleContext, PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from './components.tsx';
import {
  defaultPublicDeveloperProfileLoader,
  publicDeveloperProfileSlugFromUrl,
  publicDeveloperProjectSlugFromUrl,
  publicDeveloperProjectUrl,
  type PublicDeveloperProfileLoader
} from './developers-data.ts';
import { getPublicDevelopersCopy, type PublicDevelopersCopy } from './developers-copy.ts';
import { localizedText } from './model.ts';
import './developers.css';

export type PublicDeveloperProfileInitialState = 'loading' | 'retry' | 'not_found';
export type PublicDeveloperProfileViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'> | 'not_found';

export interface PublicDeveloperProfileProps {
  readonly authClient?: { getAuthorizationHeader(): string | undefined; refresh?(): Promise<unknown> } | undefined;
  readonly actions?: PublicPropertyDetailsActions | undefined;
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
  const common = { className: `public-developer-profile__icon public-developer-profile__icon--${name}`, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, focusable: 'false' as const, 'aria-hidden': true };
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
      return <WhatsAppIcon />;
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

function NotFoundNotice({ copy, locale, projectPage, slug }: { readonly copy: PublicDevelopersCopy; readonly locale: SupportedLocale; readonly projectPage: boolean; readonly slug: string | undefined }) {
  const ar = locale === 'ar';
  return <section className="public-developer-profile__state" data-state="not_found" role="alert">
    <h1>{projectPage ? ar ? 'المشروع غير متاح' : 'Project unavailable' : copy.notFoundTitle}</h1>
    <p>{projectPage ? ar ? 'المشروع غير منشور أو لم يعد متاحًا للعرض.' : 'This project is unpublished or no longer available.' : copy.notFoundBody}</p>
    <a className="public-developer-profile__state-link" href={projectPage && slug ? `/developers/${slug}?lang=${locale}` : '/developers'}>{projectPage ? ar ? 'العودة للمطور' : 'Back to developer' : copy.notFoundLink}</a>
  </section>;
}

function ProfileHero({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const title = localizedText(data.name, locale) ?? data.slug;
  const description = localizedText(data.description, locale);
  const locations = localizedValues(data.locations, locale);
  return (
    <section className="public-developer-profile__hero" aria-label={title}>
      <div className="public-developer-profile__hero-media">
        <PublicMediaImage src={data.imageUrl} alt={title} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} loading="eager" />
      </div>
      <div className="public-developer-profile__identity">
        <div className="public-developer-profile__identity-actions">
          <a className="public-developer-profile__identity-action public-developer-profile__identity-action--primary" href="#developer-contact"><ProfileIcon name="phone" />{copy.contactDeveloper}</a>
          <a className="public-developer-profile__identity-action public-developer-profile__identity-action--secondary" href="#developer-properties"><ProfileIcon name="unit" />{copy.availableUnitsAction}</a>
        </div>
        <div className="public-developer-profile__identity-copy">
          <div className="public-developer-profile__identity-heading">
            <div className="public-developer-profile__badges">
              <span className="public-developer-profile__verified"><ProfileIcon name="check" />{copy.verified}</span>
              <span className="public-developer-profile__kind">{kindLabel(data.kind, copy)}</span>
            </div>
            <h1 id="public-developer-profile-title">{title}</h1>
          </div>
          {description ? <p>{description}</p> : null}
          {locations.length > 0 ? <div className="public-developer-profile__identity-locations">{locations.map(location => <span key={location}><ProfileIcon name="location" />{location}</span>)}</div> : null}
        </div>
        <div className="public-developer-profile__identity-logo">
          {data.logoUrl ? <PublicMediaImage src={data.logoUrl} alt="" loading="eager" fallback={<span className="public-developer-profile__identity-logo-fallback" />} /> : <span className="public-developer-profile__identity-logo-fallback" aria-hidden="true" />}
          <span className="public-developer-profile__identity-logo-check"><ProfileIcon name="check" /></span>
          <a className="public-developer-profile__back" href="/developers"><ProfileIcon name="arrow" />{copy.backToDirectory}</a>
        </div>
      </div>
    </section>
  );
}

const PROFILE_SECTION_IDS = ['developer-overview', 'developer-projects', 'developer-properties', 'developer-contact'] as const;
type ProfileSectionId = typeof PROFILE_SECTION_IDS[number];

function ProfileTabs({ copy }: { readonly copy: PublicDevelopersCopy }) {
  const [activeSection, setActiveSection] = useState<ProfileSectionId>('developer-overview');

  useEffect(() => {
    const syncFromHash = () => {
      const section = window.location.hash.slice(1) as ProfileSectionId;
      if (PROFILE_SECTION_IDS.includes(section)) setActiveSection(section);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    if (typeof IntersectionObserver === 'undefined') {
      return () => window.removeEventListener('hashchange', syncFromHash);
    }
    const sections = PROFILE_SECTION_IDS.map(id => document.getElementById(id)).filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (visible && PROFILE_SECTION_IDS.includes(visible.target.id as ProfileSectionId)) setActiveSection(visible.target.id as ProfileSectionId);
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0.05, 0.25, 0.5] });
    sections.forEach(section => observer.observe(section));
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  const link = (id: ProfileSectionId, label: string) => (
    <a className={activeSection === id ? 'is-active' : undefined} aria-current={activeSection === id ? 'location' : undefined} href={`#${id}`} onClick={() => setActiveSection(id)}>{label}</a>
  );
  return (
    <nav className="public-developer-profile__tabs" aria-label={copy.profileOverview}>
      {link('developer-overview', copy.profileOverview)}
      {link('developer-projects', copy.profileProjects)}
      {link('developer-properties', copy.profileProperties)}
      {link('developer-contact', copy.profileContact)}
    </nav>
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


function ProjectCard({ project, developerSlug, detail = false, locale, copy }: { readonly project: PublicOrganizationProject; readonly developerSlug: string; readonly detail?: boolean; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  const anchorId = `project-${project.slug}`;
  const name = localizedText(project.name, locale) ?? project.slug;
  const description = localizedText(project.description, locale);
  const website = safePublicUrl(project.website);
  const projectType = localizedText(project.projectType, locale);
  const meta: ReadonlyArray<readonly [string, string | undefined]> = [
    [copy.projectUnits, project.unitCount === undefined ? undefined : String(project.unitCount)],
    ['', localizedText(project.areaLabel, locale)],
    ['', projectType]
  ];
  return (
    <article className="public-developer-profile__project-card" id={anchorId} data-project-detail={detail || undefined}>
      <div className="public-developer-profile__project-media">
        <PublicMediaImage src={project.imageUrl} alt={name} fallback={<span className="public-developer-profile__project-media-fallback" />} />
        {localizedText(project.statusLabel, locale) ? <span className="public-developer-profile__project-status">{localizedText(project.statusLabel, locale)}</span> : null}
      </div>
      <div className="public-developer-profile__project-content">
        {localizedText(project.locationName, locale) ? <span className="public-developer-profile__project-location"><ProfileIcon name="location" />{localizedText(project.locationName, locale)}</span> : null}
        {detail ? <h1>{name}</h1> : <h3>{name}</h3>}
        <div className="public-developer-profile__project-meta">
          {meta.map(([label, value], index) => value ? <span key={`${label}-${index}`}><strong>{value}</strong>{label ? <small>{label}</small> : null}</span> : null)}
        </div>
        {localizedText(project.deliveryLabel, locale) ? <p className="public-developer-profile__project-delivery"><ProfileIcon name="calendar" />{localizedText(project.deliveryLabel, locale)}</p> : null}
        {localizedText(project.priceLabel, locale) ? <p className="public-developer-profile__project-price">{localizedText(project.priceLabel, locale)}</p> : null}
        {detail ? <div className="public-developer-profile__overview-content">
          {description ? <p>{description}</p> : <p>{copy.noDescription}</p>}
          {website ? <a href={website} rel="noopener noreferrer" target="_blank">{copy.openWebsite}</a> : null}
        </div> : <a className="public-developer-profile__project-link" href={`${publicDeveloperProjectUrl(developerSlug, project.slug)}?lang=${locale}`}>{copy.viewProject}<ProfileIcon name="arrow" /></a>}
      </div>
    </article>
  );
}

function ProjectsSection({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return (
    <section className="public-developer-profile__section public-developer-profile__projects-section" id="developer-projects" aria-labelledby="public-developer-projects-title">
      <h2 id="public-developer-projects-title">{copy.projectsSectionTitle}</h2>
      {data.projects.length === 0 ? <p className="public-developer-profile__empty">{copy.noProjects}</p> : <div className="public-developer-profile__project-grid">{data.projects.map(project => <ProjectCard key={project.id} project={project} developerSlug={data.slug} locale={locale} copy={copy} />)}</div>}
    </section>
  );
}

function PropertiesSection({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return (
    <section className="public-developer-profile__section public-developer-profile__properties-section" id="developer-properties" aria-labelledby="public-developer-properties-title">
      <div className="public-developer-profile__section-heading">
        <h2 id="public-developer-properties-title">{copy.availableUnitsTitle}</h2>
        <a href="#developer-contact">{copy.availableUnitsAction}<ProfileIcon name="arrow" /></a>
      </div>
      {data.properties.length === 0 ? <p className="public-developer-profile__empty public-developer-profile__empty--units"><ProfileIcon name="unit" />{copy.availableUnitsEmpty}</p> : (
        <div className="public-developer-profile__property-grid">
          {data.properties.map(property => {
            const name = localizedText(property.name, locale) ?? property.slug;
            return (
              <article className="public-developer-profile__property-card" key={property.id}>
                <PublicMediaImage src={property.imageUrl} alt={name} fallback={<span className="public-developer-profile__property-media-fallback" />} />
                <div className="public-developer-profile__badges"><span>{property.transactionType === 'sale' ? copy.sale : copy.rent}</span><span>{propertyLabel(property, copy)}</span></div>
                <h3><a className="public-developer-profile__project-link" href={'/properties/' + encodeURIComponent(property.slug) + '?lang=' + locale}>{name}</a></h3>
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
  const groups: ReadonlyArray<readonly [string, readonly LocalizedValue[] | undefined, IconName]> = [
    [copy.activeAreasTitle, data.activeAreas, 'location'],
    [copy.projectTypesTitle, data.projectTypes, 'project'],
    [copy.propertyTypesTitle, data.propertyTypes, 'unit'],
    [copy.paymentPlansTitle, data.paymentPlans, 'check']
  ];
  return (
    <section className="public-developer-profile__section public-developer-profile__overview-section" id="developer-overview" aria-labelledby="developer-overview-title">
      <h2 id="developer-overview-title">{copy.descriptionTitle}</h2>
      <div className="public-developer-profile__overview-content">
        <p>{description}</p>
        <div className="public-developer-profile__details">
          {groups.map(([title, values, icon]) => {
            const labels = localizedValues(values, locale);
            return labels.length > 0 ? <div className="public-developer-profile__detail-group" key={title}><h3><ProfileIcon name={icon} />{title}</h3><div className="public-developer-profile__tags">{labels.map(label => <span key={label}>{label}</span>)}</div></div> : null;
          })}
        </div>
      </div>
    </section>
  );
}

function ProfileAside({ data, copy, compact = false }: { readonly data: PublicOrganizationProfile; readonly copy: PublicDevelopersCopy; readonly compact?: boolean }) {
  const stats = data.stats;
  const areas = stats.activeAreas ?? data.activeAreas?.length ?? 0;
  const metricRows: ReadonlyArray<readonly [number, string, IconName]> = [
    [stats.availableUnits ?? stats.availableProperties, copy.availableUnits, 'unit'],
    [stats.totalUnits ?? 0, copy.totalUnits, 'unit'],
    [stats.soldUnits ?? 0, copy.soldUnits, 'unit'],
    [stats.reservedUnits ?? 0, copy.reservedUnits, 'calendar'],
    [areas, copy.activeAreas, 'location'],
    [stats.publishedProjects, copy.projects, 'project']
  ];
  const phone = data.contactPhone;
  const whatsapp = getWhatsAppUrl(data.whatsappUrl);
  const hasContactDetails = Boolean(phone || data.contactAddress || whatsapp);
  return (
    <aside className="public-developer-profile__aside">
      {compact ? null : <section className="public-developer-profile__activity" aria-labelledby="developer-activity-title">
        <h2 id="developer-activity-title"><ProfileIcon name="project" />{copy.activitySummary}</h2>
        <div className="public-developer-profile__metrics">{metricRows.map(([value, label, icon]) => <ProfileMetric key={label} value={value} label={label} icon={icon} />)}</div>
        <dl className="public-developer-profile__activity-meta">
          <div><dt>{copy.lastUpdated}</dt><dd>{stats.lastUpdated ?? '—'}</dd></div>
          <div><dt>{copy.profileKind}</dt><dd>{kindLabel(data.kind, copy)}</dd></div>
          <div><dt>{copy.verified}</dt><dd className="public-developer-profile__verified-mini"><ProfileIcon name="check" />{copy.verified}</dd></div>
        </dl>
      </section>}
      <section className="public-developer-profile__contact-card" aria-labelledby="developer-contact-card-title">
        <h2 id="developer-contact-card-title"><ProfileIcon name="phone" />{copy.profileContact}</h2>
        {phone ? <a href={`tel:${phone}`}><ProfileIcon name="phone" />{phone}</a> : null}
        {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer"><ProfileIcon name="whatsapp" />{copy.contactWhatsappAvailable}</a> : null}
        <a className="public-developer-profile__aside-cta" href="#developer-contact"><ProfileIcon name="mail" />{hasContactDetails ? copy.sendInquiry : copy.profileContact}</a>
      </section>
      <div className="public-developer-profile__advisory"><ProfileIcon name="shield" /><div><strong>{copy.advisoryTitle}</strong><p>{copy.advisoryBody}</p></div></div>
    </aside>
  );
}

function ContactSection({ data, locale, copy, actions, projectId = '' }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy; readonly actions: PublicPropertyDetailsActions; readonly projectId?: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'permission' | 'forbidden' | 'error'>('idle');
  const role = useContext(PublicAuthRoleContext);
  const [requestId, setRequestId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state === 'success' || state === 'permission' || state === 'forbidden' || state === 'error') feedback.current?.scrollIntoView?.({ block: 'nearest' });
  }, [state]);
  const [channel, setChannel] = useState<'provider' | 'platform'>('provider');
  const platform = usePublicContact();
  const ar = locale === 'ar';
  const companyName = localizedText(data.name, locale) ?? data.slug;
  const profileLink = typeof window === 'undefined' ? `/developers/${data.slug}?lang=${locale}` : new URL(`/developers/${data.slug}?lang=${locale}`, window.location.origin).href;
  const whatsapp = channel === 'provider' ? getWhatsAppUrl(data.whatsappUrl, `${companyName} ${profileLink}`) : getWhatsAppLink(`${companyName} ${profileLink}`, platform.whatsappNumber);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'submitting' || state === 'success') return;
    const fields = new FormData(event.currentTarget);
    setState('submitting');
    try {
      const projectId = String(fields.get('projectId') ?? '');
      const result = await actions.submitContact({
        fullName: fullName.trim(), phone: phone.trim(),
        preferredContactTime: String(fields.get('preferredTime') ?? 'morning') as 'morning' | 'evening',
        message: message.trim(), organizationId: data.id, contactChannel: channel,
        ...(projectId ? { projectId } : {}), locale
      });
      setRequestId(result.id); setState('success');
    } catch (error) {
      setState(error instanceof ApiClientError && error.status === 401 ? 'permission' : error instanceof ApiClientError && error.status === 403 ? 'forbidden' : 'error');
    }
  }
  return (
    <section className="public-developer-profile__contact" id="developer-contact" aria-labelledby="developer-contact-title">
      <h2 id="developer-contact-title">{copy.profileInquiryTitle(companyName)}</h2>
      <form className="public-developer-profile__inquiry" onSubmit={event => { void submit(event); }} onChange={() => { if (state === 'success') setState('idle'); }} aria-busy={state === 'submitting'}>
        <label className="public-developer-profile__inquiry-wide"><span>{ar ? 'جهة التواصل' : 'Send inquiry to'}</span><CustomSelect name="contactChannel" value={channel} onChange={value => { setChannel(value as 'provider' | 'platform'); setState('idle'); }} ariaLabel={ar ? 'جهة التواصل' : 'Send inquiry to'} options={[{ value: 'provider', label: companyName }, { value: 'platform', label: ar ? 'إدارة عقارات السادات' : 'Sadat Real Estate team' }]} /></label>
        <p className="public-developer-profile__inquiry-wide">{channel === 'provider' ? (ar ? 'يصل الاستفسار للشركة. تابع الرد من حسابك.' : 'Your inquiry goes to the company. Track it in your account.') : (ar ? 'تستقبل إدارة المنصة الاستفسار وتتابع مع الشركة.' : 'The platform follows up with the company for you.')}</p>
        <label><span>{copy.fieldName} *</span><input name="name" autoComplete="name" required maxLength={160} value={fullName} onChange={event => setFullName(event.target.value)} /></label>
        <label><span>{copy.fieldPhone} *</span><input name="phone" type="tel" dir="ltr" autoComplete="tel" required maxLength={40} placeholder="010xxxxxxxx" value={phone} onChange={event => setPhone(event.target.value)} /></label>
        {data.projects.length ? <label>{copy.profileProjects}<CustomSelect name="projectId" defaultValue={projectId} placeholder={ar ? 'اختياري' : 'Optional'} ariaLabel={copy.profileProjects} options={data.projects.map(project => ({ value: project.id, label: localizedText(project.name, locale) ?? project.slug }))} /></label> : null}
        <label>{copy.fieldPreferredTime}<CustomSelect name="preferredTime" defaultValue="morning" ariaLabel={copy.fieldPreferredTime} options={[{ value: 'morning', label: ar ? 'صباحاً' : 'Morning' }, { value: 'evening', label: ar ? 'مساءً' : 'Evening' }]} /></label>
        <label className="public-developer-profile__inquiry-wide">{copy.fieldMessage}<textarea name="message" rows={4} required maxLength={2000} placeholder={copy.messagePlaceholder} value={message} onChange={event => setMessage(event.target.value)} /></label>
        <div className="public-developer-profile__inquiry-actions">
          <button type="submit" disabled={state === 'submitting' || state === 'success'}>{state === 'submitting' ? (ar ? 'جارٍ الإرسال…' : 'Sending…') : copy.sendInquiry}<ProfileIcon name="arrow" /></button>
          {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="public-developer-profile__whatsapp-button"><ProfileIcon name="whatsapp" />{channel === 'provider' ? copy.contactWhatsapp : (ar ? 'واتساب المنصة' : 'Platform WhatsApp')}</a> : null}
        </div>
        {state === 'success' ? <p ref={feedback} className="public-developer-profile__inquiry-wide" role="status" aria-live="polite">{ar ? 'تم إرسال طلبك بنجاح.' : 'Your inquiry was sent successfully.'} <a href={`${role === 'provider' ? `/provider/customer-requests?search=${requestId}&` : `/seeker/requests/${requestId}?`}lang=${locale}`}>{ar ? 'متابعة الطلب' : 'Track inquiry'}</a></p> : null}
        {state === 'permission' ? <p ref={feedback} className="public-developer-profile__inquiry-wide" role="alert">{ar ? 'سجّل الدخول لإرسال الاستفسار، أو تواصل عبر واتساب.' : 'Sign in to send an inquiry, or use WhatsApp.'} <a href={`/auth/login?lang=${locale}`}>{ar ? 'تسجيل الدخول' : 'Sign in'}</a></p> : null}
        {state === 'forbidden' ? <p ref={feedback} className="public-developer-profile__inquiry-wide" role="alert">{ar ? 'حسابك لا يملك صلاحية إرسال الطلب. لم يتم تسجيل خروجك.' : 'Your account cannot send this inquiry. You are still signed in.'}</p> : null}
        {state === 'error' ? <p ref={feedback} className="public-developer-profile__inquiry-wide" role="alert">{ar ? 'تعذر الإرسال. راجع الهاتف وحاول مجددًا؛ بياناتك محفوظة.' : 'Could not send. Check the phone and retry; your entries are kept.'}</p> : null}
      </form>
    </section>
  );
}

function ProfileSuccess({ data, locale, copy, actions }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy; readonly actions: PublicPropertyDetailsActions }) {
  return (
    <div className="public-developer-profile__content">
      <ProfileHero data={data} locale={locale} copy={copy} />
      <ProfileTabs copy={copy} />
      <div className="public-developer-profile__layout">
        <ProfileAside data={data} copy={copy} />
        <div className="public-developer-profile__main">
          <ProfileOverview data={data} locale={locale} copy={copy} />
          <ProjectsSection data={data} locale={locale} copy={copy} />
          <PropertiesSection data={data} locale={locale} copy={copy} />
          <ContactSection data={data} locale={locale} copy={copy} actions={actions} />
        </div>
      </div>
    </div>
  );
}

function ProjectSuccess({ data, project, locale, copy, actions }: { readonly data: PublicOrganizationProfile; readonly project: PublicOrganizationProject; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy; readonly actions: PublicPropertyDetailsActions }) {
  const projectData = { ...data, projects: [project], properties: data.properties.filter(property => property.projectId === project.id) };
  return <div className="public-developer-profile__content">
    <nav className="public-developer-profile__tabs" aria-label={copy.profileProjects}>
      <a href={`/developers/${data.slug}?lang=${locale}#developer-projects`}>{localizedText(data.name, locale) ?? data.slug}</a>
      <a href="#developer-properties">{copy.availableUnitsTitle}</a>
      <a href="#developer-contact">{copy.profileContact}</a>
    </nav>
    <div className="public-developer-profile__layout">
      <ProfileAside data={data} copy={copy} compact />
      <div className="public-developer-profile__main">
        <ProjectCard project={project} developerSlug={data.slug} detail locale={locale} copy={copy} />
        <PropertiesSection data={projectData} locale={locale} copy={copy} />
        <ContactSection data={projectData} projectId={project.id} locale={locale} copy={copy} actions={actions} />
      </div>
    </div>
  </div>;
}

function Footer({ locale, copy }: { readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return <PublicSiteFooter locale={locale} description={copy.footerDescription} />;
}

export function PublicDeveloperProfile({
  url,
  locale,
  initialData,
  initialState,
  load = defaultPublicDeveloperProfileLoader,
  authClient,
  actions
}: PublicDeveloperProfileProps) {
  const resolvedActions = useMemo(() => actions ?? createPublicPropertyDetailsActions({ authorizationHeader: () => authClient?.getAuthorizationHeader(), refreshSession: authClient?.refresh ? () => authClient.refresh!() : undefined }), [actions, authClient]);
  const copy = getPublicDevelopersCopy(locale);
  const sourceUrl = url ?? (typeof window === 'undefined' ? '/developers' : window.location.href);
  const slug = publicDeveloperProfileSlugFromUrl(sourceUrl);
  const projectPage = new URL(sourceUrl, 'http://sadat-real-estate.local').pathname.split('/').filter(Boolean).length === 4;
  const projectSlug = publicDeveloperProjectSlugFromUrl(sourceUrl);
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
  const project = data?.projects.find(value => value.slug === projectSlug);
  const missingProject = projectPage && view === 'success' && project === undefined;

  return (
    <div className="public-developer-profile" data-page={projectPage ? 'public-project-details' : 'public-developer-profile'} data-developer-profile-state={missingProject ? 'not_found' : view}>
      <PublicSiteHeader locale={locale} copy={getPublicHomepageCopy(locale)} activePath="/developers" />
      {view === 'not_found' || missingProject ? <NotFoundNotice copy={copy} locale={locale} projectPage={projectPage} slug={slug} /> : view === 'success' && data !== undefined ? projectPage && project ? <ProjectSuccess data={data} project={project} locale={locale} copy={copy} actions={resolvedActions} /> : <ProfileSuccess data={data} locale={locale} copy={copy} actions={resolvedActions} /> : view === 'success' ? <StateNotice state="empty" copy={copy} onRetry={retry} /> : <StateNotice state={view} copy={copy} onRetry={retry} />}
      <Footer locale={locale} copy={copy} />
    </div>
  );
}
