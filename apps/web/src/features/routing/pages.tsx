import type { FoundationCopy } from '../frontend_foundation/locale.js';

export interface RoutePageProps {
  readonly copy: FoundationCopy;
  readonly url?: string;
}

export function NotFoundPage({ copy, url }: RoutePageProps) {
  const message = copy.states.error;
  return (
    <section className="route-status-page" data-page="not-found" data-state="error" data-status-code="404" role="alert">
      <p className="route-status-page__code">404</p>
      <h2>{message.title}</h2>
      <p>{message.body}</p>
      {url === undefined ? null : <p className="route-status-page__requested-route"><code>{url}</code></p>}
      <a href="/" aria-label={copy.brand}>{copy.brand}</a>
    </section>
  );
}

export function AuthenticationRequiredPage({ copy }: RoutePageProps) {
  const message = copy.states.permission;
  return (
    <section
      className="route-status-page"
      data-access="authentication-required"
      data-state="permission"
      data-status-code="401"
      role="alert"
    >
      <h2>{message.title}</h2>
      <p>{message.body}</p>
    </section>
  );
}

export function ForbiddenPage({ copy }: RoutePageProps) {
  const message = copy.states.permission;
  return (
    <section className="route-status-page" data-access="forbidden" data-state="permission" data-status-code="403" role="alert">
      <p className="route-status-page__code">403</p>
      <h2>{message.title}</h2>
      <p>{message.body}</p>
      <a href="/" aria-label={copy.brand}>{copy.brand}</a>
    </section>
  );
}

export function RouteErrorPage({ copy }: RoutePageProps) {
  const message = copy.states.error;
  return (
    <section className="route-status-page" data-error-boundary="true" data-state="error" role="alert">
      <h2>{message.title}</h2>
      <p>{message.body}</p>
    </section>
  );
}
