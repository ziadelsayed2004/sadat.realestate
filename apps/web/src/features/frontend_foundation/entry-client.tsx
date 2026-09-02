import { hydrateRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { articleListQuerySchema, articlePublicListDataSchema, articlePublicSchema, cmsPublicContentListDataSchema, communityPublicPostListDataSchema, publicHomepageDataSchema, publicOrganizationListDataSchema, publicOrganizationProfileSchema, publicPropertyComparisonDataSchema, publicPropertyDetailsSchema, publicPropertyListDataSchema, type ArticleListQuery, type ArticlePublic, type ArticlePublicListData, type CmsPublicContentListData, type CommunityPublicPostListData, type PublicHomepageData, type PublicOrganizationListData, type PublicOrganizationProfile, type PublicPropertyComparisonData, type PublicPropertyDetails, type PublicPropertyListData, type SupportedLocale } from '@sadat-real-estate/contracts';
import { App } from './app.js';
import { AuthClient } from '../auth/index.ts';
import { applyLocaleToDocument, createBrowserLocaleStore, getBrowserStorage, LOCALE_CHANGE_EVENT, LOCALE_STORAGE_KEY, normalizeLocale, replaceLocaleInUrl } from '../localization/index.js';
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

function readHomepageBootstrap(): PublicHomepageData | undefined {
  const element = document.getElementById('sadat-public-homepage-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') {
    return undefined;
  }
  try {
    return publicHomepageDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPropertyListBootstrap(): PublicPropertyListData | undefined {
  const element = document.getElementById('sadat-public-property-list-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') {
    return undefined;
  }
  try {
    return publicPropertyListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPropertyDetailsBootstrap(): PublicPropertyDetails | undefined {
  const element = document.getElementById('sadat-public-property-details-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') {
    return undefined;
  }
  try {
    return publicPropertyDetailsSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPropertyDetailsInitialState(): PublicPropertyDetailsInitialState | undefined {
  const element = document.getElementById('sadat-public-property-details-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' || state === 'not_found' ? state : undefined;
}

function readPropertyComparisonBootstrap(): PublicPropertyComparisonData | undefined {
  const element = document.getElementById('sadat-public-property-comparison-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') {
    return undefined;
  }
  try {
    return publicPropertyComparisonDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPropertyComparisonInitialState(): PublicPropertyComparisonInitialState | undefined {
  const element = document.getElementById('sadat-public-property-comparison-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' || state === 'empty' || state === 'unavailable' ? state : undefined;
}

function readDeveloperListBootstrap(): PublicOrganizationListData | undefined {
  const element = document.getElementById('sadat-public-developer-list-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return publicOrganizationListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readDeveloperProfileBootstrap(): PublicOrganizationProfile | undefined {
  const element = document.getElementById('sadat-public-developer-profile-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return publicOrganizationProfileSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readDeveloperProfileInitialState(): PublicDeveloperProfileInitialState | undefined {
  const element = document.getElementById('sadat-public-developer-profile-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' || state === 'not_found' ? state : undefined;
}

function readArticleListBootstrap(): ArticlePublicListData | undefined {
  const element = document.getElementById('sadat-public-article-list-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return articlePublicListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readArticleListQueryBootstrap(): ArticleListQuery | undefined {
  const element = document.getElementById('sadat-public-article-list-query');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return articleListQuerySchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readArticleListInitialState(): 'loading' | 'retry' | undefined {
  const element = document.getElementById('sadat-public-article-list-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' ? state : undefined;
}

function readArticleDetailsBootstrap(): ArticlePublic | undefined {
  const element = document.getElementById('sadat-public-article-details-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return articlePublicSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readArticleDetailsInitialState(): 'loading' | 'retry' | 'not_found' | undefined {
  const element = document.getElementById('sadat-public-article-details-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' || state === 'not_found' ? state : undefined;
}

function readRelatedArticlesBootstrap(): ArticlePublicListData | undefined {
  const element = document.getElementById('sadat-public-related-articles-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return articlePublicListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readCommunityBootstrap(): CommunityPublicPostListData | undefined {
  const element = document.getElementById('sadat-public-community-data');
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return communityPublicPostListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readCommunityInitialState(): 'loading' | 'retry' | undefined {
  const element = document.getElementById('sadat-public-community-state');
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' ? state : undefined;
}

function readPublicContentBootstrap(id: 'about' | 'team'): CmsPublicContentListData | undefined {
  const element = document.getElementById(`sadat-public-${id}-data`);
  if (element?.textContent === null || element?.textContent === undefined || element.textContent.trim() === '') return undefined;
  try {
    return cmsPublicContentListDataSchema.parse(JSON.parse(element.textContent));
  } catch {
    return undefined;
  }
}

function readPublicContentInitialState(id: 'about' | 'team'): 'loading' | 'retry' | undefined {
  const element = document.getElementById(`sadat-public-${id}-state`);
  const state = element?.textContent?.trim();
  return state === 'loading' || state === 'retry' ? state : undefined;
}

const homepageData = readHomepageBootstrap();
const propertyListData = readPropertyListBootstrap();
const propertyDetailsData = readPropertyDetailsBootstrap();
const propertyDetailsInitialState = readPropertyDetailsInitialState();
const propertyComparisonData = readPropertyComparisonBootstrap();
const propertyComparisonInitialState = readPropertyComparisonInitialState();
const developerListData = readDeveloperListBootstrap();
const developerProfileData = readDeveloperProfileBootstrap();
const developerProfileInitialState = readDeveloperProfileInitialState();
const articleListData = readArticleListBootstrap();
const articleListQuery = readArticleListQueryBootstrap();
const articleListInitialState = readArticleListInitialState();
const articleDetailsData = readArticleDetailsBootstrap();
const articleDetailsInitialState = readArticleDetailsInitialState();
const relatedArticles = readRelatedArticlesBootstrap();
const communityData = readCommunityBootstrap();
const communityInitialState = readCommunityInitialState();
const aboutData = readPublicContentBootstrap('about');
const aboutInitialState = readPublicContentInitialState('about');
const teamData = readPublicContentBootstrap('team');
const teamInitialState = readPublicContentInitialState('team');
const authClient = new AuthClient();
const appProps = {
  url: window.location.href,
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

function ClientApp(props: typeof appProps) {
  const [url, setUrl] = useState(props.url);
  const [currentLocale, setCurrentLocale] = useState(props.locale);

  useEffect(() => {
    const persistedLocale = normalizeLocale(getBrowserStorage()?.getItem(LOCALE_STORAGE_KEY));
    if (persistedLocale === undefined || persistedLocale === currentLocale) return;

    const snapshot = localeStore.setLocale(persistedLocale);
    applyLocaleToDocument(snapshot.locale);
    const nextUrl = replaceLocaleInUrl(window.location.href, snapshot.locale);
    window.history.replaceState(window.history.state, '', nextUrl);
    setCurrentLocale(snapshot.locale);
    setUrl(window.location.href);
  }, [currentLocale]);

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

  return <App {...props} url={url} locale={currentLocale} onLocaleChange={handleLocaleChange} />;
}

hydrateRoot(root, <ClientApp {...appProps} />);
