import { createElement, type ReactNode } from 'react';
import { FOUNDATION_STATE_SEMANTICS, type FoundationState } from './state-model.ts';
import type { FoundationCopy } from './locale.ts';

export interface RouteStateViewProps {
  readonly state: FoundationState;
  readonly copy: FoundationCopy;
  readonly children?: ReactNode;
  readonly onRetry?: () => void;
}

export function RouteStateView({ state, copy, children, onRetry }: RouteStateViewProps) {
  const message = copy.states[state];
  const semantics = FOUNDATION_STATE_SEMANTICS[state];
  const commonProps = {
    'data-state': state,
    'aria-live': semantics.live
  };

  if (state === 'success') {
    return createElement(
      'section',
      { ...commonProps, 'aria-label': message.title },
      children ?? createElement('p', null, message.body)
    );
  }

  if (state === 'retry') {
    return createElement(
      'div',
      { ...commonProps, role: semantics.role },
      createElement('h2', null, message.title),
      createElement('p', null, message.body),
      createElement('button', { type: 'button', onClick: onRetry, disabled: onRetry === undefined }, copy.retryLabel)
    );
  }

  if (state === 'loading') {
    return createElement(
      'p',
      { ...commonProps, role: semantics.role, 'aria-busy': 'true' },
      message.title,
      ': ',
      message.body
    );
  }

  if (state === 'empty') {
    return createElement('p', { ...commonProps, role: semantics.role }, message.title, ': ', message.body);
  }

  return createElement(
    'div',
    { ...commonProps, role: semantics.role },
    createElement('h2', null, message.title),
    createElement('p', null, message.body)
  );
}
