import { renderToString } from 'react-dom/server';
import { type ArticleListQuery, type ArticlePublic, type ArticlePublicListData, type CmsPublicContentListData, type CommunityPublicPostListData, type PublicHomepageData, type PublicOrganizationDirectoryQuery, type PublicOrganizationListData, type PublicOrganizationProfile, type PublicPropertyComparisonData, type PublicPropertyDetails, type PublicPropertyListData, type PublicPropertySearchQuery, type SupportedLocale } from '@sadat-real-estate/contracts';
import { resolveRoute } from '../../routes/route-table.js';
import { ApiClientError } from '../contracts/index.ts';
import { getPublicDevelopersCopy, getPublicHomepageCopy, getPublicPropertyComparisonCopy, getPublicPropertyDetailsCopy, getPublicPropertyListingCopy, loadPublicDeveloperDirectory, loadPublicDeveloperProfile, loadPublicHomepage, loadPublicPropertyComparison, loadPublicPropertyDetails, loadPublicPropertyList, localizedText, parsePublicDeveloperDirectoryQuery, parsePublicPropertyComparisonIds, parsePublicPropertySearchQuery, propertyDetailsSlugFromUrl, publicDeveloperProfileSlugFromUrl, publicDeveloperProfileUrl, publicPropertyDetailsUrl } from '../public/index.ts';
import { getPublicAboutTeamCopy, getPublicArticlesCopy, loadPublicAbout, loadPublicArticleDetails, loadPublicArticles, loadPublicTeam, parsePublicArticleListQuery, publicArticleSlugFromUrl, publicArticleUrl, type PublicArticleDetailsViewState } from '../content/index.ts';
import { getCommunityCopy, loadPublicCommunity, parseCommunityListQuery } from '../community/index.ts';
import { canonicalPathForUrl, createPublicSeo, type PublicSeoMetadata } from '../seo/index.ts';
import { App } from './app.js';
import { directionForLocale, getFoundationCopy, resolveLocale } from './locale.js';

export type ServerRenderSeo = PublicSeoMetadata;
export { createRobotsTxt, createSitemapXml } from '../seo/index.ts';

export interface ServerRenderOptions {
  readonly acceptLanguage?: string;
  readonly preferredLocale?: string;
  readonly apiOrigin?: string;
  readonly publicOrigin?: string;
  readonly homepageData?: PublicHomepageData;
  readonly propertyListData?: PublicPropertyListData;
  readonly propertyListQuery?: PublicPropertySearchQuery;
  readonly propertyDetailsData?: PublicPropertyDetails;
  readonly propertyComparisonData?: PublicPropertyComparisonData;
  readonly developerListData?: PublicOrganizationListData;
  readonly developerListQuery?: PublicOrganizationDirectoryQuery;
  readonly developerProfileData?: PublicOrganizationProfile;
  readonly articleListData?: ArticlePublicListData;
  readonly articleListQuery?: ArticleListQuery;
  readonly articleDetailsData?: ArticlePublic;
  readonly relatedArticles?: ArticlePublicListData;
  readonly communityData?: CommunityPublicPostListData;
  readonly aboutData?: CmsPublicContentListData;
  readonly teamData?: CmsPublicContentListData;
}

export interface ServerRenderResult {
  readonly html: string;
  readonly locale: SupportedLocale;
  readonly direction: 'rtl' | 'ltr';
  readonly statusCode: 200 | 404;
  readonly title: string;
  readonly homepageData?: PublicHomepageData;
  readonly propertyListData?: PublicPropertyListData;
  readonly propertyListQuery?: PublicPropertySearchQuery;
  readonly propertyDetailsData?: PublicPropertyDetails;
  readonly propertyDetailsInitialState?: 'loading' | 'retry' | 'not_found';
  readonly propertyComparisonData?: PublicPropertyComparisonData;
  readonly propertyComparisonInitialState?: 'loading' | 'retry' | 'empty' | 'unavailable';
  readonly developerListData?: PublicOrganizationListData;
  readonly developerListQuery?: PublicOrganizationDirectoryQuery;
  readonly developerProfileData?: PublicOrganizationProfile;
  readonly developerProfileInitialState?: 'loading' | 'retry' | 'not_found';
  readonly articleListData?: ArticlePublicListData;
  readonly articleListQuery?: ArticleListQuery;
  readonly articleListInitialState?: 'loading' | 'retry';
  readonly articleDetailsData?: ArticlePublic;
  readonly articleDetailsInitialState?: PublicArticleDetailsViewState;
  readonly relatedArticles?: ArticlePublicListData;
  readonly communityData?: CommunityPublicPostListData;
  readonly communityInitialState?: 'loading' | 'retry';
  readonly aboutData?: CmsPublicContentListData;
  readonly aboutInitialState?: 'loading' | 'retry';
  readonly teamData?: CmsPublicContentListData;
  readonly teamInitialState?: 'loading' | 'retry';
  readonly seo?: ServerRenderSeo;
  readonly publicOrigin?: string;
}

