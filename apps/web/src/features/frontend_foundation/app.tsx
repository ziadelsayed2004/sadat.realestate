import { useEffect, useState } from 'react';
import type { ArticleListQuery, ArticlePublic, ArticlePublicListData, CmsPublicContentListData, CommunityPublicPostListData, PublicHomepageData, PublicOrganizationDirectoryQuery, PublicOrganizationListData, PublicOrganizationProfile, PublicPropertyComparisonData, PublicPropertyDetails, PublicPropertyListData, PublicPropertySearchQuery, SupportedLocale } from '@sadat-real-estate/contracts';
import { resolveRoute } from '../../routes/route-table.js';
import { PublicCommunity, type CommunityAuthClient } from '../community/index.ts';
import { defaultPublicArticleListLoader, PublicAbout, PublicArticleDetails, PublicArticles, PublicTeam } from '../content/index.ts';
import { AuthPage, type AuthFlowClient } from '../auth/pages.tsx';
import { PublicAuthRoleContext, PublicDeveloperProfile, PublicDevelopers, PublicHomepage, PublicPropertyComparison, PublicPropertyDetails as PublicPropertyDetailsPage, PublicPropertyListing, type PublicDeveloperProfileInitialState, type PublicPropertyComparisonInitialState, type PublicPropertyDetailsInitialState } from '../public/index.ts';
import { ProviderAdvertising, ProviderCommission, ProviderCustomerRequests, ProviderNotifications, ProviderOverview, ProviderProperties, ProviderProjects, ProviderSettings, ProviderViewings } from '../provider/index.ts';
import { ProviderPropertyAdvancedWizard, ProviderPropertyCompletionWizard, ProviderPropertyStatePage, ProviderPropertyWizard, type ProviderPropertyAdvancedStep, type ProviderPropertyCompletionStep, type ProviderPropertyStateRoute } from '../provider_property/index.ts';
import { SeekerNotifications, SeekerOverview, SeekerProfile, SeekerRequests, SeekerSaved, SeekerViewings } from '../seeker/index.ts';
import { AdminNotificationsAudit, AdminOverview } from '../admin/index.ts';
import { AdminAccountReports, AdminAccounts } from '../admin_accounts/index.ts';
import { AdminMasterData } from '../admin_master_data/index.ts';
import { AdminProjects } from '../admin_projects/index.ts';
import { AdminProperties } from '../admin_properties/index.ts';
import { AdminRequests } from '../admin_requests/index.ts';
import { AdminCmsContent, AdminContent } from '../admin_content/index.ts';
import { AdminCommunity } from '../admin_community/index.ts';
import { AdminAds } from '../admin_ads/index.ts';
import { AdminCommissions } from '../admin_commissions/index.ts';
import { AdminHome } from '../admin_home/index.ts';
import { AdminSettings } from '../admin_settings/index.ts';
import { AdminRbac } from '../admin_rbac/index.ts';
import type { AuthSnapshot } from '../auth/index.ts';
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
  readonly onLocaleChange?: ((locale: SupportedLocale) => void) | undefined;
  readonly assets?: DesignAssetCatalog;
  readonly session?: RouteSession;
  readonly authClient?: CommunityAuthClient | undefined;
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
  readonly communityData?: CommunityPublicPostListData | undefined;
  readonly communityInitialState?: 'loading' | 'retry' | undefined;
  readonly aboutData?: CmsPublicContentListData | undefined;
  readonly aboutInitialState?: 'loading' | 'retry' | undefined;
  readonly teamData?: CmsPublicContentListData | undefined;
  readonly teamInitialState?: 'loading' | 'retry' | undefined;
}

