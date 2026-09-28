import type { FoundationCopy } from '../frontend_foundation/locale.js';

export interface RoutePageProps {
  readonly copy: FoundationCopy;
  readonly url?: string;
}

export function NotFoundPage({ copy }: RoutePageProps) {
  const message = copy.states.error;
  return (
    <section className="route-status-page" data-page="not-found" data-state="error" data-status-code="404" role="alert">
      <p className="route-status-page__code">404</p>
      <h1>{message.title}</h1>
      <p>{message.body}</p>
      <a href={`/?lang=${copy.brand === 'عقارات السادات' ? 'ar' : 'en'}`} aria-label={copy.brand}>{copy.homeLabel}</a>
    </section>
  );
}

export function AuthenticationRequiredPage({ copy, url }: RoutePageProps) {
  const message = copy.states.permission;
  const query = new URLSearchParams({ lang: copy.brand === 'عقارات السادات' ? 'ar' : 'en' });
  if (url !== undefined) {
    const target = new URL(url, 'http://sadat.local');
    query.set('returnTo', `${target.pathname}${target.search}`);
  }
  return (
    <section
      className="route-status-page"
      data-access="authentication-required"
      data-state="permission"
      data-status-code="401"
      role="alert"
    >
      <h1>{message.title}</h1>
      <p>{message.body}</p>
      <a className="route-status-page__action" href={`/auth/login?${query.toString()}`}>{copy.loginLabel}</a>
    </section>
  );
}

export function ForbiddenPage({ copy }: RoutePageProps) {
  return (
    <section className="route-status-page" data-access="forbidden" data-state="permission" data-status-code="403" role="alert">
      <p className="route-status-page__code">403</p>
      <h1>{copy.forbiddenTitle}</h1>
      <p>{copy.forbiddenBody}</p>
      <a href={`/?lang=${copy.brand === 'عقارات السادات' ? 'ar' : 'en'}`} aria-label={copy.brand}>{copy.homeLabel}</a>
    </section>
  );
}

export function RouteErrorPage({ copy }: RoutePageProps) {
  const message = copy.states.retry;
  return (
    <section className="route-status-page" data-error-boundary="true" data-state="error" role="alert">
      <h1>{message.title}</h1>
      <p>{message.body}</p>
      <button className="route-status-page__action" type="button" onClick={() => window.location.reload()}>{copy.retryLabel}</button>
    </section>
  );
}