function hasQueryVariants(url: string): boolean {
  const parsedUrl = new URL(url, 'http://sadat.local');
  return [...parsedUrl.searchParams.keys()].some(key => key !== 'lang');
}

function detailsSeo(data: PublicPropertyDetails, locale: SupportedLocale, url: string): ServerRenderSeo {
  const canonicalPath = publicPropertyDetailsUrl(data.seo.slug);
  const title = localizedText(data.seo.title, locale) ?? data.seo.slug;
  const description = localizedText(data.seo.description, locale);
  return createPublicSeo({
    title,
    locale,
    ...(description === undefined ? {} : { description }),
    canonicalPath,
    robots: hasQueryVariants(url) ? 'noindex,follow' : 'index,follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: title,
      ...(description === undefined ? {} : { description }),
      identifier: data.seo.slug,
      ...(data.price === undefined ? {} : {
        offers: {
          '@type': 'Offer',
          price: String(data.price.amount),
          priceCurrency: data.price.currency
        }
      })
    }
  });
}

function articleSeo(data: ArticlePublic, locale: SupportedLocale, url: string): ServerRenderSeo {
  const canonicalPath = publicArticleUrl(data.slug);
  const title = localizedText(data.seoTitle, locale) ?? localizedText(data.title, locale) ?? data.slug;
  const description = localizedText(data.seoDescription, locale) ?? localizedText(data.body, locale);
  return createPublicSeo({
    title,
    locale,
    ...(description === undefined ? {} : { description }),
    canonicalPath,
    robots: hasQueryVariants(url) ? 'noindex,follow' : 'index,follow',
    openGraphType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      ...(description === undefined ? {} : { description }),
      ...(data.publishedAt === undefined ? {} : { datePublished: data.publishedAt }),
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonicalPath
      }
    }
  });
}

function developerProfileSeo(data: PublicOrganizationProfile, locale: SupportedLocale, url: string): ServerRenderSeo {
  const canonicalPath = publicDeveloperProfileUrl(data.slug);
  const title = localizedText(data.name, locale) ?? data.slug;
  const description = localizedText(data.description, locale);
  return createPublicSeo({
    title,
    locale,
    ...(description === undefined ? {} : { description }),
    canonicalPath,
    robots: hasQueryVariants(url) ? 'noindex,follow' : 'index,follow',
    openGraphType: 'profile',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: title,
      ...(description === undefined ? {} : { description }),
      url: canonicalPath
    }
  });
}