export function App({
  url,
  locale,
  onLocaleChange,
  assets,
  session = ANONYMOUS_ROUTE_SESSION,
  authClient,
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
  relatedArticles,
  communityData,
  communityInitialState = 'loading',
  aboutData,
  aboutInitialState = 'loading',
  teamData,
  teamInitialState = 'loading'
}: AppProps) {
  const route = resolveRoute(url);
  const copy = getFoundationCopy(locale);
  const protectedRoute = route.kind === 'matched' && route.requiresAuthentication;
  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot | undefined>(() => authClient?.getSnapshot());
  const [authResolutionComplete, setAuthResolutionComplete] = useState(() => !protectedRoute || session.status === 'authenticated');
  useEffect(() => {
    if (authClient === undefined) {
      setAuthResolutionComplete(true);
      return undefined;
    }
    const updateSnapshot = (snapshot: AuthSnapshot) => {
      setAuthSnapshot(snapshot);
      if (snapshot.status !== 'refreshing') setAuthResolutionComplete(true);
    };
    const initialSnapshot = authClient.getSnapshot();
    updateSnapshot(initialSnapshot);
    const unsubscribe = authClient.subscribe(updateSnapshot);
    if (initialSnapshot.status === 'anonymous') {
      // Public and authentication routes should not probe an absent session.
      // A successful login/refresh persists an authenticated hint, so session
      // aware public navigation still refreshes without producing a guest 401.
      const shouldRefresh = protectedRoute || authClient.hasSessionHint?.() === true;
      if (shouldRefresh) {
        setAuthResolutionComplete(false);
        void authClient.refresh().then(updateSnapshot, () => setAuthResolutionComplete(true));
      } else {
        setAuthResolutionComplete(true);
      }
    }
    return unsubscribe;
  }, [authClient, protectedRoute]);
  const liveSession: RouteSession = authSnapshot?.status === 'authenticated' && authSnapshot.user !== undefined && (authSnapshot.user.roleType === 'seeker' || authSnapshot.user.roleType === 'provider' || authSnapshot.user.roleType === 'admin')
    ? { status: 'authenticated', role: authSnapshot.user.roleType }
    : ANONYMOUS_ROUTE_SESSION;
  const effectiveSession = session.status === 'authenticated' ? session : liveSession;
  const authFlowClient = authClient !== undefined && 'loginAdmin' in authClient
    ? authClient as CommunityAuthClient & AuthFlowClient
    : undefined;
  const guard = guardRoute(route, effectiveSession);
  const isPublicHomepage = route.kind === 'matched' && route.id === 'public-home';
  const isPublicPropertyListing = route.kind === 'matched' && route.id === 'public-properties';
  const isPublicPropertyDetails = route.kind === 'matched' && route.id === 'public-property-details';
  const isPublicPropertyComparison = route.kind === 'matched' && route.id === 'public-compare';
  const isPublicDevelopers = route.kind === 'matched' && route.id === 'public-developers';
  const isPublicDeveloperProfile = route.kind === 'matched' && route.id === 'public-developer-profile';
  const isPublicArticles = route.kind === 'matched' && route.id === 'public-articles';
  const isPublicArticleDetails = route.kind === 'matched' && route.id === 'public-article-details';
  const isPublicCommunity = route.kind === 'matched' && route.id === 'public-community';
  const isPublicAbout = route.kind === 'matched' && route.id === 'public-about';
  const isPublicTeam = route.kind === 'matched' && route.id === 'public-team';
  const isAuthRoute = route.kind === 'matched' && (route.id === 'auth' || route.id === 'provider-application');
  const seekerUrl = new URL(url, 'http://sadat.local');
  const seekerPathname = seekerUrl.pathname.replace(/\/+$/u, '') || '/';
  const isSeekerOverview = route.kind === 'matched' && route.id === 'seeker-dashboard' && seekerPathname === '/seeker';
  const isSeekerRequests = route.kind === 'matched' && route.id === 'seeker-dashboard' && seekerPathname === '/seeker/requests';
  const seekerRequestDetailMatch = route.kind === 'matched' && route.id === 'seeker-dashboard' ? seekerPathname.match(/^\/seeker\/requests\/([a-f0-9]{24})$/u) : null;
  const isSeekerRequestDetails = seekerRequestDetailMatch !== null;
  const isSeekerViewings = route.kind === 'matched' && route.id === 'seeker-dashboard' && seekerPathname === '/seeker/viewings';
  const isSeekerSaved = route.kind === 'matched' && route.id === 'seeker-dashboard' && seekerPathname === '/seeker/saved';
  const isSeekerNotifications = route.kind === 'matched' && route.id === 'seeker-dashboard' && seekerPathname === '/seeker/notifications';
  const isSeekerProfile = route.kind === 'matched' && route.id === 'seeker-dashboard' && seekerPathname === '/seeker/profile';
  const isSeekerSettings = route.kind === 'matched' && route.id === 'seeker-dashboard' && seekerPathname === '/seeker/settings';
  const isProviderOverview = route.kind === 'matched' && route.id === 'provider-dashboard' && seekerPathname === '/provider';
  const isProviderProperties = route.kind === 'matched' && route.id === 'provider-dashboard' && seekerPathname === '/provider/properties';
  const isProviderProjects = route.kind === 'matched' && route.id === 'provider-dashboard' && seekerPathname === '/provider/projects';
  const isProviderCustomerRequests = route.kind === 'matched' && route.id === 'provider-dashboard' && seekerPathname === '/provider/customer-requests';
  const isProviderViewings = route.kind === 'matched' && route.id === 'provider-dashboard' && seekerPathname === '/provider/viewings';
  const providerAdvertisingMatch = route.kind === 'matched' && route.id === 'provider-dashboard' ? seekerPathname.match(/^\/provider\/ads(?:\/([a-f0-9]{24}))?$/u) : null;
  const isProviderAdvertising = providerAdvertisingMatch !== null;
  const isProviderCommission = route.kind === 'matched' && route.id === 'provider-dashboard' && seekerPathname === '/provider/commission';
  const isProviderNotifications = route.kind === 'matched' && route.id === 'provider-dashboard' && seekerPathname === '/provider/notifications';
  const isProviderSettings = route.kind === 'matched' && route.id === 'provider-dashboard' && seekerPathname === '/provider/settings';
  const isAdminOverview = route.kind === 'matched' && route.id === 'admin-dashboard' && (seekerPathname === '/admin' || seekerPathname === '/admin/overview');
  const isAdminUsers = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/users';
  const isAdminSeekers = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/property-seekers';
  const isAdminProviders = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/providers';
  const isAdminVerification = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/verification';
  const isAdminContent = route.kind === 'matched' && route.id === 'admin-dashboard' && ['/admin/articles', '/admin/article-categories'].includes(seekerPathname);
  const isAdminCmsContent = route.kind === 'matched' && route.id === 'admin-dashboard' && ['/admin/content/about', '/admin/content/team', '/admin/content/population-counter'].includes(seekerPathname);
  const isAdminCommunity = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/community';
  const isAdminCommunityComments = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/community/comments';
  const isAdminCommunityModeration = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/community/moderation';
  const isAdminAccountReports = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/account-reports';
  const isAdminAccountRestrictions = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/account-restrictions';
  const isAdminPropertyCategories = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/property-categories';
  const isAdminLocations = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/locations';
  const isAdminFeatures = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/features';
  const isAdminProjects = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/projects';
  const isAdminProjectReview = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/projects/review';
  const isAdminProperties = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/properties';
  const isAdminPropertyReview = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/properties/review';
  const isAdminPropertyDuplicates = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/properties/possible-duplicates';
  const isAdminPropertyReports = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/property-reports';
  const isAdminRequests = route.kind === 'matched' && route.id === 'admin-dashboard' && ['/admin/requests', '/admin/customer-requests', '/admin/overdue-requests', '/admin/contact-requests', '/admin/viewing-requests', '/admin/search-requests', '/admin/request-issues'].includes(seekerPathname);
  const isAdminAds = route.kind === 'matched' && route.id === 'admin-dashboard' && (seekerPathname === '/admin/advertising' || seekerPathname.startsWith('/admin/ads'));
  const isAdminCommissions = route.kind === 'matched' && route.id === 'admin-dashboard' && (seekerPathname === '/admin/commissions' || seekerPathname.startsWith('/admin/commissions/'));
  const isAdminHome = route.kind === 'matched' && route.id === 'admin-dashboard' && (seekerPathname === '/admin/banners' || seekerPathname === '/admin/banners/new' || seekerPathname === '/admin/content/tips' || seekerPathname === '/admin/content/homepage');
  const isAdminSettings = route.kind === 'matched' && route.id === 'admin-dashboard' && (seekerPathname === '/admin/settings' || seekerPathname === '/admin/settings/platform' || seekerPathname === '/admin/settings/contact' || seekerPathname === '/admin/settings/social' || seekerPathname === '/admin/settings/properties' || seekerPathname === '/admin/settings/requests' || seekerPathname === '/admin/settings/advertising' || seekerPathname === '/admin/settings/seo' || seekerPathname === '/admin/settings/privacy-security' || seekerPathname === '/admin/settings/display');
  const isAdminNotifications = route.kind === 'matched' && route.id === 'admin-dashboard' && seekerPathname === '/admin/notifications';
  const adminAuditDetailMatch = route.kind === 'matched' && route.id === 'admin-dashboard' ? seekerPathname.match(/^\/admin\/audit-logs\/([a-f0-9]{24})$/u) : null;
  const isAdminAudit = route.kind === 'matched' && route.id === 'admin-dashboard' && (seekerPathname === '/admin/audit-logs' || adminAuditDetailMatch !== null);
  const isAdminRbacUsers = route.kind === 'matched' && route.id === 'admin-dashboard' && (seekerPathname === '/admin/admin-users' || seekerPathname === '/admin/admin-users/new' || /^\/admin\/admin-users\/[a-f0-9]{24}$/u.test(seekerPathname));
  const isAdminRbacRoles = route.kind === 'matched' && route.id === 'admin-dashboard' && (seekerPathname === '/admin/roles' || /^\/admin\/roles\/[a-f0-9]{24}$/u.test(seekerPathname));
  const isAdminRbac = isAdminRbacUsers || isAdminRbacRoles;
  const adminUserDetailMatch = route.kind === 'matched' && route.id === 'admin-dashboard' ? seekerPathname.match(/^\/admin\/users\/([a-f0-9]{24})$/u) : null;
  const adminProviderDetailMatch = route.kind === 'matched' && route.id === 'admin-dashboard' ? seekerPathname.match(/^\/admin\/providers\/([a-f0-9]{24})$/u) : null;
  const isAdminUserDetail = adminUserDetailMatch !== null;
  const isAdminProviderDetail = adminProviderDetailMatch !== null;
  const providerPropertyBasicMatch = route.kind === 'matched' && route.id === 'provider-dashboard' ? seekerPathname.match(/^\/provider\/properties\/(?:new\/basic|([a-f0-9]{24})\/basic)$/u) : null;
  const providerPropertyLocationMatch = route.kind === 'matched' && route.id === 'provider-dashboard' ? seekerPathname.match(/^\/provider\/properties\/([a-f0-9]{24})\/location$/u) : null;
  const providerPropertyAdvancedMatch = route.kind === 'matched' && route.id === 'provider-dashboard' ? seekerPathname.match(/^\/provider\/properties\/([a-f0-9]{24})\/(details|price-payment|features(?:-services)?)$/u) : null;
  const providerPropertyCompletionMatch = route.kind === 'matched' && route.id === 'provider-dashboard' ? seekerPathname.match(/^\/provider\/properties\/([a-f0-9]{24})\/(media|contact|review)$/u) : null;
  const providerPropertyStateMatch = route.kind === 'matched' && route.id === 'provider-dashboard' ? seekerPathname.match(/^\/provider\/properties\/([a-f0-9]{24})\/(submitted|rejected|published)$/u) : null;
  const isProviderPropertyState = providerPropertyStateMatch !== null;
  const isProviderPropertyWizard = providerPropertyBasicMatch !== null || providerPropertyLocationMatch !== null || providerPropertyAdvancedMatch !== null || providerPropertyCompletionMatch !== null || isProviderPropertyState;
  const providerPropertyWizardStep = providerPropertyLocationMatch === null ? 'basic' as const : 'location' as const;
  const providerPropertyAdvancedStep = providerPropertyAdvancedMatch?.[2] === 'features' ? 'features-services' : providerPropertyAdvancedMatch?.[2] as ProviderPropertyAdvancedStep | undefined;
  const providerPropertyCompletionStep = providerPropertyCompletionMatch?.[2] as ProviderPropertyCompletionStep | undefined;
  const providerPropertyStateRoute = providerPropertyStateMatch?.[2] as ProviderPropertyStateRoute | undefined;
  const providerPropertyWizardId = providerPropertyStateMatch?.[1] ?? providerPropertyCompletionMatch?.[1] ?? providerPropertyAdvancedMatch?.[1] ?? providerPropertyLocationMatch?.[1] ?? providerPropertyBasicMatch?.[1];
  const seekerProfileQueryTab = seekerUrl.searchParams.get('tab');
  const seekerProfileTab = seekerProfileQueryTab === 'personal' || seekerProfileQueryTab === 'profile' ? 'profile' : 'preferences';
  const providerSettingsTab = seekerUrl.searchParams.get('tab') === 'contact' ? 'contact' : seekerUrl.searchParams.get('tab') === 'security' ? 'security' : 'account';

  const content = protectedRoute && !authResolutionComplete ? (
    <div className="route-auth-resolving" data-auth-resolution="pending">
      <RouteStateView state="loading" copy={copy} />
    </div>
  ) : guard.allowed ? (
    isPublicHomepage ? (
      <PublicHomepage locale={locale} authenticatedRole={effectiveSession.status === 'authenticated' ? effectiveSession.role : undefined} initialData={homepageData} initialState={homepageInitialState} />
    ) : isPublicPropertyListing ? (
      <PublicPropertyListing url={url} locale={locale} initialData={propertyListData} initialQuery={propertyListQuery} initialState={propertyListInitialState} />
    ) : isPublicPropertyDetails ? (
      <PublicPropertyDetailsPage url={url} locale={locale} initialData={propertyDetailsData} initialState={propertyDetailsInitialState} authClient={authClient} />
    ) : isPublicPropertyComparison ? (
      <PublicPropertyComparison url={url} locale={locale} initialData={propertyComparisonData} initialState={propertyComparisonInitialState} />
    ) : isPublicDevelopers ? (
      <PublicDevelopers url={url} locale={locale} initialData={developerListData} initialQuery={developerListQuery} initialState={developerListInitialState} />
    ) : isPublicDeveloperProfile ? (
      <PublicDeveloperProfile url={url} locale={locale} initialData={developerProfileData} initialState={developerProfileInitialState} />
    ) : isPublicArticles ? (
      <PublicArticles url={url} locale={locale} initialData={articleListData} initialQuery={articleListQuery} initialState={articleListInitialState} />
    ) : isPublicArticleDetails ? (
      <PublicArticleDetails url={url} locale={locale} initialData={articleDetailsData} initialState={articleDetailsInitialState} relatedArticles={relatedArticles} loadRelated={defaultPublicArticleListLoader} />
    ) : isPublicCommunity ? (
      <PublicCommunity url={url} locale={locale} session={session} authClient={authClient} initialData={communityData} initialState={communityInitialState} />
    ) : isPublicAbout ? (
      <PublicAbout locale={locale} initialData={aboutData} initialState={aboutInitialState} />
    ) : isPublicTeam ? (
      <PublicTeam locale={locale} initialData={teamData} initialState={teamInitialState} />
    ) : isAuthRoute ? (
      <AuthPage
        url={url}
        locale={locale}
        client={authFlowClient}
        onAuthenticated={snapshot => {
          if (typeof window === 'undefined') return;
          const requestedReturnTo = new URL(url, window.location.origin).searchParams.get('returnTo');
          const safeReturnTo = requestedReturnTo !== null && requestedReturnTo.startsWith('/') && !requestedReturnTo.startsWith('//')
            ? requestedReturnTo
            : undefined;
          const role = snapshot.user?.roleType;
          const roleHome = role === 'admin' ? '/admin' : role === 'provider' ? '/provider' : '/seeker';
          window.location.assign(safeReturnTo ?? `${roleHome}?lang=${locale}`);
        }}
      />
    ) : isProviderOverview ? (
      <ProviderOverview locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isProviderProperties ? (
      <ProviderProperties locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isProviderProjects ? (
      <ProviderProjects locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isProviderCustomerRequests ? (
      <ProviderCustomerRequests locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isProviderViewings ? (
      <ProviderViewings locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isProviderAdvertising ? (
      <ProviderAdvertising locale={locale} session={effectiveSession} authClient={authClient} requestId={providerAdvertisingMatch?.[1]} />
    ) : isProviderCommission ? (
      <ProviderCommission locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isProviderNotifications ? (
      <ProviderNotifications locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isProviderSettings ? (
      <ProviderSettings locale={locale} session={effectiveSession} authClient={authClient} tab={providerSettingsTab} />
    ) : isProviderPropertyState && providerPropertyStateRoute !== undefined ? (
      <ProviderPropertyStatePage locale={locale} session={effectiveSession} authClient={authClient} route={providerPropertyStateRoute} propertyId={providerPropertyWizardId!} />
    ) : isProviderPropertyWizard ? (
      providerPropertyCompletionStep !== undefined
        ? <ProviderPropertyCompletionWizard locale={locale} session={effectiveSession} authClient={authClient} step={providerPropertyCompletionStep} propertyId={providerPropertyWizardId!} />
        : providerPropertyAdvancedStep !== undefined
        ? <ProviderPropertyAdvancedWizard locale={locale} session={effectiveSession} authClient={authClient} step={providerPropertyAdvancedStep} propertyId={providerPropertyWizardId!} />
        : <ProviderPropertyWizard locale={locale} session={effectiveSession} authClient={authClient} step={providerPropertyWizardStep} propertyId={providerPropertyWizardId} />
    ) : isSeekerOverview ? (
      <SeekerOverview locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isSeekerRequests || isSeekerRequestDetails ? (
      <SeekerRequests locale={locale} session={effectiveSession} authClient={authClient} requestId={seekerRequestDetailMatch?.[1]} />
    ) : isSeekerViewings ? (
      <SeekerViewings locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isSeekerSaved ? (
      <SeekerSaved locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isSeekerNotifications ? (
      <SeekerNotifications locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isSeekerProfile ? (
      <SeekerProfile locale={locale} session={effectiveSession} authClient={authClient} tab={seekerProfileTab} />
    ) : isSeekerSettings ? (
      <SeekerProfile locale={locale} session={effectiveSession} authClient={authClient} tab="settings" />
    ) : isAdminOverview ? (
      <AdminOverview locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminAccountReports ? (
      <AdminAccountReports locale={locale} session={effectiveSession} authClient={authClient} view="reports" reportId={seekerUrl.searchParams.get('reportId') ?? undefined} />
    ) : isAdminAccountRestrictions ? (
      <AdminAccountReports locale={locale} session={effectiveSession} authClient={authClient} view="restrictions" accountId={seekerUrl.searchParams.get('accountId') ?? undefined} />
    ) : isAdminPropertyCategories || isAdminLocations || isAdminFeatures ? (
      <AdminMasterData locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminProjects || isAdminProjectReview ? (
      <AdminProjects locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminAds ? (
      <AdminAds locale={locale} session={effectiveSession} authClient={authClient} url={url} />
    ) : isAdminHome ? (
      <AdminHome key={seekerPathname} locale={locale} session={effectiveSession} authClient={authClient} url={url} />
    ) : isAdminSettings ? (
      <AdminSettings key={seekerPathname} path={seekerPathname} locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminNotifications || isAdminAudit ? (
      <AdminNotificationsAudit key={seekerPathname} url={url} locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminRbac ? (
      <AdminRbac key={seekerPathname} url={url} locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminCommissions ? (
      <AdminCommissions locale={locale} session={effectiveSession} authClient={authClient} url={url} />
    ) : isAdminRequests ? (
      <AdminRequests locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminProperties ? (
      <AdminProperties locale={locale} session={effectiveSession} authClient={authClient} url={url} view="list" />
    ) : isAdminPropertyReview ? (
      <AdminProperties locale={locale} session={effectiveSession} authClient={authClient} url={url} view="review" />
    ) : isAdminPropertyDuplicates ? (
      <AdminProperties locale={locale} session={effectiveSession} authClient={authClient} url={url} view="duplicates" />
    ) : isAdminPropertyReports ? (
      <AdminProperties locale={locale} session={effectiveSession} authClient={authClient} url={url} view="reports" />
    ) : isAdminUsers || isAdminUserDetail ? (
      <AdminAccounts locale={locale} session={effectiveSession} authClient={authClient} view="users" detailId={adminUserDetailMatch?.[1]} />
    ) : isAdminSeekers ? (
      <AdminAccounts locale={locale} session={effectiveSession} authClient={authClient} view="seekers" />
    ) : isAdminProviders || isAdminProviderDetail ? (
      <AdminAccounts locale={locale} session={effectiveSession} authClient={authClient} view="providers" detailId={adminProviderDetailMatch?.[1]} />
    ) : isAdminVerification ? (
      <AdminAccounts locale={locale} session={effectiveSession} authClient={authClient} view="verification" />
    ) : isAdminContent ? (
      <AdminContent locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminCmsContent ? (
      <AdminCmsContent key={seekerPathname} path={seekerPathname} locale={locale} session={effectiveSession} authClient={authClient} />
    ) : isAdminCommunity || isAdminCommunityComments || isAdminCommunityModeration ? (
      <AdminCommunity locale={locale} session={effectiveSession} authClient={authClient} />
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
      <RouteShell route={route} locale={locale} copy={copy} assets={assets} onLocaleChange={onLocaleChange}>
        {((isPublicHomepage || isPublicPropertyListing || isPublicPropertyDetails || isPublicPropertyComparison || isPublicDevelopers || isPublicDeveloperProfile || isPublicArticles || isPublicArticleDetails || isPublicCommunity || isPublicAbout || isPublicTeam || isAuthRoute || isProviderOverview || isProviderProperties || isProviderProjects || isProviderCustomerRequests || isProviderViewings || isProviderAdvertising || isProviderCommission || isProviderNotifications || isProviderSettings || isProviderPropertyWizard || isSeekerOverview || isSeekerRequests || isSeekerRequestDetails || isSeekerViewings || isSeekerSaved || isSeekerNotifications || isSeekerProfile || isSeekerSettings || isAdminOverview || isAdminAccountReports || isAdminAccountRestrictions || isAdminPropertyCategories || isAdminLocations || isAdminFeatures || isAdminProjects || isAdminProjectReview || isAdminAds || isAdminHome || isAdminSettings || isAdminNotifications || isAdminAudit || isAdminRbac || isAdminCommissions || isAdminRequests || isAdminProperties || isAdminPropertyReview || isAdminPropertyDuplicates || isAdminPropertyReports || isAdminUsers || isAdminSeekers || isAdminProviders || isAdminVerification || isAdminContent || isAdminCmsContent || isAdminCommunity || isAdminCommunityComments || isAdminCommunityModeration || isAdminUserDetail || isAdminProviderDetail) && guard.allowed) ? null : (
          <div className="route-heading">
            <p className="surface-label">{copy.surfaceLabels[route.surface]}</p>
            <h1>{copy.shellTitle}</h1>
            <p>{copy.shellDescription}</p>
            <p className="route-label">{copy.routeLabel}: <code>{route.pattern ?? url}</code></p>
          </div>
        )}
        <PublicAuthRoleContext.Provider value={effectiveSession.status === 'authenticated' ? effectiveSession.role : undefined}>
          {content}
        </PublicAuthRoleContext.Provider>
      </RouteShell>
    </RouteErrorBoundary>
  );
}
