import type { ArticleListQuery, ArticlePublic, ArticlePublicListData, PublicHomepageData, PublicOrganizationDirectoryQuery, PublicOrganizationListData, PublicOrganizationProfile, PublicPropertyComparisonData, PublicPropertyDetails, PublicPropertyListData, PublicPropertySearchQuery, SupportedLocale } from '@sadat-real-estate/contracts';
import { resolveRoute } from '../../routes/route-table.js';
import { PublicArticleDetails, PublicArticles } from '../content/index.ts';
import { PublicDeveloperProfile, PublicDevelopers, PublicHomepage, PublicPropertyComparison, PublicPropertyDetails as PublicPropertyDetailsPage, PublicPropertyListing, type PublicDeveloperProfileInitialState, type PublicPropertyComparisonInitialState, type PublicPropertyDetailsInitialState } from '../public/index.ts';
import {
  ANONYMOUS_ROUTE_SESSION,
  AuthenticationRequiredPage,
  ForbiddenPage,
  NotFoundPage,
  RouteErrorBoundary,
  RouteShell,
  guardRoute,
  type RouteSession
} from '../routing/index.ts';
import { type DesignAssetCatalog } from '../design_system/index.ts';
import { getFoundationCopy } from './locale.js';
import { RouteStateView } from './route-state.js';
import './styles.css';

export interface AppProps {
  readonly url: string;
  readonly locale: SupportedLocale;
  readonly assets?: DesignAssetCatalog;
  readonly session?: RouteSession;
  readonly homepageData?: PublicHomepageData | undefined;
  readonly homepageInitialState?: 'loading' | 'retry' | undefined;
  readonly propertyListData?: PublicPropertyListData | undefined;
  readonly propertyListQuery?: PublicPropertySearchQuery | undefined;
  readonly propertyListInitialState?: 'loading' | 'retry' | undefined;
  readonly propertyDetailsData?: PublicPropertyDetails | undefined;
  readonly propertyDetailsInitialState?: PublicPropertyDetailsInitialState | undefined;
  readonly propertyComparisonData?: PublicPropertyComparisonData | undefined;
  readonly propertyComparisonInitialState?: PublicPropertyComparisonInitialState | undefined;
  readonly developerListData?: PublicOrganizationListData | undefined;
  readonly developerListQuery?: PublicOrganizationDirectoryQuery | undefined;
  readonly developerListInitialState?: 'loading' | 'retry' | undefined;
  readonly developerProfileData?: PublicOrganizationProfile | undefined;
  readonly developerProfileInitialState?: PublicDeveloperProfileInitialState | undefined;
  readonly articleListData?: ArticlePublicListData | undefined;
  readonly articleListQuery?: ArticleListQuery | undefined;
  readonly articleListInitialState?: 'loading' | 'retry' | undefined;
  readonly articleDetailsData?: ArticlePublic | undefined;
  readonly articleDetailsInitialState?: 'loading' | 'retry' | 'not_found' | undefined;
  readonly relatedArticles?: ArticlePublicListData | undefined;
}

export function App({
  url,
  locale,
  assets,
  session = ANONYMOUS_ROUTE_SESSION,
  homepageData,
  homepageInitialState = 'loading',
  propertyListData,
  propertyListQuery,
  propertyListInitialState = 'loading',
  propertyDetailsData,
  propertyDetailsInitialState = 'loading',
  propertyComparisonData,
  propertyComparisonInitialState = 'loading',
  developerListData,
  developerListQuery,
  developerListInitialState = 'loading',
  developerProfileData,
  developerProfileInitialState = 'loading',
  articleListData,
  articleListQuery,
  articleListInitialState = 'loading',
  articleDetailsData,
  articleDetailsInitialState,
  relatedArticles
}: AppProps) {
  const route = resolveRoute(url);
  const copy = getFoundationCopy(locale);
  const guard = guardRoute(route, session);
  const isPublicHomepage = route.kind === 'matched' && route.id === 'public-home';
  const isPublicPropertyListing = route.kind === 'matched' && route.id === 'public-properties';
  const isPublicPropertyDetails = route.kind === 'matched' && route.id === 'public-property-details';
  const isPublicPropertyComparison = route.kind === 'matched' && route.id === 'public-compare';
  const isPublicDevelopers = route.kind === 'matched' && route.id === 'public-developers';
  const isPublicDeveloperProfile = route.kind === 'matched' && route.id === 'public-developer-profile';
  const isPublicArticles = route.kind === 'matched' && route.id === 'public-articles';
  const isPublicArticleDetails = route.kind === 'matched' && route.id === 'public-article-details';

  const content = guard.allowed ? (
    isPublicHomepage ? (
      <PublicHomepage locale={locale} initialData={homepageData} initialState={homepageInitialState} />
    ) : isPublicPropertyListing ? (
      <PublicPropertyListing url={url} locale={locale} initialData={propertyListData} initialQuery={propertyListQuery} initialState={propertyListInitialState} />
    ) : isPublicPropertyDetails ? (
      <PublicPropertyDetailsPage url={url} locale={locale} initialData={propertyDetailsData} initialState={propertyDetailsInitialState} />
    ) : isPublicPropertyComparison ? (
      <PublicPropertyComparison url={url} locale={locale} initialData={propertyComparisonData} initialState={propertyComparisonInitialState} />
    ) : isPublicDevelopers ? (
      <PublicDevelopers url={url} locale={locale} initialData={developerListData} initialQuery={developerListQuery} initialState={developerListInitialState} />
    ) : isPublicDeveloperProfile ? (
      <PublicDeveloperProfile url={url} locale={locale} initialData={developerProfileData} initialState={developerProfileInitialState} />
    ) : isPublicArticles ? (
      <PublicArticles url={url} locale={locale} initialData={articleListData} initialQuery={articleListQuery} initialState={articleListInitialState} />
    ) : isPublicArticleDetails ? (
      <PublicArticleDetails url={url} locale={locale} initialData={articleDetailsData} initialState={articleDetailsInitialState} relatedArticles={relatedArticles} />
    ) : <RouteStateView state="empty" copy={copy} />
  ) : guard.reason === 'not_found' ? (
    <NotFoundPage copy={copy} url={url} />
  ) : guard.reason === 'forbidden' ? (
    <ForbiddenPage copy={copy} />
  ) : (
    <AuthenticationRequiredPage copy={copy} />
  );

  return (
    <RouteErrorBoundary key={`${route.id}:${locale}`} copy={copy}>
      <RouteShell route={route} locale={locale} copy={copy} assets={assets}>
        {((isPublicHomepage || isPublicPropertyListing || isPublicPropertyDetails || isPublicPropertyComparison || isPublicDevelopers || isPublicDeveloperProfile || isPublicArticles || isPublicArticleDetails) && guard.allowed) ? null : (
          <div className="route-heading">
            <p className="surface-label">{copy.surfaceLabels[route.surface]}</p>
            <h1>{copy.shellTitle}</h1>
            <p>{copy.shellDescription}</p>
            <p className="route-label">{copy.routeLabel}: <code>{route.pattern ?? url}</code></p>
          </div>
        )}
        {content}
      </RouteShell>
    </RouteErrorBoundary>
  );
}
