export const UX_STATES = [
  'loading',
  'empty',
  'error',
  'retry',
  'success',
  'permission',
  'missing_image',
  'long_text'
] as const;

export type UxState = typeof UX_STATES[number];
export type UxStateRole = 'status' | 'alert' | 'region';

export interface UxStateSemantics {
  readonly role: UxStateRole;
  readonly live: 'polite' | 'assertive';
  readonly busy: boolean;
}

export const UX_STATE_SEMANTICS: Readonly<Record<UxState, UxStateSemantics>> = Object.freeze({
  loading: { role: 'status', live: 'polite', busy: true },
  empty: { role: 'status', live: 'polite', busy: false },
  error: { role: 'alert', live: 'assertive', busy: false },
  retry: { role: 'status', live: 'polite', busy: false },
  success: { role: 'region', live: 'polite', busy: false },
  permission: { role: 'alert', live: 'assertive', busy: false },
  missing_image: { role: 'status', live: 'polite', busy: false },
  long_text: { role: 'region', live: 'polite', busy: false }
});

const stateSet = new Set<string>(UX_STATES);

export function isUxState(value: unknown): value is UxState {
  return typeof value === 'string' && stateSet.has(value);
}

export function getUxStateSemantics(value: unknown): UxStateSemantics {
  if (!isUxState(value)) throw new RangeError('Unsupported UX state');
  return UX_STATE_SEMANTICS[value];
}
