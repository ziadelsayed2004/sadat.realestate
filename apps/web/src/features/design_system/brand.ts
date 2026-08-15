import { createElement } from 'react';
import { resolveDesignAsset, type DesignAssetCatalog } from './assets.ts';

export interface BrandMarkProps {
  readonly label: string;
  readonly assets?: DesignAssetCatalog | undefined;
}

export function BrandMark({ label, assets }: BrandMarkProps) {
  const logoPath = resolveDesignAsset(assets, 'logo');
  const mark = logoPath === undefined
    ? label
    : createElement('img', { src: logoPath, alt: label, className: 'brand-image', decoding: 'async' });

  return createElement('a', { className: 'brand', href: '/', 'aria-label': label }, mark);
}
