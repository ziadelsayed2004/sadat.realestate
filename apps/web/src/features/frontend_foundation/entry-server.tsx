import { renderToString } from 'react-dom/server';
import { SUPPORTED_LOCALES, type ArticleListQuery, type ArticlePublic, type ArticlePublicListData, type PublicHomepageData, type PublicOrganizationDirectoryQuery, type PublicOrganizationListData, type PublicOrganizationProfile, type PublicPropertyComparisonData, type PublicPropertyDetails, type PublicPropertyListData, type PublicPropertySearchQuery, type SupportedLocale } from '@sadat-real-estate/contracts';
import { resolveRoute } from '../../routes/route-table.js';
import { ApiClientError } from '../contracts/index.ts';
import { loadPublicDeveloperDirectory, loadPublicDeveloperProfile, loadPublicHomepage, loadPublicPropertyComparison, loadPublicPropertyDetails, loadPublicPropertyList, localizedText, parsePublicDeveloperDirectoryQuery, parsePublicPropertyComparisonIds, parsePublicPropertySearchQuery, propertyDetailsSlugFromUrl, publicDeveloperProfileSlugFromUrl, publicPropertyDetailsUrl } from '../public/index.ts';
import { loadPublicArticleDetails, loadPublicArticles, parsePublicArticleListQuery, publicArticleSlugFromUrl, publicArticleUrl, type PublicArticleDetailsViewState } from '../content/index.ts';
import { App } from './app.js';
import { directionForLocale, getFoundationCopy, resolveLocale } from './locale.js';

export interface ServerRenderSeo {
  readonly description?: string;
  readonly canonicalPath: string;
  readonly alternatePaths: readonly { readonly hrefLang: string; readonly href: string }[];
  readonly jsonLd: Readonly<Record<string, unknown>>;
}

export interface ServerRenderOptions {
  readonly acceptLanguage?: string;
  readonly apiOrigin?: string;
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
  readonly seo?: ServerRenderSeo;
}

function detailsSeo(data: PublicPropertyDetails, locale: SupportedLocale): ServerRenderSeo {
  const canonicalPath = publicPropertyDetailsUrl(data.seo.slug);
  const title = localizedText(data.seo.title, locale) ?? data.seo.slug;
  const description = localizedText(data.seo.description, locale);
  const alternatePaths = SUPPORTED_LOCALES.map(alternateLocale => ({
    hrefLang: alternateLocale,
    href: `${canonicalPath}?lang=${encodeURIComponent(alternateLocale)}`
  }));
  return {
    ...(description === undefined ? {} : { description }),
    canonicalPath,
    alternatePaths,
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
  };
}

function articleSeo(data: ArticlePublic, locale: SupportedLocale): ServerRenderSeo {
  const canonicalPath = publicArticleUrl(data.slug);
  const title = localizedText(data.seoTitle, locale) ?? localizedText(data.title, locale) ?? data.slug;
  const description = localizedText(data.seoDescription, locale) ?? localizedText(data.body, locale);
  const alternatePaths = SUPPORTED_LOCALES.map(alternateLocale => ({
    hrefLang: alternateLocale,
    href: `${canonicalPath}?lang=${encodeURIComponent(alternateLocale)}`
  }));
  return {
    ...(description === undefined ? {} : { description }),
    canonicalPath,
    alternatePaths,
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
  };
}

export async function render(url: string, options: ServerRenderOptions = {}): Promise<ServerRenderResult> {
  const parsedUrl = new URL(url, 'http://sadat.local');
  const locale = resolveLocale(parsedUrl.searchParams.get('lang'), options.acceptLanguage);
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
  let seo: ServerRenderSeo | undefined;

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
        seo = detailsSeo(propertyDetailsData, locale);
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
      if (developerProfileData !== undefined) developerProfileInitialState = undefined;
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
        seo = articleSeo(articleDetailsData, locale);
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
    ...(relatedArticles === undefined ? {} : { relatedArticles })
  };

  const articleTitle = localizedText(articleDetailsData?.seoTitle, locale) ?? localizedText(articleDetailsData?.title, locale);

  return {
    html: renderToString(<App {...appProps} />),
    locale,
    direction: directionForLocale(locale),
    statusCode: route.kind === 'not_found' || propertyDetailsInitialState === 'not_found' || developerProfileInitialState === 'not_found' || articleDetailsInitialState === 'not_found' ? 404 : 200,
    title: seo === undefined ? articleTitle ?? localizedText(developerProfileData?.name, locale) ?? copy.brand : localizedText(propertyDetailsData?.seo.title, locale) ?? articleTitle ?? copy.brand,
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
    ...(seo === undefined ? {} : { seo })
  };
}
