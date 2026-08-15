export const DESIGN_TOKENS = Object.freeze({
  color: Object.freeze({
    pageBackground: '#f6f8fb',
    surface: '#ffffff',
    text: '#1f2937',
    textStrong: '#102f4e',
    textMuted: '#5f6f82',
    brand: '#163c62',
    brandInteractive: '#1d5d8f',
    brandSoft: '#e7eef6',
    accentText: '#234d73',
    border: '#dbe3ee',
    borderInfo: '#b8d2e9',
    borderCritical: '#e6b7b7',
    onBrand: '#ffffff',
    focus: '#1d5d8f'
  }),
  typography: Object.freeze({
    fontFamily: Object.freeze({
      sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }),
    fontSize: Object.freeze({
      body: '1rem',
      small: '0.875rem',
      displayMin: '2rem',
      displayPreferred: '5vw',
      displayMax: '3.5rem'
    }),
    lineHeight: Object.freeze({ body: '1.65', display: '1.1' }),
    weight: Object.freeze({ regular: '400', strong: '700' }),
    tracking: Object.freeze({ label: '0.04em' })
  }),
  spacing: Object.freeze({
    none: '0',
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '2.5xl': '2.5rem',
    '4xl': '4rem',
    '6xl': '6rem'
  }),
  radius: Object.freeze({ sm: '0.25rem', md: '0.4rem', lg: '0.75rem' }),
  shadow: Object.freeze({
    header: '0 1px 2px rgb(16 47 78 / 0.04)',
    state: '0 8px 24px rgb(16 47 78 / 0.06)'
  }),
  asset: Object.freeze({ logoMaxInlineSize: '12rem', logoMaxBlockSize: '2.5rem' })
} as const);

export const DESIGN_TOKEN_CSS_VARIABLES = Object.freeze({
  pageBackground: '--color-page-background',
  surface: '--color-surface',
  text: '--color-text',
  textStrong: '--color-text-strong',
  textMuted: '--color-text-muted',
  brand: '--color-brand',
  brandInteractive: '--color-brand-interactive',
  brandSoft: '--color-brand-soft',
  accentText: '--color-accent-text',
  border: '--color-border',
  borderInfo: '--color-border-info',
  borderCritical: '--color-border-critical',
  onBrand: '--color-on-brand',
  focus: '--color-focus',
  fontFamilySans: '--font-family-sans',
  fontSizeBody: '--font-size-body',
  fontSizeSmall: '--font-size-small',
  fontSizeDisplayMin: '--font-size-display-min',
  fontSizeDisplayPreferred: '--font-size-display-preferred',
  fontSizeDisplayMax: '--font-size-display-max',
  lineHeightBody: '--line-height-body',
  lineHeightDisplay: '--line-height-display',
  weightRegular: '--font-weight-regular',
  weightStrong: '--font-weight-strong',
  trackingLabel: '--letter-spacing-label',
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  radiusLg: '--radius-lg',
  shadowHeader: '--shadow-header',
  shadowState: '--shadow-state'
} as const);

export type DesignTokens = typeof DESIGN_TOKENS;
