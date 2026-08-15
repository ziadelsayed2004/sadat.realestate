export const FOUNDATION_STATES = ['loading', 'empty', 'error', 'retry', 'success', 'permission'] as const;
export type FoundationState = (typeof FOUNDATION_STATES)[number];

export const FOUNDATION_STATE_SEMANTICS = Object.freeze({
  loading: { role: 'status', live: 'polite' },
  empty: { role: 'status', live: 'polite' },
  error: { role: 'alert', live: 'assertive' },
  retry: { role: 'status', live: 'polite' },
  success: { role: 'region', live: 'polite' },
  permission: { role: 'alert', live: 'assertive' }
} as const satisfies Readonly<Record<FoundationState, { role: string; live: string }>>);
