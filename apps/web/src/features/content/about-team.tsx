import { useEffect, useState } from 'react';
import type { CmsPublicContent, CmsPublicContentListData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { PublicSiteHeader } from '../public/components.tsx';
import { getPublicHomepageCopy } from '../public/copy.ts';
import { localizedText } from '../public/model.ts';
import {
  defaultPublicAboutLoader,
  defaultPublicTeamLoader,
  type PublicContentListLoader
} from './about-team-data.ts';
import { getPublicAboutTeamCopy, type PublicAboutTeamCopy } from './about-team-copy.ts';
import './about-team.css';

export type PublicAboutTeamViewState = Extract<UxState, 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission'>;

export interface PublicAboutProps {
  readonly locale: SupportedLocale;
  readonly initialData?: CmsPublicContentListData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: PublicContentListLoader | undefined;
}

export interface PublicTeamProps {
  readonly locale: SupportedLocale;
  readonly initialData?: CmsPublicContentListData | undefined;
  readonly initialState?: 'loading' | 'retry' | undefined;
  readonly load?: PublicContentListLoader | undefined;
}

function errorState(error: unknown): PublicAboutTeamViewState {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.code === 'NETWORK_ERROR') return 'retry';
  return 'error';
}

function stateCopy(state: Exclude<PublicAboutTeamViewState, 'success'>, copy: PublicAboutTeamCopy): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'loading': return { title: copy.loadingTitle, body: copy.loadingBody };
    case 'empty': return { title: copy.emptyTitle, body: copy.emptyBody };
    case 'error': return { title: copy.errorTitle, body: copy.errorBody };
    case 'retry': return { title: copy.retryTitle, body: copy.retryBody };
    case 'permission': return { title: copy.permissionTitle, body: copy.permissionBody };
  }
}

function usePublicContent(
  initialData: CmsPublicContentListData | undefined,
  initialState: 'loading' | 'retry',
  load: PublicContentListLoader
): { readonly data: CmsPublicContentListData | undefined; readonly view: PublicAboutTeamViewState; readonly retry: () => void } {
  const [data, setData] = useState<CmsPublicContentListData | undefined>(initialData);
  const [view, setView] = useState<PublicAboutTeamViewState>(initialData === undefined ? initialState : initialData.items.length === 0 ? 'empty' : 'success');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialData !== undefined && attempt === 0) return;
    const controller = new AbortController();
    setView('loading');
    void load(controller.signal)
      .then(nextData => {
        if (controller.signal.aborted) return;
        setData(nextData);
        setView(nextData.items.length === 0 ? 'empty' : 'success');
      })
      .catch(error => {
        if (controller.signal.aborted || (error instanceof ApiClientError && error.code === 'ABORTED')) return;
        setView(errorState(error));
      });
    return () => controller.abort();
  }, [attempt, initialData, load]);

  return { data, view, retry: () => setAttempt(value => value + 1) };
}

function StateNotice({
  state,
  copy,
  onRetry
}: {
  readonly state: Exclude<PublicAboutTeamViewState, 'success'>;
  readonly copy: PublicAboutTeamCopy;
  readonly onRetry: () => void;
}) {
  const text = stateCopy(state, copy);
  return (
    <section className="public-about-team__state" data-state={state} aria-label={text.title}>
      <UxStateView state={state} title={text.title} message={text.body} retryLabel={copy.retryLabel} onRetry={onRetry}>
        {state === 'error' || state === 'empty' ? <button type="button" onClick={onRetry}>{copy.retryLabel}</button> : null}
        {state === 'permission' ? <a href="/">{copy.permissionLink}</a> : null}
      </UxStateView>
    </section>
  );
}

function Footer({ locale, copy }: { readonly locale: SupportedLocale; readonly copy: PublicAboutTeamCopy }) {
  const homepageCopy = getPublicHomepageCopy(locale);
  return (
    <footer className="public-homepage__footer public-about-team__footer">
      <div>
        <p className="public-homepage__eyebrow">{homepageCopy.brand}</p>
        <p>{copy.footerDescription}</p>
      </div>
      <div>
        <p className="public-homepage__footer-title">{copy.footerLinks}</p>
        <div className="public-homepage__footer-links">
          <a href="/">{homepageCopy.nav.home}</a>
          <a href="/properties">{homepageCopy.nav.properties}</a>
          <a href="/about">{homepageCopy.nav.about}</a>
          <a href="/team">{homepageCopy.nav.team}</a>
        </div>
      </div>
    </footer>
  );
}

