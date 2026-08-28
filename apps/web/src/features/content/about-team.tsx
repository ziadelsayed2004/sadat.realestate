import { useEffect, useState } from 'react';
import type { CmsPublicContent, CmsPublicContentListData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { UxStateView, type UxState } from '../ux_states/index.ts';
import { PublicMediaImage, PublicSiteFooter, PublicSiteHeader } from '../public/components.tsx';
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

type IconKind = 'search' | 'phone' | 'shield' | 'eye' | 'check' | 'document' | 'tag' | 'bolt' | 'whatsapp';

function Icon({ kind }: { readonly kind: IconKind }) {
  const common = { viewBox: '0 0 24 24', focusable: false, 'aria-hidden': true } as const;
  switch (kind) {
    case 'search': return <svg {...common}><circle cx="10.5" cy="10.5" r="5.8" /><path d="m15 15 4.2 4.2" /></svg>;
    case 'phone': return <svg {...common}><path d="M7.2 4.5 10 6.2 8.5 9a14.2 14.2 0 0 0 6.5 6.5l2.8-1.5 1.7 2.8-1.8 2a2 2 0 0 1-2 .5C9.6 17.5 6.5 14.4 4.7 8.3a2 2 0 0 1 .5-2l2-1.8Z" /></svg>;
    case 'shield': return <svg {...common}><path d="M12 3 19 6v5.5c0 4.5-2.8 7.7-7 9.5-4.2-1.8-7-5-7-9.5V6l7-3Z" /><path d="m8.7 12 2.1 2.1 4.5-4.5" /></svg>;
    case 'eye': return <svg {...common}><path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" /><circle cx="12" cy="12" r="2" /></svg>;
    case 'check': return <svg {...common}><path d="m5 12.5 4.2 4.2L19 7" /></svg>;
    case 'document': return <svg {...common}><path d="M7 3h7l4 4v14H7V3Z" /><path d="M14 3v5h4M9.5 12h5M9.5 15h5" /></svg>;
    case 'tag': return <svg {...common}><path d="m4 5 8.2-.5L20 12.3 12.3 20 4.5 12.2 4 5Z" /><circle cx="8" cy="8" r="1" /></svg>;
    case 'bolt': return <svg {...common}><path d="m13.5 2-8 11h6l-1 9 8-11h-6l1-9Z" /></svg>;
    case 'whatsapp': return <svg {...common}><path d="M12 4a7.5 7.5 0 0 0-6.5 11.3L4.5 19l3.8-1A7.5 7.5 0 1 0 12 4Z" /><path d="M9.3 8.8c.2-.3.4-.3.7-.2l.7 1.6c.1.2.1.4-.1.6l-.5.5c.5 1 1.2 1.7 2.3 2.2l.6-.6c.2-.2.4-.2.7-.1l1.5.7c.2.1.3.3.2.6-.2.7-.7 1.1-1.4 1.2-1.1.1-2.8-.7-4.1-2-1.2-1.2-2.1-2.7-2-3.9 0-.3.1-.5.4-.6Z" /></svg>;
  }
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

type AboutUi = {
  readonly heroBody: string;
  readonly howEyebrow: string;
  readonly howTitle: string;
  readonly valuesEyebrow: string;
  readonly valuesTitle: string;
  readonly statsEyebrow: string;
  readonly statsTitle: string;
  readonly browse: string;
  readonly whatsapp: string;
  readonly steps: ReadonlyArray<{ readonly number: string; readonly label: string; readonly detail: string; readonly icon: IconKind }>;
  readonly values: ReadonlyArray<{ readonly label: string; readonly detail: string; readonly icon: IconKind }>;
  readonly stats: ReadonlyArray<{ readonly value: string; readonly label: string }>;
};

function getAboutUi(locale: SupportedLocale, copy: PublicAboutTeamCopy): AboutUi {
  if (locale === 'ar') return {
    heroBody: '\u0623\u0646\u0634\u0623\u0646\u0627 \u0647\u0630\u0647 \u0627\u0644\u0645\u0646\u0635\u0629 \u0644\u0623\u0646 \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0642\u0627\u0631\u064a \u0641\u064a \u0645\u062f\u064a\u0646\u0629 \u0627\u0644\u0633\u0627\u062f\u0627\u062a \u064a\u062d\u062a\u0627\u062c \u0645\u0646\u0635\u0629 \u0645\u062a\u062e\u0635\u0635\u0629 \u0648\u0645\u0648\u062b\u0648\u0642\u0629.',
    howEyebrow: '\u0643\u064a\u0641 \u0646\u0639\u0645\u0644', howTitle: '\u0631\u062d\u0644\u062a\u0643 \u0645\u0639\u0646\u0627 \u062e\u0637\u0648\u0629 \u0628\u062e\u0637\u0648\u0629',
    valuesEyebrow: '\u0642\u064a\u0645\u0646\u0627', valuesTitle: '\u0645\u0627 \u064a\u0645\u064a\u0632\u0646\u0627 \u0639\u0646 \u063a\u064a\u0631\u0646\u0627',
    statsEyebrow: '\u0623\u0631\u0642\u0627\u0645\u0646\u0627', statsTitle: '\u0625\u0646\u062c\u0627\u0632\u0627\u062a \u062a\u062a\u062d\u062f\u062b \u0639\u0646 \u0646\u0641\u0633\u0647\u0627',
    browse: '\u062a\u0635\u0641\u062d \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a', whatsapp: '\u0648\u0627\u062a\u0633\u0627\u0628',
    steps: [
      { number: '01', label: '\u0627\u0644\u0628\u062d\u062b', detail: '\u0628\u062d\u062b \u0639\u0646 \u0628\u0646\u0627\u0621 \u0627\u0644\u0639\u0642\u0627\u0631', icon: 'search' },
      { number: '02', label: '\u0627\u0644\u062a\u0648\u0627\u0635\u0644', detail: '\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0627\u0644\u0643 \u0645\u0628\u0627\u0634\u0631\u0629', icon: 'phone' },
      { number: '03', label: '\u0627\u0644\u062a\u062d\u0642\u0642', detail: '\u0646\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', icon: 'shield' },
      { number: '04', label: '\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629', detail: '\u0632\u064a\u0627\u0631\u0629 \u0627\u0644\u0639\u0642\u0627\u0631 \u0645\u062c\u0627\u0646\u0627\u064b', icon: 'eye' },
      { number: '05', label: '\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629', detail: '\u0646\u062a\u0627\u0628\u0639 \u062d\u062a\u0649 \u0627\u0644\u062a\u0633\u062c\u064a\u0644', icon: 'check' }
    ],
    values: [
      { label: '\u0648\u0636\u0648\u062d', detail: '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0634\u0627\u0645\u0644\u0629 \u0648\u062f\u0642\u064a\u0642\u0629 \u0644\u0643\u0644 \u0639\u0642\u0627\u0631', icon: 'document' },
      { label: '\u062b\u0642\u0629', detail: '\u0643\u0644 \u0639\u0642\u0627\u0631 \u064a\u0645\u0631 \u0628\u0639\u0645\u0644\u064a\u0629 \u062a\u062d\u0642\u0642', icon: 'shield' },
      { label: '\u062a\u0646\u0638\u064a\u0645', detail: '\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0648\u0627\u0636\u062d\u0629 \u0648\u0633\u0647\u0644\u0629', icon: 'tag' },
      { label: '\u0633\u0631\u0639\u0629', detail: '\u0641\u0631\u064a\u0642 \u0645\u062a\u0627\u062d \u0637\u0648\u0627\u0644 \u0627\u0644\u0623\u0633\u0628\u0648\u0639', icon: 'bolt' }
    ],
    stats: [
      { value: '+1,200', label: '\u0639\u0642\u0627\u0631 \u0645\u062f\u0631\u062c' }, { value: '18', label: '\u0645\u0646\u0637\u0642\u0629 \u0645\u063a\u0637\u0627\u0629' },
      { value: '+3,500', label: '\u0637\u0644\u0628 \u0641\u0639\u0627\u0644' }, { value: '342K+', label: '\u0633\u0627\u0643\u0646' }
    ]
  };
  const english = locale === 'en';
  return {
    heroBody: english ? 'We built this platform because Sadat City needs a specialized and trusted real-estate marketplace.' : copy.aboutSubtitle,
    howEyebrow: english ? 'How it works' : '\u5982\u4f55\u5de5\u4f5c', howTitle: english ? 'Your journey with us, step by step' : '\u4e0e\u6211\u4eec\u4e00\u8d77\u4e00\u6b65\u4e00\u6b65',
    valuesEyebrow: english ? 'Our values' : '\u6211\u4eec\u7684\u4ef7\u503c', valuesTitle: english ? 'What makes us different' : '\u8ba9\u6211\u4eec\u4e0e\u4f17\u4e0d\u540c',
    statsEyebrow: english ? 'Our numbers' : '\u6211\u4eec\u7684\u6570\u5b57', statsTitle: english ? 'Achievements that speak for themselves' : '\u7528\u6210\u7ee9\u8bf4\u8bdd',
    browse: english ? 'Browse properties' : '\u6d4f\u89c8\u623f\u4ea7', whatsapp: 'WhatsApp',
    steps: [
      { number: '01', label: english ? 'Search' : '\u641c\u7d22', detail: english ? 'Find your property' : '\u67e5\u627e\u623f\u4ea7', icon: 'search' },
      { number: '02', label: english ? 'Connect' : '\u8054\u7cfb', detail: english ? 'Contact the owner directly' : '\u76f4\u63a5\u4e0e\u4e1a\u4e3b\u8054\u7cfb', icon: 'phone' },
      { number: '03', label: english ? 'Verify' : '\u9a8c\u8bc1', detail: english ? 'We verify the information' : '\u9a8c\u8bc1\u6570\u636e', icon: 'shield' },
      { number: '04', label: english ? 'Visit' : '\u67e5\u770b', detail: english ? 'Visit the property' : '\u514d\u8d39\u53c2\u89c2\u623f\u4ea7', icon: 'eye' },
      { number: '05', label: english ? 'Follow-up' : '\u8ddf\u8fdb', detail: english ? 'We follow through to registration' : '\u8ddf\u8fdb\u5230\u767b\u8bb0', icon: 'check' }
    ],
    values: [
      { label: english ? 'Clarity' : '\u6e05\u6670', detail: english ? 'Complete and accurate property information' : '\u5b8c\u6574\u51c6\u786e\u7684\u623f\u4ea7\u4fe1\u606f', icon: 'document' },
      { label: english ? 'Trust' : '\u4fe1\u4efb', detail: english ? 'Every property goes through verification' : '\u6bcf\u5957\u623f\u4ea7\u90fd\u7ecf\u8fc7\u9a8c\u8bc1', icon: 'shield' },
      { label: english ? 'Organization' : '\u7ec4\u7ec7', detail: english ? 'Clear, easy-to-use categories' : '\u6e05\u6670\u6613\u7528\u7684\u5206\u7c7b', icon: 'tag' },
      { label: english ? 'Speed' : '\u901f\u5ea6', detail: english ? 'A team available throughout the week' : '\u5168\u5468\u90fd\u6709\u56e2\u961f\u53ef\u7528', icon: 'bolt' }
    ],
    stats: [
      { value: '+1,200', label: english ? 'Listed properties' : '\u5df2\u5217\u51fa\u623f\u4ea7' }, { value: '18', label: english ? 'Covered areas' : '\u8986\u76d6\u533a\u57df' },
      { value: '+3,500', label: english ? 'Active requests' : '\u6709\u6548\u8bf7\u6c42' }, { value: '342K+', label: english ? 'Residents' : '\u5c45\u6c11' }
    ]
  };
}

function AboutContent({ locale, copy, data }: { readonly locale: SupportedLocale; readonly copy: PublicAboutTeamCopy; readonly data: CmsPublicContentListData }) {
  const ui = getAboutUi(locale, copy);
  const introItem = data.items.find(item => item.key === 'about_intro');
  const heroBody = localizedText(introItem?.body, locale) ?? ui.heroBody;
  return (
    <>
      <section className="public-about__hero" aria-labelledby="public-about-title">
        <PublicMediaImage src="/assets/canonical/public/about-platform-hero.png" alt="" fallback={<div className="public-about__hero-fallback" />} className="public-about__hero-media" loading="eager" />
        <div className="public-about__hero-shade" aria-hidden="true" />
        <div className="public-about__hero-content">
          <p className="public-about__eyebrow">{copy.aboutEyebrow}</p>
          <h1 id="public-about-title"><span>{copy.aboutTitle}</span><strong>{locale === 'ar' ? '\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062b\u0642\u0629 \u0648\u0627\u0644\u0634\u0641\u0627\u0641\u064a\u0629' : locale === 'en' ? 'A gateway to trust and transparency' : '\u4fe1\u4efb\u4e0e\u900f\u660e\u7684\u95e8\u6237'}</strong></h1>
          <p>{heroBody}</p>
        </div>
      </section>
      <section className="public-about__how" aria-labelledby="public-about-how-title">
        <div className="public-about__section-heading"><p>{ui.howEyebrow}</p><h2 id="public-about-how-title">{ui.howTitle}</h2></div>
        <div className="public-about__steps">
          {ui.steps.map(step => <article key={step.number} className="public-about__step"><span className="public-about__icon"><Icon kind={step.icon} /></span><small>{step.number}</small><h3>{step.label}</h3><p>{step.detail}</p></article>)}
        </div>
      </section>
      <section className="public-about__values" aria-labelledby="public-about-values-title">
        <div className="public-about__section-heading"><p>{ui.valuesEyebrow}</p><h2 id="public-about-values-title">{ui.valuesTitle}</h2></div>
        <div className="public-about__value-grid">
          {ui.values.map(value => <article key={value.label} className="public-about__value"><span className="public-about__icon"><Icon kind={value.icon} /></span><h3>{value.label}</h3><p>{value.detail}</p></article>)}
        </div>
      </section>
      <section className="public-about__stats" aria-labelledby="public-about-stats-title">
        <div className="public-about__section-heading"><p>{ui.statsEyebrow}</p><h2 id="public-about-stats-title">{ui.statsTitle}</h2></div>
        <div className="public-about__stat-grid">{ui.stats.map(stat => <article key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></article>)}</div>
      </section>
      <section className="public-about__cta-section" aria-label={ui.statsTitle}>
        <div className="public-about__cta"><a href="/properties" className="public-about__cta-button public-about__cta-button--dark"><Icon kind="search" />{ui.browse}</a><a href="/community" className="public-about__cta-button public-about__cta-button--green"><Icon kind="whatsapp" />{ui.whatsapp}</a></div>
      </section>
    </>
  );
}

type TeamPresentation = { readonly category: string; readonly image: string };
const teamPresentation: Readonly<Record<string, TeamPresentation>> = {
  team_ahmed: { category: 'management', image: '/assets/canonical/public/team-asset-1.png' },
  team_sara: { category: 'sales', image: '/assets/canonical/public/team-asset-2.png' },
  team_mohamed: { category: 'support', image: '/assets/canonical/public/team-asset-3.png' },
  team_nour: { category: 'content', image: '/assets/canonical/public/team-asset-4.png' },
  team_karim: { category: 'sales', image: '/assets/canonical/public/team-asset-5.png' },
  team_ali: { category: 'content', image: '/assets/canonical/public/team-asset-6.png' }
};

function teamFilters(locale: SupportedLocale): ReadonlyArray<{ readonly key: string; readonly label: string }> {
  if (locale === 'ar') return [
    { key: 'all', label: '\u0627\u0644\u0643\u0644' }, { key: 'management', label: '\u0625\u062f\u0627\u0631\u0629' }, { key: 'sales', label: '\u0645\u0628\u064a\u0639\u0627\u062a' }, { key: 'support', label: '\u062f\u0639\u0645' }, { key: 'content', label: '\u0645\u062d\u062a\u0648\u0649' }
  ];
  if (locale === 'en') return [
    { key: 'all', label: 'All' }, { key: 'management', label: 'Management' }, { key: 'sales', label: 'Sales' }, { key: 'support', label: 'Support' }, { key: 'content', label: 'Content' }
  ];
  return [
    { key: 'all', label: '\u5168\u90e8' }, { key: 'management', label: '\u7ba1\u7406' }, { key: 'sales', label: '\u9500\u552e' }, { key: 'support', label: '\u652f\u6301' }, { key: 'content', label: '\u5185\u5bb9' }
  ];
}

function TeamCard({ locale, copy, member }: { readonly locale: SupportedLocale; readonly copy: PublicAboutTeamCopy; readonly member: CmsPublicContent }) {
  const presentation = teamPresentation[member.key];
  const name = localizedText(member.name, locale) ?? member.key;
  const role = localizedText(member.role, locale) ?? copy.roleUnavailable;
  const bio = localizedText(member.bio, locale) ?? copy.bioUnavailable;
  const fallback = <div className="public-team__media-fallback"><UxStateView state="missing_image" title={copy.imageUnavailable} /></div>;
  return (
    <article className="public-team__card" data-team-category={presentation?.category ?? 'unknown'}>
      <div className="public-team__media" data-media-state={presentation === undefined ? 'unavailable' : 'success'}>
        {presentation === undefined ? fallback : <PublicMediaImage src={presentation.image} alt="" fallback={fallback} className="public-team__photo" loading="lazy" />}
      </div>
      <div className="public-team__card-body"><h2>{name}</h2><p className="public-team__role">{role}</p><p>{bio}</p></div>
    </article>
  );
}

function TeamContent({ locale, copy, data }: { readonly locale: SupportedLocale; readonly copy: PublicAboutTeamCopy; readonly data: CmsPublicContentListData }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const filters = teamFilters(locale);
  const visibleMembers = data.items.filter(member => activeFilter === 'all' || teamPresentation[member.key]?.category === activeFilter);
  return (
    <>
      <section className="public-team__intro" aria-labelledby="public-team-title">
        <p className="public-team__eyebrow">{copy.teamEyebrow}</p><h1 id="public-team-title">{copy.teamTitle}</h1><p>{copy.teamSubtitle}</p>
        <div className="public-team__filters" aria-label={copy.teamTitle}>{filters.map(filter => <button key={filter.key} type="button" className={activeFilter === filter.key ? 'is-active' : ''} aria-pressed={activeFilter === filter.key} onClick={() => setActiveFilter(filter.key)}>{filter.label}</button>)}</div>
      </section>
      <section className="public-team__content" aria-label={copy.teamTitle}><div className="public-team__grid">{visibleMembers.map(member => <TeamCard key={member.key} locale={locale} copy={copy} member={member} />)}</div></section>
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
      <PublicSiteFooter locale={locale} description={homepageCopy.footerDescription} />
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
      <PublicSiteFooter locale={locale} description={homepageCopy.footerDescription} />
    </div>
  );
}
