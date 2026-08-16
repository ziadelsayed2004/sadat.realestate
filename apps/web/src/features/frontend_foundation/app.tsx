import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { resolveRoute } from '../../routes/route-table.js';
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
}

export function App({ url, locale, assets, session = ANONYMOUS_ROUTE_SESSION }: AppProps) {
  const route = resolveRoute(url);
  const copy = getFoundationCopy(locale);
  const guard = guardRoute(route, session);

  const content = guard.allowed ? (
    <RouteStateView state="empty" copy={copy} />
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
        <div className="route-heading">
          <p className="surface-label">{copy.surfaceLabels[route.surface]}</p>
          <h1>{copy.shellTitle}</h1>
          <p>{copy.shellDescription}</p>
          <p className="route-label">{copy.routeLabel}: <code>{route.pattern ?? url}</code></p>
        </div>
        {content}
      </RouteShell>
    </RouteErrorBoundary>
  );
}