function publicRouteSeo(routeId: string, locale: SupportedLocale, url: string): ServerRenderSeo | undefined {
  const homepage = getPublicHomepageCopy(locale);
  const canonicalPath = canonicalPathForUrl(url);
  const robots = routeId === 'public-compare' || hasQueryVariants(url) ? 'noindex,follow' : 'index,follow';
  switch (routeId) {
    case 'public-home':
      return createPublicSeo({ title: homepage.brand, locale, canonicalPath: '/', description: homepage.heroFallbackBody, robots });
    case 'public-properties': {
      const copy = getPublicPropertyListingCopy(locale);
      return createPublicSeo({ title: copy.title, locale, canonicalPath, description: copy.footerDescription, robots });
    }
    case 'public-compare': {
      const copy = getPublicPropertyComparisonCopy(locale);
      return createPublicSeo({ title: copy.title, locale, canonicalPath, description: copy.description, robots });
    }
    case 'public-developers': {
      const copy = getPublicDevelopersCopy(locale);
      return createPublicSeo({ title: copy.title, locale, canonicalPath, description: copy.subtitle, robots });
    }
    case 'public-articles': {
      const copy = getPublicArticlesCopy(locale);
      return createPublicSeo({ title: copy.title, locale, canonicalPath, description: copy.subtitle, robots });
    }
    case 'public-community': {
      const copy = getCommunityCopy(locale);
      return createPublicSeo({ title: copy.title, locale, canonicalPath, description: copy.subtitle, robots });
    }
    case 'public-about': {
      const copy = getPublicAboutTeamCopy(locale);
      return createPublicSeo({ title: copy.aboutTitle, locale, canonicalPath, description: copy.aboutSubtitle, robots });
    }
    case 'public-team': {
      const copy = getPublicAboutTeamCopy(locale);
      return createPublicSeo({ title: copy.teamTitle, locale, canonicalPath, description: copy.teamSubtitle, robots });
    }
    default:
      return undefined;
  }
}

function unavailableDetailSeo(routeId: string, locale: SupportedLocale, url: string, notFound: boolean): ServerRenderSeo {
  const canonicalPath = canonicalPathForUrl(url);
  if (routeId === 'public-property-details') {
    const copy = getPublicPropertyDetailsCopy(locale);
    return createPublicSeo({ title: notFound ? copy.notFoundTitle : copy.loadingTitle, locale, canonicalPath, description: notFound ? copy.notFoundBody : copy.loadingBody, robots: 'noindex,follow' });
  }
  if (routeId === 'public-developer-profile') {
    const copy = getPublicDevelopersCopy(locale);
    return createPublicSeo({ title: notFound ? copy.notFoundTitle : copy.loadingTitle, locale, canonicalPath, description: notFound ? copy.notFoundBody : copy.loadingBody, robots: 'noindex,follow' });
  }
  const copy = getPublicArticlesCopy(locale);
  return createPublicSeo({ title: notFound ? copy.notFoundTitle : copy.loadingTitle, locale, canonicalPath, description: notFound ? copy.notFoundBody : copy.loadingBody, robots: 'noindex,follow' });
}

