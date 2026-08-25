import { useEffect, useState } from 'react';
import type {
  PublicOrganizationProfile,
  PublicOrganizationProperty,
  SupportedLocale
} from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Badge } from '../design_system/index.ts';
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
  const description = localizedText(data.description, locale);
  return (
    <section className="public-developer-profile__hero" aria-labelledby="public-developer-profile-title">
      <div className="public-developer-profile__hero-media">
        <PublicMediaImage src={data.imageUrl} alt={title} fallback={<UxStateView state="missing_image" title={copy.imageUnavailable} />} loading="eager" />
      </div>
      <div className="public-developer-profile__hero-body">
        <div className="public-developer-profile__badges">
          <Badge tone="success">{copy.verified}</Badge>
          <Badge tone="neutral">{kindLabel(data.kind, copy)}</Badge>
        </div>
        <h1 id="public-developer-profile-title">{title}</h1>
        {description === undefined ? <p className="public-developer-profile__hero-description">{copy.noDescription}</p> : <p className="public-developer-profile__hero-description">{description}</p>}
        <dl className="public-developer-profile__facts">
          <div className="public-developer-profile__fact"><dt>{copy.projects}</dt><dd>{data.projectCount}</dd></div>
          <div className="public-developer-profile__fact"><dt>{copy.properties}</dt><dd>{data.propertyCount}</dd></div>
        </dl>
      </div>
    </section>
  );
}

function ProjectsSection({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return (
    <section className="public-developer-profile__section" id="developer-projects" aria-labelledby="public-developer-projects-title">
      <h2 id="public-developer-projects-title">{copy.profileProjects}</h2>
      {data.projects.length === 0 ? <p className="public-developer-profile__empty">{copy.noProjects}</p> : (
        <div className="public-developer-profile__project-grid">
          {data.projects.map(project => {
            const name = localizedText(project.name, locale) ?? project.slug;
            const description = localizedText(project.description, locale);
            const website = safePublicUrl(project.website);
            return (
              <article className="public-developer-profile__project-card" key={project.id}>
                <PublicMediaImage src={project.imageUrl} alt={name} fallback={<span className="public-developer-profile__project-media-fallback" />} />
                <h3>{name}</h3>
                {description === undefined ? null : <p><strong>{copy.projectDescription}:</strong> {description}</p>}
                <p className="public-developer-profile__project-slug">{project.slug}</p>
                {website === undefined ? null : <div className="public-developer-profile__project-actions"><a className="public-developer-profile__project-link" href={website} rel="noreferrer">{copy.openWebsite}</a></div>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PropertiesSection({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return (
    <section className="public-developer-profile__section" id="developer-properties" aria-labelledby="public-developer-properties-title">
      <h2 id="public-developer-properties-title">{copy.profileProperties}</h2>
      {data.properties.length === 0 ? <p className="public-developer-profile__empty">{copy.noProperties}</p> : (
        <div className="public-developer-profile__property-grid">
          {data.properties.map(property => {
            const name = localizedText(property.name, locale) ?? property.slug;
            return (
              <article className="public-developer-profile__property-card" key={property.id}>
                <PublicMediaImage src={property.imageUrl} alt={name} fallback={<span className="public-developer-profile__property-media-fallback" />} />
                <div className="public-developer-profile__badges">
                  <Badge tone="brand">{property.transactionType === 'sale' ? copy.sale : copy.rent}</Badge>
                  <Badge tone="neutral">{propertyLabel(property, copy)}</Badge>
                </div>
                <h3><a className="public-developer-profile__project-link" href={`/properties/${encodeURIComponent(property.slug)}`}>{name}</a></h3>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProfileSuccess({ data, locale, copy }: { readonly data: PublicOrganizationProfile; readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) {
  return (
    <div className="public-developer-profile__content">
      <a className="public-developer-profile__back" href="/developers">{copy.backToDirectory}</a>
      <ProfileHero data={data} locale={locale} copy={copy} />
      <nav className="public-developer-profile__tabs" aria-label={copy.profileOverview}>
        <a href="#developer-overview">{copy.profileOverview}</a>
        <a href="#developer-projects">{copy.profileProjects}</a>
        <a href="#developer-properties">{copy.profileProperties}</a>
      </nav>
      <div className="public-developer-profile__sections">
        <section className="public-developer-profile__section" id="developer-overview" aria-labelledby="developer-overview-title">
          <h2 id="developer-overview-title">{copy.descriptionTitle}</h2>
          <p>{localizedText(data.description, locale) ?? copy.noDescription}</p>
        </section>
        <ProjectsSection data={data} locale={locale} copy={copy} />
        <PropertiesSection data={data} locale={locale} copy={copy} />
        <section className="public-developer-profile__contact" aria-labelledby="developer-contact-title">
          <h2 id="developer-contact-title">{copy.profileContact}</h2>
          <p>{copy.profileContactUnavailable}</p>
        </section>
      </div>
    </div>
  );
}

function Footer({ locale, copy }: { readonly locale: SupportedLocale; readonly copy: PublicDevelopersCopy }) { return <PublicSiteFooter locale={locale} description={copy.footerDescription} />; }

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
