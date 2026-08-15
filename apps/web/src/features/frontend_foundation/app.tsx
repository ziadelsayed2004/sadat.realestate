import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { resolveRoute } from '../../routes/route-table.js';
import { BrandMark, type DesignAssetCatalog } from '../design_system/index.ts';
import { directionForLocale, getFoundationCopy } from './locale.js';
import { RouteStateView } from './route-state.js';
import './styles.css';

export interface AppProps {
  readonly url: string;
  readonly locale: SupportedLocale;
  readonly assets?: DesignAssetCatalog;
}

export function App({ url, locale, assets }: AppProps) {
  const route = resolveRoute(url);
  const copy = getFoundationCopy(locale);
  const state = route.kind === 'not_found' ? 'error' : route.requiresAuthentication ? 'permission' : 'empty';
  const surfaceLabel = copy.surfaceLabels[route.surface];

  return (
    <div
      className={`app-shell surface-${route.surface}`}
      data-route-id={route.id}
      data-surface={route.surface}
      data-device-scope={route.deviceScope}
      data-auth-required={route.requiresAuthentication}
      data-locale={locale}
      dir={directionForLocale(locale)}
    >
      <header className="app-header">
        <BrandMark label={copy.brand} assets={assets} />
        <span className="locale" data-locale-indicator="true">{copy.localeLabel}: {locale}</span>
      </header>
      <main className="app-main">
        <div className="route-heading">
          <p className="surface-label">{surfaceLabel}</p>
          <h1>{copy.shellTitle}</h1>
          <p>{copy.shellDescription}</p>
          <p className="route-label">{copy.routeLabel}: <code>{route.pattern ?? url}</code></p>
        </div>
        <RouteStateView state={state} copy={copy} />
      </main>
    </div>
  );
}