export async function render(url: string, options: ServerRenderOptions = {}): Promise<ServerRenderResult> {
  const parsedUrl = new URL(url, 'http://sadat.local');
  const locale = resolveLocale(parsedUrl.searchParams.get('lang') ?? options.preferredLocale, options.acceptLanguage);
  const route = resolveRoute(url);
  const copy = getFoundationCopy(locale);
  let homepageData = options.homepageData;
  let propertyListData = options.propertyListData;
  let propertyListQuery = options.propertyListQuery;
  let propertyDetailsData = options.propertyDetailsData;
  let propertyDetailsInitialState: ServerRenderResult['propertyDetailsInitialState'] = propertyDetailsData === undefined ? 'loading' : undefined;
  let propertyComparisonData = options.propertyComparisonData;
  let propertyComparisonInitialState: ServerRenderResult['propertyComparisonInitialState'];
  let developerListData = options.developerListData;
  let developerListQuery = options.developerListQuery;
  let developerProfileData = options.developerProfileData;
  let developerProfileInitialState: ServerRenderResult['developerProfileInitialState'] = developerProfileData === undefined ? 'loading' : undefined;
  let articleListData = options.articleListData;
  let articleListQuery = options.articleListQuery;
  let articleListInitialState: ServerRenderResult['articleListInitialState'] = articleListData === undefined ? 'loading' : undefined;
  let articleDetailsData = options.articleDetailsData;
  let articleDetailsInitialState: ServerRenderResult['articleDetailsInitialState'] = articleDetailsData === undefined ? 'loading' : undefined;
  let relatedArticles = options.relatedArticles;
  let communityData = options.communityData;
  let communityInitialState: ServerRenderResult['communityInitialState'] = communityData === undefined ? 'loading' : undefined;
  let aboutData = options.aboutData;
  let aboutInitialState: ServerRenderResult['aboutInitialState'] = aboutData === undefined ? 'loading' : undefined;
  let teamData = options.teamData;
  let teamInitialState: ServerRenderResult['teamInitialState'] = teamData === undefined ? 'loading' : undefined;
  let seo: ServerRenderSeo | undefined;

  if (route.kind === 'matched' && route.id === 'public-community') {
    if (communityData === undefined && options.apiOrigin !== undefined) {
      try {
        communityData = await loadPublicCommunity({
          apiOrigin: options.apiOrigin,
          query: parseCommunityListQuery(url),
          signal: AbortSignal.timeout(1_500)
        });
      } catch {
        communityInitialState = 'retry';
      }
    }
    if (communityData !== undefined) communityInitialState = undefined;
  }

  if (route.kind === 'matched' && route.id === 'public-about') {
    if (aboutData === undefined && options.apiOrigin !== undefined) {
      try {
        aboutData = await loadPublicAbout({ apiOrigin: options.apiOrigin, signal: AbortSignal.timeout(1_500) });
      } catch {
        aboutInitialState = 'retry';
      }
    }
    if (aboutData !== undefined) aboutInitialState = undefined;
  }

  if (route.kind === 'matched' && route.id === 'public-team') {
    if (teamData === undefined && options.apiOrigin !== undefined) {
      try {
        teamData = await loadPublicTeam({ apiOrigin: options.apiOrigin, signal: AbortSignal.timeout(1_500) });
      } catch {
        teamInitialState = 'retry';
      }
    }
    if (teamData !== undefined) teamInitialState = undefined;
  }

  if (homepageData === undefined && options.apiOrigin !== undefined && route.kind === 'matched' && route.id === 'public-home') {
    try {
      homepageData = await loadPublicHomepage({
        apiOrigin: options.apiOrigin,
        signal: AbortSignal.timeout(1_500)
      });
    } catch {
      // SSR fails closed to the loading state when the API is unavailable.
    }
  }

  if (route.kind === 'matched' && route.id === 'public-properties') {
    propertyListQuery ??= parsePublicPropertySearchQuery(url);
    if (propertyListData === undefined && options.apiOrigin !== undefined) {
      try {
        propertyListData = await loadPublicPropertyList({
          apiOrigin: options.apiOrigin,
          query: propertyListQuery,
          signal: AbortSignal.timeout(1_500)
        });
      } catch {
        // SSR fails closed to the loading state when the API is unavailable.
      }
    }
  }

  if (route.kind === 'matched' && route.id === 'public-property-details') {
    const slug = propertyDetailsSlugFromUrl(url);
    if (slug === undefined) {
      propertyDetailsInitialState = 'not_found';
    } else {
      if (propertyDetailsData === undefined && options.apiOrigin !== undefined) {
        try {
          propertyDetailsData = await loadPublicPropertyDetails({
            apiOrigin: options.apiOrigin,
            slug,
            signal: AbortSignal.timeout(1_500)
          });
        } catch (error) {
          propertyDetailsInitialState = error instanceof ApiClientError && error.status === 404 ? 'not_found' : 'retry';
        }
      }
      if (propertyDetailsData !== undefined) {
        propertyDetailsInitialState = undefined;
        seo = detailsSeo(propertyDetailsData, locale, url);
      }
    }
  }

  if (route.kind === 'matched' && route.id === 'public-compare') {
    const propertyIds = parsePublicPropertyComparisonIds(url);
    if (propertyIds.length === 0) {
      propertyComparisonData = undefined;
      propertyComparisonInitialState = 'empty';
    } else if (propertyComparisonData === undefined && options.apiOrigin !== undefined) {
      try {
        propertyComparisonData = await loadPublicPropertyComparison({
          apiOrigin: options.apiOrigin,
          propertyIds,
          signal: AbortSignal.timeout(1_500)
        });
      } catch (error) {
        propertyComparisonInitialState = error instanceof ApiClientError && error.status === 404 ? 'unavailable' : 'retry';
      }
    }
    if (propertyComparisonData !== undefined) propertyComparisonInitialState = undefined;
    if (propertyComparisonData === undefined && propertyComparisonInitialState === undefined) propertyComparisonInitialState = 'loading';
  }

  if (route.kind === 'matched' && route.id === 'public-developers') {
    developerListQuery ??= parsePublicDeveloperDirectoryQuery(url);
    if (developerListData === undefined && options.apiOrigin !== undefined) {
      try {
        developerListData = await loadPublicDeveloperDirectory({
          apiOrigin: options.apiOrigin,
          query: developerListQuery,
          signal: AbortSignal.timeout(1_500)
        });
      } catch {
        // SSR fails closed to the loading state when the API is unavailable.
      }
    }
  }

  if (route.kind === 'matched' && route.id === 'public-developer-profile') {
    const slug = publicDeveloperProfileSlugFromUrl(url);
    if (slug === undefined) {
      developerProfileInitialState = 'not_found';
    } else {
      if (developerProfileData === undefined && options.apiOrigin !== undefined) {
        try {
          developerProfileData = await loadPublicDeveloperProfile({
            apiOrigin: options.apiOrigin,
            slug,
            signal: AbortSignal.timeout(1_500)
          });
        } catch (error) {
          developerProfileInitialState = error instanceof ApiClientError && error.status === 404 ? 'not_found' : 'retry';
        }
      }
      if (developerProfileData !== undefined) {
        developerProfileInitialState = undefined;
        seo = developerProfileSeo(developerProfileData, locale, url);
      }
    }
  }

  if (route.kind === 'matched' && route.id === 'public-articles') {
    articleListQuery ??= parsePublicArticleListQuery(url, locale);
    if (articleListData === undefined && options.apiOrigin !== undefined) {
      try {
        articleListData = await loadPublicArticles({
          apiOrigin: options.apiOrigin,
          query: articleListQuery,
          signal: AbortSignal.timeout(1_500)
        });
      } catch {
        articleListInitialState = 'retry';
      }
    }
    if (articleListData !== undefined) articleListInitialState = undefined;
  }

  if (route.kind === 'matched' && route.id === 'public-article-details') {
    const slug = publicArticleSlugFromUrl(url);
    if (slug === undefined) {
      articleDetailsInitialState = 'not_found';
    } else {
      if (articleDetailsData === undefined && options.apiOrigin !== undefined) {
        try {
          articleDetailsData = await loadPublicArticleDetails({
            apiOrigin: options.apiOrigin,
            slug,
            locale,
            signal: AbortSignal.timeout(1_500)
          });
        } catch (error) {
          articleDetailsInitialState = error instanceof ApiClientError && error.status === 404 ? 'not_found' : 'retry';
        }
      }
      if (articleDetailsData !== undefined) {
        articleDetailsInitialState = undefined;
        seo = articleSeo(articleDetailsData, locale, url);
        if (relatedArticles === undefined && options.apiOrigin !== undefined) {
          try {
            relatedArticles = await loadPublicArticles({
              apiOrigin: options.apiOrigin,
              query: { locale, page: 1, limit: 20 },
              signal: AbortSignal.timeout(1_500)
            });
          } catch {
            // Related content is optional and remains unavailable when the list endpoint is unavailable.
          }
        }
      }
    }
  }

  if (seo === undefined) {
    if (route.kind === 'matched' && route.surface === 'public') {
      if (route.id === 'public-property-details' || route.id === 'public-developer-profile' || route.id === 'public-article-details') {
        seo = unavailableDetailSeo(
          route.id,
          locale,
          url,
          propertyDetailsInitialState === 'not_found' || developerProfileInitialState === 'not_found' || articleDetailsInitialState === 'not_found'
        );
      } else {
        seo = publicRouteSeo(route.id, locale, url);
      }
    } else {
      seo = createPublicSeo({
        title: route.kind === 'not_found' ? copy.states.error.title : copy.brand,
        locale,
        canonicalPath: canonicalPathForUrl(url),
        description: route.kind === 'not_found' ? copy.states.error.body : copy.shellDescription,
        robots: 'noindex,nofollow'
      });
    }
  }

  const appProps = {
    url,
    locale,
    ...(homepageData === undefined ? {} : { homepageData }),
    ...(propertyListData === undefined ? {} : { propertyListData }),
    ...(propertyListQuery === undefined ? {} : { propertyListQuery }),
    ...(propertyDetailsData === undefined ? {} : { propertyDetailsData }),
    ...(propertyDetailsInitialState === undefined ? {} : { propertyDetailsInitialState }),
    ...(propertyComparisonData === undefined ? {} : { propertyComparisonData }),
    ...(propertyComparisonInitialState === undefined ? {} : { propertyComparisonInitialState }),
    ...(developerListData === undefined ? {} : { developerListData }),
    ...(developerListQuery === undefined ? {} : { developerListQuery }),
    ...(developerProfileData === undefined ? {} : { developerProfileData }),
    ...(developerProfileInitialState === undefined ? {} : { developerProfileInitialState }),
    ...(articleListData === undefined ? {} : { articleListData }),
    ...(articleListQuery === undefined ? {} : { articleListQuery }),
    ...(articleListInitialState === undefined ? {} : { articleListInitialState }),
    ...(articleDetailsData === undefined ? {} : { articleDetailsData }),
    ...(articleDetailsInitialState === undefined ? {} : { articleDetailsInitialState }),
    ...(relatedArticles === undefined ? {} : { relatedArticles }),
    ...(communityData === undefined ? {} : { communityData }),
    ...(aboutData === undefined ? {} : { aboutData }),
    ...(aboutInitialState === undefined ? {} : { aboutInitialState }),
    ...(teamData === undefined ? {} : { teamData }),
    ...(teamInitialState === undefined ? {} : { teamInitialState })
  };

  const articleTitle = localizedText(articleDetailsData?.seoTitle, locale) ?? localizedText(articleDetailsData?.title, locale);
  const publicContentTitle = route.kind === 'matched'
    ? route.id === 'public-about'
      ? getPublicAboutTeamCopy(locale).aboutTitle
      : route.id === 'public-team'
        ? getPublicAboutTeamCopy(locale).teamTitle
        : undefined
    : undefined;

  return {
    html: renderToString(<App {...appProps} />),
    locale,
    direction: directionForLocale(locale),
    statusCode: route.kind === 'not_found' || propertyDetailsInitialState === 'not_found' || developerProfileInitialState === 'not_found' || articleDetailsInitialState === 'not_found' ? 404 : 200,
    title: seo?.title ?? articleTitle ?? localizedText(developerProfileData?.name, locale) ?? publicContentTitle ?? copy.brand,
    ...(homepageData === undefined ? {} : { homepageData }),
    ...(propertyListData === undefined ? {} : { propertyListData }),
    ...(propertyListQuery === undefined ? {} : { propertyListQuery }),
    ...(propertyDetailsData === undefined ? {} : { propertyDetailsData }),
    ...(propertyDetailsInitialState === undefined ? {} : { propertyDetailsInitialState }),
    ...(propertyComparisonData === undefined ? {} : { propertyComparisonData }),
    ...(propertyComparisonInitialState === undefined ? {} : { propertyComparisonInitialState }),
    ...(developerListData === undefined ? {} : { developerListData }),
    ...(developerListQuery === undefined ? {} : { developerListQuery }),
    ...(developerProfileData === undefined ? {} : { developerProfileData }),
    ...(developerProfileInitialState === undefined ? {} : { developerProfileInitialState }),
    ...(articleListData === undefined ? {} : { articleListData }),
    ...(articleListQuery === undefined ? {} : { articleListQuery }),
    ...(articleListInitialState === undefined ? {} : { articleListInitialState }),
    ...(articleDetailsData === undefined ? {} : { articleDetailsData }),
    ...(articleDetailsInitialState === undefined ? {} : { articleDetailsInitialState }),
    ...(relatedArticles === undefined ? {} : { relatedArticles }),
    ...(communityData === undefined ? {} : { communityData }),
    ...(communityInitialState === undefined ? {} : { communityInitialState }),
    ...(aboutData === undefined ? {} : { aboutData }),
    ...(aboutInitialState === undefined ? {} : { aboutInitialState }),
    ...(teamData === undefined ? {} : { teamData }),
    ...(teamInitialState === undefined ? {} : { teamInitialState }),
    ...(seo === undefined ? {} : { seo }),
    ...(options.publicOrigin === undefined ? {} : { publicOrigin: options.publicOrigin })
  };
}
