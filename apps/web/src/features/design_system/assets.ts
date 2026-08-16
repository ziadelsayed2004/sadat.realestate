export const DESIGN_ASSET_SLOTS = ['logo', 'favicon'] as const;
export type DesignAssetSlot = (typeof DESIGN_ASSET_SLOTS)[number];

export type PublicAssetPath = string & { readonly __publicAssetPath: unique symbol };
export type DesignAssetCatalog = Partial<Record<DesignAssetSlot, string>>;

export const DEFAULT_DESIGN_ASSETS: Readonly<Record<DesignAssetSlot, string>> = Object.freeze({
  logo: '/assets/sadat-real-estate-logo.png',
  favicon: '/assets/sadat-real-estate-favicon.png'
});

const safeAssetSegment = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/u;

/**
 * Only server-provided, same-origin public paths are accepted here. Asset IDs
 * do not become URLs in the browser, and private or external URLs are never
 * inferred by the design system.
 */
export function isPublicAssetPath(value: unknown): value is PublicAssetPath {
  if (typeof value !== 'string' || !value.startsWith('/assets/')) return false;
  if (value.includes('\\') || value.includes('?') || value.includes('#')) return false;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }

  if (decoded !== value) return false;
  const segments = value.split('/');
  return segments.length >= 3
    && segments[0] === ''
    && segments[1] === 'assets'
    && segments.slice(2).every(segment => safeAssetSegment.test(segment));
}

export function resolveDesignAsset(catalog: DesignAssetCatalog | undefined, slot: DesignAssetSlot): PublicAssetPath | undefined {
  const candidate = catalog?.[slot];
  return isPublicAssetPath(candidate) ? candidate : undefined;
}
