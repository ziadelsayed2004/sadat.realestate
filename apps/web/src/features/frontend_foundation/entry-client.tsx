import { hydrateRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { articleListQuerySchema, articlePublicListDataSchema, articlePublicSchema, cmsPublicContentListDataSchema, communityPublicPostListDataSchema, publicHomepageDataSchema, publicOrganizationListDataSchema, publicOrganizationProfileSchema, publicPropertyComparisonDataSchema, publicPropertyDetailsSchema, publicPropertyListDataSchema, type ArticleListQuery, type ArticlePublic, type ArticlePublicListData, type CmsPublicContentListData, type CommunityPublicPostListData, type PublicHomepageData, type PublicOrganizationListData, type PublicOrganizationProfile, type PublicPropertyComparisonData, type PublicPropertyDetails, type PublicPropertyListData, type SupportedLocale } from '@sadat-real-estate/contracts';
import { App } from './app.js';
import { installPublicNavigation } from './public-navigation.ts';
import { AuthClient } from '../auth/index.ts';
import { applyLocaleToDocument, createBrowserLocaleStore, LOCALE_CHANGE_EVENT, normalizeLocale, persistLocaleCookie, replaceLocaleInUrl } from '../localization/index.js';
import type { PublicDeveloperProfileInitialState, PublicPropertyComparisonInitialState, PublicPropertyDetailsInitialState } from '../public/index.ts';

const root = document.getElementById('app');
if (root === null) throw new Error('SSR root element is missing');

const localeStore = createBrowserLocaleStore({
  explicitLocale: document.documentElement.lang,
  acceptLanguage: navigator.language,
  preferExplicitLocale: true
});
const { locale } = localeStore.getSnapshot();
applyLocaleToDocument(locale);
localeStore.setLocale(locale);
persistLocaleCookie(locale);

function readHomepageBootstrap(source: Document = document): PublicHomepageData | undefined {
  const element = source.getElementById('sadat-public-homepage-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') {
    return undefined;
  }
  try {
    return publicHomepageDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPropertyListBootstrap(source: Document = document): PublicPropertyListData | undefined {
  const element = source.getElementById('sadat-public-property-list-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') {
    return undefined;
  }
  try {
    return publicPropertyListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPropertyDetailsBootstrap(source: Document = document): PublicPropertyDetails | undefined {
  const element = source.getElementById('sadat-public-property-details-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') {
    return undefined;
  }
  try {
    return publicPropertyDetailsSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPropertyDetailsInitialState(source: Document = document): PublicPropertyDetailsInitialState | undefined {
  const element = source.getElementById('sadat-public-property-details-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' || state === 'not_found' ? state : undefined;
}

function readPropertyComparisonBootstrap(source: Document = document): PublicPropertyComparisonData | undefined {
  const element = source.getElementById('sadat-public-property-comparison-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') {
    return undefined;
  }
  try {
    return publicPropertyComparisonDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPropertyComparisonInitialState(source: Document = document): PublicPropertyComparisonInitialState | undefined {
  const element = source.getElementById('sadat-public-property-comparison-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' || state === 'empty' || state === 'unavailable' ? state : undefined;
}

function readDeveloperListBootstrap(source: Document = document): PublicOrganizationListData | undefined {
  const element = source.getElementById('sadat-public-developer-list-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return publicOrganizationListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readDeveloperProfileBootstrap(source: Document = document): PublicOrganizationProfile | undefined {
  const element = source.getElementById('sadat-public-developer-profile-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return publicOrganizationProfileSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readDeveloperProfileInitialState(source: Document = document): PublicDeveloperProfileInitialState | undefined {
  const element = source.getElementById('sadat-public-developer-profile-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' || state === 'not_found' ? state : undefined;
}

function readArticleListBootstrap(source: Document = document): ArticlePublicListData | undefined {
  const element = source.getElementById('sadat-public-article-list-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return articlePublicListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readArticleListQueryBootstrap(source: Document = document): ArticleListQuery | undefined {
  const element = source.getElementById('sadat-public-article-list-query');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return articleListQuerySchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readArticleListInitialState(source: Document = document): 'loading' | 'retry' | undefined {
  const element = source.getElementById('sadat-public-article-list-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' ? state : undefined;
}

function readArticleDetailsBootstrap(source: Document = document): ArticlePublic | undefined {
  const element = source.getElementById('sadat-public-article-details-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return articlePublicSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readArticleDetailsInitialState(source: Document = document): 'loading' | 'retry' | 'not_found' | undefined {
  const element = source.getElementById('sadat-public-article-details-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' || state === 'not_found' ? state : undefined;
}

function readRelatedArticlesBootstrap(source: Document = document): ArticlePublicListData | undefined {
  const element = source.getElementById('sadat-public-related-articles-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return articlePublicListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readCommunityBootstrap(source: Document = document): CommunityPublicPostListData | undefined {
  const element = source.getElementById('sadat-public-community-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return communityPublicPostListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readCommunityInitialState(source: Document = document): 'loading' | 'retry' | undefined {
  const element = source.getElementById('sadat-public-community-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' ? state : undefined;
}

function readPublicContentBootstrap(id: 'about' | 'team', source: Document = document): CmsPublicContentListData | undefined {
  const element = source.getElementById(`sadat-public-${id}-data`);
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return cmsPublicContentListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPublicContentInitialState(id: 'about' | 'team', source: Document = document): 'loading' | 'retry' | undefined {
  const element = source.getElementById(`sadat-public-${id}-state`);
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' ? state : undefined;
}

const authClient = new AuthClient();

function readAppProps(source: Document = document, url = window.location.href) {
  const homepageData = readHomepageBootstrap(source);
  const propertyListData = readPropertyListBootstrap(source);
  const propertyDetailsData = readPropertyDetailsBootstrap(source);
  const propertyDetailsInitialState = readPropertyDetailsInitialState(source);
  const propertyComparisonData = readPropertyComparisonBootstrap(source);
  const propertyComparisonInitialState = readPropertyComparisonInitialState(source);
  const developerListData = readDeveloperListBootstrap(source);
  const developerProfileData = readDeveloperProfileBootstrap(source);
  const developerProfileInitialState = readDeveloperProfileInitialState(source);
  const articleListData = readArticleListBootstrap(source);
  const articleListQuery = readArticleListQueryBootstrap(source);
  const articleListInitialState = readArticleListInitialState(source);
  const articleDetailsData = readArticleDetailsBootstrap(source);
  const articleDetailsInitialState = readArticleDetailsInitialState(source);
  const relatedArticles = readRelatedArticlesBootstrap(source);
  const communityData = readCommunityBootstrap(source);
  const communityInitialState = readCommunityInitialState(source);
  const aboutData = readPublicContentBootstrap('about', source);
  const aboutInitialState = readPublicContentInitialState('about', source);
  const teamData = readPublicContentBootstrap('team', source);
  const teamInitialState = readPublicContentInitialState('team', source);
  return {
    url,
    locale,
    ...(homepageData === undefined ? {} : { homepageData }),
    ...(propertyListData === undefined ? {} : { propertyListData }),
    ...(propertyDetailsData === undefined ? {} : { propertyDetailsData }),
    ...(propertyDetailsInitialState === undefined ? {} : { propertyDetailsInitialState }),
    ...(propertyComparisonData === undefined ? {} : { propertyComparisonData }),
    ...(propertyComparisonInitialState === undefined ? {} : { propertyComparisonInitialState }),
    ...(developerListData === undefined ? {} : { developerListData }),
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
    authClient
  };

}

const appProps = readAppProps();

function ClientApp(props: typeof appProps) {
  const [url, setUrl] = useState(props.url);
  const [pageProps, setPageProps] = useState(props);
  const [routeVersion, setRouteVersion] = useState(0);
  const [currentLocale, setCurrentLocale] = useState(props.locale);

  useEffect(() => { document.dispatchEvent(new Event('sadat:app-ready')); }, []);

  const handleLocaleChange = (nextLocale: SupportedLocale) => {
    const snapshot = localeStore.setLocale(nextLocale);
    applyLocaleToDocument(snapshot.locale);
    const nextUrl = replaceLocaleInUrl(window.location.href, snapshot.locale);
    window.history.replaceState(window.history.state, '', nextUrl);
    setCurrentLocale(snapshot.locale);
    setUrl(window.location.href);
  };

  useEffect(() => {
    const onLocaleEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ readonly locale?: unknown }>).detail;
      const nextLocale = normalizeLocale(detail?.locale);
      if (nextLocale !== undefined) handleLocaleChange(nextLocale);
    };
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleEvent);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleEvent);
  }, [currentLocale]);

  useEffect(() => installPublicNavigation((source, target) => {
    const nextLocale = normalizeLocale(target.searchParams.get('lang')) ?? localeStore.getSnapshot().locale;
    localeStore.setLocale(nextLocale);
    applyLocaleToDocument(nextLocale);
    setCurrentLocale(nextLocale);
    setPageProps(readAppProps(source, target.href));
    setUrl(target.href);
    setRouteVersion(previous => previous + 1);
  }), []);

  return <App key={routeVersion} {...pageProps} url={url} locale={currentLocale} onLocaleChange={handleLocaleChange} />;
}

hydrateRoot(root, <ClientApp {...appProps} />);
