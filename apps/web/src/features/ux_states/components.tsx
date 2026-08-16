import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { getUxStateSemantics, type UxState } from './model.js';

type StateViewAttributes = Omit<
  HTMLAttributes<HTMLElement>,
  'aria-busy' | 'aria-label' | 'aria-live' | 'children' | 'className' | 'role' | 'title'
>;

export interface UxStateViewProps extends StateViewAttributes {
  readonly state: UxState;
  readonly title?: ReactNode;
  readonly message?: ReactNode;
  readonly retryLabel?: ReactNode;
  readonly onRetry?: (() => void) | undefined;
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

const missingImageStyle: CSSProperties = {
  display: 'grid',
  minBlockSize: '4rem',
  placeItems: 'center',
  backgroundColor: 'var(--color-brand-soft)'
};

const longTextStyle: CSSProperties = {
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap'
};

function joinClassNames(...classNames: readonly (string | undefined)[]): string | undefined {
  const value = classNames.filter((className): className is string => className !== undefined && className.length > 0).join(' ');
  return value.length > 0 ? value : undefined;
}

function accessibleLabel(title: ReactNode): string | undefined {
  return typeof title === 'string' && title.trim().length > 0 ? title : undefined;
}

export function UxStateView({
  state,
  title,
  message,
  retryLabel,
  onRetry,
  children,
  className,
  ...attributes
}: UxStateViewProps) {
  const semantics = getUxStateSemantics(state);
  const sharedAttributes = {
    ...attributes,
    className: joinClassNames('ui-state-message', 'ux-state-view', `ux-state-view--${state}`, className),
    'data-state': state,
    'aria-live': semantics.live,
    'aria-busy': semantics.busy || undefined,
    role: semantics.role,
    'aria-label': accessibleLabel(title)
  };

  if (state === 'missing_image') {
    return (
      <figure {...sharedAttributes}>
        <div className="ux-state-view__missing-image" data-placeholder="missing-image" aria-hidden="true" style={missingImageStyle}>
          {children}
        </div>
        {title !== undefined ? <figcaption>{title}</figcaption> : null}
        {message !== undefined ? <p>{message}</p> : null}
      </figure>
    );
  }

  if (state === 'long_text') {
    return (
      <section {...sharedAttributes}>
        {title !== undefined ? <h2>{title}</h2> : null}
        {message !== undefined ? <p data-text-wrap="safe" style={longTextStyle}>{message}</p> : null}
        {message === undefined && children !== undefined ? <div data-text-wrap="safe" style={longTextStyle}>{children}</div> : null}
      </section>
    );
  }

  return (
    <div {...sharedAttributes}>
      {title !== undefined ? <h2>{title}</h2> : null}
      {message !== undefined ? <p>{message}</p> : null}
      {state === 'retry' && retryLabel !== undefined ? (
        <button type="button" onClick={onRetry} disabled={onRetry === undefined}>{retryLabel}</button>
      ) : null}
      {children}
    </div>
  );
}
