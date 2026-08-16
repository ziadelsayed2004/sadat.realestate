import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

function joinClassNames(...classNames: readonly (string | undefined)[]): string {
  return classNames.filter((className): className is string => className !== undefined && className.length > 0).join(' ');
}

export interface SkipLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  readonly label?: ReactNode | undefined;
}

export function SkipLink({ label = 'Skip to main content', className, href = '#main-content', ...anchorProps }: SkipLinkProps) {
  return (
    <a {...anchorProps} className={joinClassNames('a11y-skip-link', className)} href={href}>
      {label}
    </a>
  );
}

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
}

export function VisuallyHidden({ children, className, ...spanProps }: VisuallyHiddenProps) {
  return <span {...spanProps} className={joinClassNames('a11y-visually-hidden', className)}>{children}</span>;
}