function AboutBlocks({ locale, items }: { readonly locale: SupportedLocale; readonly items: readonly CmsPublicContent[] }) {
  return (
    <div className="public-about__blocks">
      {items.map(item => (
        <article className="public-about__block" key={item.key}>
          <p className="public-about__block-key">{item.key}</p>
          <h2>{localizedText(item.title, locale) ?? item.key}</h2>
          {localizedText(item.body, locale) === undefined ? null : <p>{localizedText(item.body, locale)}</p>}
        </article>
      ))}
    </div>
  );
}

function TeamCard({ locale, copy, member }: { readonly locale: SupportedLocale; readonly copy: PublicAboutTeamCopy; readonly member: CmsPublicContent }) {
  const name = localizedText(member.name, locale) ?? member.key;
  const role = localizedText(member.role, locale) ?? copy.roleUnavailable;
  const bio = localizedText(member.bio, locale) ?? copy.bioUnavailable;
  return (
    <article className="public-team__card">
      <div className="public-team__media" data-media-state="unavailable">
        <UxStateView state="missing_image" title={copy.imageUnavailable} />
      </div>
      <div className="public-team__card-body">
        <h2>{name}</h2>
        <p className="public-team__role">{role}</p>
        <p>{bio}</p>
      </div>
    </article>
  );
}

function AboutContent({ locale, copy, data }: { readonly locale: SupportedLocale; readonly copy: PublicAboutTeamCopy; readonly data: CmsPublicContentListData }) {
  return (
    <>
      <section className="public-about__hero" aria-labelledby="public-about-title">
        <p className="public-about__eyebrow">{copy.aboutEyebrow}</p>
        <h1 id="public-about-title">{copy.aboutTitle}</h1>
        <p>{copy.aboutSubtitle}</p>
      </section>
      <section className="public-about__content" aria-label={copy.aboutTitle}>
        <AboutBlocks locale={locale} items={data.items} />
      </section>
    </>
  );
}

function TeamContent({ locale, copy, data }: { readonly locale: SupportedLocale; readonly copy: PublicAboutTeamCopy; readonly data: CmsPublicContentListData }) {
  return (
    <>
      <section className="public-team__intro" aria-labelledby="public-team-title">
        <p className="public-team__eyebrow">{copy.teamEyebrow}</p>
        <h1 id="public-team-title">{copy.teamTitle}</h1>
        <p>{copy.teamSubtitle}</p>
      </section>
      <section className="public-team__content" aria-label={copy.teamTitle}>
        <div className="public-team__grid">
          {data.items.map(member => <TeamCard key={member.key} locale={locale} copy={copy} member={member} />)}
        </div>
      </section>
    </>
  );
}

export function PublicAbout({ locale, initialData, initialState = 'loading', load = defaultPublicAboutLoader }: PublicAboutProps) {
  const copy = getPublicAboutTeamCopy(locale);
  const homepageCopy = getPublicHomepageCopy(locale);
  const { data, view, retry } = usePublicContent(initialData, initialState, load);
  const state = view === 'success' ? 'empty' : view;
  return (
    <div className="public-about" data-page="public-about" data-about-state={view}>
      <PublicSiteHeader locale={locale} copy={homepageCopy} activePath="/about" />
      {view === 'success' && data !== undefined ? <AboutContent locale={locale} copy={copy} data={data} /> : <StateNotice state={state} copy={copy} onRetry={retry} />}
      <Footer locale={locale} copy={copy} />
    </div>
  );
}

export function PublicTeam({ locale, initialData, initialState = 'loading', load = defaultPublicTeamLoader }: PublicTeamProps) {
  const copy = getPublicAboutTeamCopy(locale);
  const homepageCopy = getPublicHomepageCopy(locale);
  const { data, view, retry } = usePublicContent(initialData, initialState, load);
  const state = view === 'success' ? 'empty' : view;
  return (
    <div className="public-team" data-page="public-team" data-team-state={view}>
      <PublicSiteHeader locale={locale} copy={homepageCopy} activePath="/team" />
      {view === 'success' && data !== undefined ? <TeamContent locale={locale} copy={copy} data={data} /> : <StateNotice state={state} copy={copy} onRetry={retry} />}
      <Footer locale={locale} copy={copy} />
    </div>
  );
}
